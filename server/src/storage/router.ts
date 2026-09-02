/**
 * Storage local (arquivos na hospedagem, sem depender de serviço externo).
 *
 * Layout em disco:
 *   {STORAGE_ROOT}/{bucket}/{caminho...}
 *
 * Mantemos exatamente os mesmos caminhos usados hoje, então as URLs públicas
 * já gravadas no banco continuam resolvendo depois do rewrite de domínio.
 * Metadados de bucket/objeto ficam no Postgres (tabelas `storage_*`), o que
 * permite listar, assinar e aplicar permissão sem varrer o filesystem.
 */

import { Router, type Request } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import crypto from "node:crypto";
import mime from "mime-types";
import { env } from "../env.js";
import { adminQuery } from "../db.js";
import { resolveAuth, isServiceRole } from "../auth-context.js";
import { RestError } from "../rest/identifiers.js";
import { hasValidAdminSession } from "../admin-session.js";

export const storageRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.storage.maxFileSizeBytes },
});

/**
 * Impede path traversal. Um `../` aceito aqui daria leitura/escrita arbitrária
 * no servidor — é o ponto mais sensível de todo o storage.
 */
function safeJoin(bucket: string, objectPath: string): string {
  // Buckets do Supabase podem conter ponto (ex.: `user.avatars`). Recusamos
  // apenas o que permitiria traversal (`..`) ou separadores de caminho.
  if (!/^[a-zA-Z0-9._-]+$/.test(bucket) || bucket.includes("..")) {
    throw new RestError(400, `Nome de bucket inválido: ${bucket}`);
  }

  const normalized = path
    .normalize(objectPath)
    .replace(/^(\.\.(\/|\\|$))+/, "")
    .replace(/^[/\\]+/, "");

  const bucketRoot = path.join(env.storage.root, bucket);
  const absolute = path.join(bucketRoot, normalized);

  if (!absolute.startsWith(bucketRoot + path.sep) && absolute !== bucketRoot) {
    throw new RestError(400, "Caminho de objeto inválido.");
  }
  return absolute;
}

function objectPathFromRequest(req: Request): string {
  // Express coloca o wildcard em params[0] para rotas com `*`.
  const wildcard = (req.params as Record<string, string>)[0] ?? "";
  return decodeURIComponent(wildcard);
}

async function isPublicBucket(bucket: string): Promise<boolean> {
  const rows = await adminQuery<{ public: boolean }>(
    "SELECT public FROM storage_buckets WHERE id = $1",
    [bucket],
  );
  return rows[0]?.public === true;
}

/**
 * Leitura pelo caminho `/object/public/...`. Um bucket sem registro de
 * metadado (não migrado) não deve bloquear a leitura — só a escrita.
 */
async function isReadablePublicBucket(bucket: string): Promise<boolean> {
  const rows = await adminQuery<{ public: boolean }>(
    "SELECT public FROM storage_buckets WHERE id = $1",
    [bucket],
  );
  if (rows.length === 0) return true;
  return rows[0]?.public === true;
}

function canManageStorage(req: Request): boolean {
  return isServiceRole(resolveAuth(req)) || hasValidAdminSession(req);
}

/**
 * Arquivos de configuração publicados pelo painel (avisos, módulos, etc.).
 * No backend anterior eles eram lidos por qualquer visitante — o popup de
 * avisos roda antes de existir sessão. Liberamos SOMENTE leitura, e apenas
 * para os JSONs dentro de `admin/`.
 */
function isPublicConfigObject(bucket: string, name: string): boolean {
  return bucket === "user-data" && /^admin\/[^/]+\.json$/i.test(name);
}





async function recordObject(params: {
  bucket: string;
  name: string;
  size: number;
  contentType: string;
  owner: string | null;
}): Promise<void> {
  await adminQuery(
    `INSERT INTO storage_objects (bucket_id, name, size, content_type, owner, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (bucket_id, name)
     DO UPDATE SET size = EXCLUDED.size,
                   content_type = EXCLUDED.content_type,
                   updated_at = now()`,
    [params.bucket, params.name, params.size, params.contentType, params.owner],
  );
}

/** Upload/atualização — `upsert: true` do SDK vira PUT ou o header `x-upsert`. */
const handleObjectUpload = async (req: Request, res: import("express").Response) => {
  const bucket = req.params.bucket;
  const name = objectPathFromRequest(req);
  const auth = resolveAuth(req);

  if (auth.role === "anon" && !canManageStorage(req) && !(await isPublicBucket(bucket))) {
    throw new RestError(403, "Upload exige uma sessão administrativa válida.");
  }

  const absolute = safeJoin(bucket, name);
  const upsert = (req.header("x-upsert") ?? "false").toLowerCase() === "true";

  const exists = await fs
    .access(absolute)
    .then(() => true)
    .catch(() => false);

  if (exists && !upsert) {
    res.status(409).json({
      statusCode: "409",
      error: "Duplicate",
      message: "The resource already exists",
    });
    return;
  }

  const body = req.file?.buffer ?? (Buffer.isBuffer(req.body) ? req.body : null);
  if (!body) {
    throw new RestError(400, "Corpo do upload vazio.");
  }

  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, body);

  const detectedMime = mime.lookup(name);
  const contentType =
    req.file?.mimetype ??
    req.header("content-type") ??
    (typeof detectedMime === "string" ? detectedMime : undefined) ??
    "application/octet-stream";

  await recordObject({
    bucket,
    name,
    size: body.byteLength,
    contentType,
    owner: auth.userId,
  });

  res.status(200).json({ Key: `${bucket}/${name}`, Id: crypto.randomUUID() });
};

/** Download público — servido também pelo Nginx, esta rota é o fallback. */
storageRouter.get("/object/public/:bucket/*", async (req, res) => {
  const bucket = req.params.bucket;
  const name = objectPathFromRequest(req);

  if (!(await isReadablePublicBucket(bucket))) {
    throw new RestError(400, "Bucket não é público.");
  }
  await streamFile(bucket, name, req, res);
});

/** Download autenticado. */
storageRouter.get("/object/authenticated/:bucket/*", async (req, res) => {
  const auth = resolveAuth(req);
  if (auth.role === "anon") {
    throw new RestError(401, "Autenticação necessária.");
  }
  await streamFile(req.params.bucket, objectPathFromRequest(req), req, res);
});

/**
 * Busca o objeto nas origens remotas configuradas quando ele não existe no
 * disco. Sem isso, qualquer mídia que não veio na migração fica quebrada.
 * O primeiro acesso grava o arquivo localmente (self-healing).
 */
async function fetchFromFallback(
  bucket: string,
  name: string,
  absolute: string,
): Promise<boolean> {
  for (const origin of env.storage.fallbackOrigins) {
    const remote = `${origin}/storage/v1/object/public/${bucket}/${name
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;
    try {
      const response = await fetch(remote);
      if (!response.ok || !response.body) continue;

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength === 0) continue;

      if (env.storage.cacheFallback) {
        await fs.mkdir(path.dirname(absolute), { recursive: true });
        await fs.writeFile(absolute, buffer);
        await recordObject({
          bucket,
          name,
          size: buffer.byteLength,
          contentType:
            response.headers.get("content-type") ??
            (mime.lookup(name) || "application/octet-stream"),
          owner: null,
        }).catch(() => undefined);
      }
      return true;
    } catch {
      // Origem indisponível: tenta a próxima.
    }
  }
  return false;
}

async function streamFile(
  bucket: string,
  name: string,
  req: Request,
  res: import("express").Response,
) {
  const absolute = safeJoin(bucket, name);
  let stat = await fs.stat(absolute).catch(() => null);

  if (!stat || !stat.isFile()) {
    const recovered = await fetchFromFallback(bucket, name, absolute);
    stat = recovered ? await fs.stat(absolute).catch(() => null) : null;
  }

  if (!stat || !stat.isFile()) {
    res.status(404).json({
      statusCode: "404",
      error: "not_found",
      message: "Object not found",
    });
    return;
  }

  const contentType = mime.lookup(absolute) || "application/octet-stream";
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "public, max-age=3600");
  // Obrigatório para <video>/<audio>: sem Range o player não busca nem
  // carrega em vários navegadores (Safari/iOS exige 206).
  res.setHeader("Accept-Ranges", "bytes");

  const range = req.header("range");
  const match = range ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null;

  if (match) {
    const size = stat.size;
    const startRaw = match[1];
    const endRaw = match[2];

    let start = startRaw === "" ? NaN : Number(startRaw);
    let end = endRaw === "" ? NaN : Number(endRaw);

    if (Number.isNaN(start) && !Number.isNaN(end)) {
      // Sufixo: bytes=-500 (últimos 500 bytes).
      start = Math.max(size - end, 0);
      end = size - 1;
    } else if (!Number.isNaN(start) && Number.isNaN(end)) {
      end = size - 1;
    }

    if (Number.isNaN(start) || start >= size || start > end) {
      res.status(416).setHeader("Content-Range", `bytes */${size}`);
      res.end();
      return;
    }
    end = Math.min(end, size - 1);

    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
    res.setHeader("Content-Length", String(end - start + 1));
    createReadStream(absolute, { start, end }).pipe(res);
    return;
  }

  res.setHeader("Content-Length", String(stat.size));
  createReadStream(absolute).pipe(res);
}


/** URL assinada com HMAC e expiração — equivalente ao createSignedUrl. */
storageRouter.post("/object/sign/:bucket/*", async (req, res) => {
  const auth = resolveAuth(req);
  if (auth.role === "anon" && !canManageStorage(req)) {
    throw new RestError(401, "Autenticação necessária.");
  }
  const bucket = req.params.bucket;
  const name = objectPathFromRequest(req);
  const expiresIn = Number(req.body?.expiresIn ?? 3600);
  const expiresAt = Math.floor(Date.now() / 1000) + (Number.isFinite(expiresIn) ? expiresIn : 3600);

  const signature = crypto
    .createHmac("sha256", env.auth.jwtSecret)
    .update(`${bucket}/${name}:${expiresAt}`)
    .digest("hex");

  res.json({
    signedURL: `/storage/v1/object/signed/${bucket}/${name}?token=${signature}&exp=${expiresAt}`,
  });
});

storageRouter.get("/object/signed/:bucket/*", async (req, res) => {
  const bucket = req.params.bucket;
  const name = objectPathFromRequest(req);
  const token = String(req.query.token ?? "");
  const exp = Number(req.query.exp ?? 0);

  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    throw new RestError(400, "URL assinada expirada.");
  }

  const expected = crypto
    .createHmac("sha256", env.auth.jwtSecret)
    .update(`${bucket}/${name}:${exp}`)
    .digest("hex");

  const provided = Buffer.from(token);
  const valid =
    provided.length === expected.length &&
    crypto.timingSafeEqual(provided, Buffer.from(expected));

  if (!valid) {
    throw new RestError(403, "Assinatura inválida.");
  }
  await streamFile(bucket, name, req, res);
});

// Precisa vir depois de `/public`, `/authenticated` e `/signed`, pois é
// deliberadamente a rota de leitura mais abrangente.
storageRouter.get("/object/:bucket/*", async (req, res) => {
  const bucket = req.params.bucket;
  const name = objectPathFromRequest(req);
  const auth = resolveAuth(req);

  if (auth.role === "anon" && !canManageStorage(req) && !(await isPublicBucket(bucket))) {
    throw new RestError(401, "Autenticação necessária.");
  }
  await streamFile(bucket, name, req, res);
});

/** Listagem de objetos (usada pelo painel admin e pelo dump). */
storageRouter.post("/object/list/:bucket", async (req, res) => {
  const bucket = req.params.bucket;
  const auth = resolveAuth(req);
  if (auth.role === "anon" && !canManageStorage(req) && !(await isPublicBucket(bucket))) {
    throw new RestError(403, "Listagem não autorizada neste bucket.");
  }
  const prefix = String(req.body?.prefix ?? "");
  const limit = Math.min(Number(req.body?.limit ?? 100), 10_000);
  const offset = Number(req.body?.offset ?? 0);

  const rows = await adminQuery(
    `SELECT name, size, content_type, created_at, updated_at
       FROM storage_objects
      WHERE bucket_id = $1 AND name LIKE $2
      ORDER BY name
      LIMIT $3 OFFSET $4`,
    [bucket, `${prefix}%`, limit, offset],
  );

  res.json(rows);
});

// As rotas específicas acima precisam ser registradas antes deste wildcard.
storageRouter.post("/object/:bucket/*", upload.single("file"), handleObjectUpload);

// O SDK usa PUT quando `upsert: true`.
storageRouter.put("/object/:bucket/*", upload.single("file"), async (req, res) => {
  req.headers["x-upsert"] = "true";
  await handleObjectUpload(req, res);
});

storageRouter.delete("/object/:bucket/*", async (req, res) => {
  const auth = resolveAuth(req);
  if (auth.role === "anon" && !canManageStorage(req)) {
    throw new RestError(401, "Autenticação necessária.");
  }

  const bucket = req.params.bucket;
  const names: string[] = Array.isArray(req.body?.prefixes)
    ? req.body.prefixes
    : [objectPathFromRequest(req)];

  for (const name of names) {
    if (!name) continue;
    await fs.rm(safeJoin(bucket, name), { force: true });
    await adminQuery("DELETE FROM storage_objects WHERE bucket_id = $1 AND name = $2", [
      bucket,
      name,
    ]);
  }

  res.json({ message: "Successfully deleted" });
});

/** Gestão de buckets — restrita a service_role, como no comportamento atual. */
storageRouter.post("/bucket", async (req, res) => {
  const auth = resolveAuth(req);
  if (!isServiceRole(auth)) {
    throw new RestError(403, "Apenas service_role pode criar buckets.");
  }

  const id = String(req.body?.id ?? req.body?.name ?? "");
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new RestError(400, "Nome de bucket inválido.");
  }

  await adminQuery(
    `INSERT INTO storage_buckets (id, name, public)
     VALUES ($1, $1, $2)
     ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public`,
    [id, req.body?.public === true],
  );
  await fs.mkdir(path.join(env.storage.root, id), { recursive: true });

  res.json({ name: id });
});

storageRouter.get("/bucket", async (_req, res) => {
  res.json(await adminQuery("SELECT id, name, public, created_at FROM storage_buckets ORDER BY id"));
});
