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
  if (!/^[a-zA-Z0-9_-]+$/.test(bucket)) {
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
  // Bucket sem registro (metadado não migrado) não deve bloquear leitura
  // pública: o caminho `/object/public/...` já é público por definição.
  if (rows.length === 0) return true;
  return rows[0]?.public === true;
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

/** Upload/atualização — `upsert: true` do SDK vira o header `x-upsert`. */
storageRouter.post("/object/:bucket/*", upload.single("file"), async (req, res) => {
  const bucket = req.params.bucket;
  const name = objectPathFromRequest(req);
  const auth = resolveAuth(req);

  if (auth.role === "anon" && !(await isPublicBucket(bucket))) {
    throw new RestError(403, "Upload não autorizado neste bucket.");
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

  const contentType =
    req.file?.mimetype ??
    req.header("content-type") ??
    mime.lookup(name) ??
    "application/octet-stream";

  await recordObject({
    bucket,
    name,
    size: body.byteLength,
    contentType,
    owner: auth.userId,
  });

  res.status(200).json({ Key: `${bucket}/${name}`, Id: crypto.randomUUID() });
});

// O SDK usa PUT quando `upsert: true`.
storageRouter.put("/object/:bucket/*", upload.single("file"), (req, res, next) => {
  req.headers["x-upsert"] = "true";
  storageRouter.handle({ ...req, method: "POST" } as Request, res, next);
});

/** Download público — servido também pelo Nginx, esta rota é o fallback. */
storageRouter.get("/object/public/:bucket/*", async (req, res) => {
  const bucket = req.params.bucket;
  const name = objectPathFromRequest(req);

  if (!(await isPublicBucket(bucket))) {
    throw new RestError(400, "Bucket não é público.");
  }
  await streamFile(bucket, name, res);
});

/** Download autenticado. */
storageRouter.get("/object/authenticated/:bucket/*", async (req, res) => {
  const auth = resolveAuth(req);
  if (auth.role === "anon") {
    throw new RestError(401, "Autenticação necessária.");
  }
  await streamFile(req.params.bucket, objectPathFromRequest(req), res);
});

storageRouter.get("/object/:bucket/*", async (req, res) => {
  const bucket = req.params.bucket;
  const name = objectPathFromRequest(req);
  const auth = resolveAuth(req);

  if (auth.role === "anon" && !(await isPublicBucket(bucket))) {
    throw new RestError(401, "Autenticação necessária.");
  }
  await streamFile(bucket, name, res);
});

async function streamFile(bucket: string, name: string, res: import("express").Response) {
  const absolute = safeJoin(bucket, name);
  const stat = await fs.stat(absolute).catch(() => null);

  if (!stat || !stat.isFile()) {
    res.status(404).json({
      statusCode: "404",
      error: "not_found",
      message: "Object not found",
    });
    return;
  }

  res.setHeader("Content-Type", mime.lookup(absolute) || "application/octet-stream");
  res.setHeader("Content-Length", String(stat.size));
  res.setHeader("Cache-Control", "public, max-age=3600");
  createReadStream(absolute).pipe(res);
}

/** URL assinada com HMAC e expiração — equivalente ao createSignedUrl. */
storageRouter.post("/object/sign/:bucket/*", async (req, res) => {
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
  await streamFile(bucket, name, res);
});

/** Listagem de objetos (usada pelo painel admin e pelo dump). */
storageRouter.post("/object/list/:bucket", async (req, res) => {
  const bucket = req.params.bucket;
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

storageRouter.delete("/object/:bucket/*", async (req, res) => {
  const auth = resolveAuth(req);
  if (auth.role === "anon") {
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
