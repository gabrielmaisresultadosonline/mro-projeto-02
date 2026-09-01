/**
 * Host das 162 funções, sem reescrever nenhuma delas.
 *
 * Decisão de arquitetura: as funções são código Deno com imports por URL
 * (`https://deno.land/...`, `https://esm.sh/...`). Reescrevê-las para Node
 * significaria mexer em 162 arquivos e reintroduzir bugs em fluxos críticos
 * de pagamento. Em vez disso, instalamos o Deno na VPS e cada função roda em
 * seu próprio processo, iniciado sob demanda, com o Express fazendo o proxy.
 *
 * O único ajuste necessário é forçar a porta de escuta: as funções chamam
 * `serve(handler)` sem porta. O wrapper (`runner.ts`) intercepta `Deno.listen`
 * e `Deno.serve` para fixar a porta atribuída, antes de importar a função.
 */

import { Router } from "express";
import { spawn, type ChildProcess } from "node:child_process";
import { accessSync, constants } from "node:fs";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { env } from "../env.js";
import { RestError } from "../rest/identifiers.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const functionsDir = path.resolve(here, "../../", env.functions.dir);
const runnerPath = path.resolve(here, "runner.ts");

interface RunningFunction {
  name: string;
  port: number;
  process: ChildProcess;
  ready: Promise<void>;
  startedAt: number;
}

const running = new Map<string, RunningFunction>();
let nextPort = env.functions.basePort;

/**
 * Resolve o Deno uma vez por inicialização. O deploy pode instalá-lo em
 * /usr/local/bin ou no diretório do usuário; não dependemos do PATH reduzido
 * que o PM2 normalmente fornece.
 */
function resolveDenoBin(): string {
  const candidates = [
    env.functions.denoBin,
    "/usr/local/bin/deno",
    process.env.HOME ? path.join(process.env.HOME, ".deno/bin/deno") : "",
    "deno",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate === "deno") return candidate;
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Tenta o próximo local conhecido.
    }
  }
  return env.functions.denoBin;
}

const denoBin = resolveDenoBin();

function isValidFunctionName(name: string): boolean {
  return /^[a-z0-9][a-z0-9-_]*$/i.test(name) && !name.startsWith("_");
}

function functionEntrypoint(name: string): string | null {
  const entry = path.join(functionsDir, name, "index.ts");
  return fs.existsSync(entry) ? entry : null;
}

async function waitForPort(port: number, timeoutMs = 25_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`, {
        method: "OPTIONS",
        signal: AbortSignal.timeout(1500),
      });
      // Qualquer resposta HTTP significa que o servidor subiu.
      if (response) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw new Error(`Função não respondeu na porta ${port} dentro do tempo limite.`);
}

function startFunction(name: string, entry: string): RunningFunction {
  const port = nextPort;
  nextPort += 1;

  const child = spawn(
    denoBin,
    ["run", "--allow-all", "--no-prompt", runnerPath, entry],
    {
      env: {
        ...process.env,
        // As funções originais usam estes nomes. No backend próprio eles devem
        // sempre apontar para a VPS, mesmo se server/.env ainda tiver aliases
        // antigos ou vazios da origem legada.
        SUPABASE_URL: env.publicUrl,
        SUPABASE_ANON_KEY: env.auth.anonKey,
        SUPABASE_SERVICE_ROLE_KEY: env.auth.serviceRoleKey,
        FN_PORT: String(port),
        FN_NAME: name,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  child.stdout?.on("data", (chunk) => {
    process.stdout.write(`[fn:${name}] ${chunk}`);
  });
  child.stderr?.on("data", (chunk) => {
    process.stderr.write(`[fn:${name}:err] ${chunk}`);
  });
  child.on("error", (error) => {
    console.error(`[fn:${name}] não foi possível iniciar ${denoBin}:`, error.message);
    running.delete(name);
  });
  child.on("exit", (code) => {
    console.warn(`[fn:${name}] processo encerrado (código ${code}); será reiniciado na próxima chamada.`);
    running.delete(name);
  });

  const entryRecord: RunningFunction = {
    name,
    port,
    process: child,
    ready: waitForPort(port),
    startedAt: Date.now(),
  };

  running.set(name, entryRecord);
  return entryRecord;
}

async function ensureFunction(name: string): Promise<RunningFunction> {
  const existing = running.get(name);
  if (existing) {
    await existing.ready;
    return existing;
  }

  const entry = functionEntrypoint(name);
  if (!entry) {
    throw new RestError(404, `Função não encontrada: ${name}`);
  }

  const started = startFunction(name, entry);
  try {
    await started.ready;
  } catch (error) {
    started.process.kill("SIGKILL");
    running.delete(name);
    throw new RestError(502, `Falha ao iniciar a função ${name}: ${(error as Error).message}`);
  }
  return started;
}

export const functionsRouter = Router();

functionsRouter.all("/:name", async (req, res) => {
  const name = req.params.name;

  if (!env.functions.enabled) {
    throw new RestError(503, "Host de funções desabilitado.");
  }
  if (!isValidFunctionName(name)) {
    throw new RestError(400, "Nome de função inválido.");
  }

  const target = await ensureFunction(name);

  // Repassamos corpo e headers sem alterar: as funções validam assinatura de
  // webhook (Meta, Stripe, InfiniPay) sobre o payload bruto.
  const body =
    req.method === "GET" || req.method === "HEAD"
      ? undefined
      : Buffer.isBuffer(req.body)
        ? req.body
        : typeof req.body === "string"
          ? req.body
          : JSON.stringify(req.body ?? {});

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(","));
  }
  headers.delete("host");
  headers.delete("content-length");

  const upstream = await fetch(`http://127.0.0.1:${target.port}${req.originalUrl.replace(/^\/functions\/v1/, "")}`, {
    method: req.method,
    headers,
    body,
    signal: AbortSignal.timeout(env.functions.timeoutMs),
  }).catch((error: Error) => {
    throw new RestError(504, `Função ${name} não respondeu: ${error.message}`);
  });

  res.status(upstream.status);
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() === "content-encoding") return;
    res.setHeader(key, value);
  });

  const payload = Buffer.from(await upstream.arrayBuffer());
  res.end(payload);
});

/** Diagnóstico: quais funções estão no ar e há quanto tempo. */
export function functionsStatus() {
  return [...running.values()].map((fn) => ({
    name: fn.name,
    port: fn.port,
    uptimeSeconds: Math.round((Date.now() - fn.startedAt) / 1000),
    pid: fn.process.pid ?? null,
  }));
}

export function listAvailableFunctions(): string[] {
  if (!fs.existsSync(functionsDir)) return [];
  return fs
    .readdirSync(functionsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .filter((entry) => functionEntrypoint(entry.name) !== null)
    .map((entry) => entry.name)
    .sort();
}

export function functionsRuntime(): { denoBin: string; available: boolean } {
  if (denoBin === "deno") {
    return { denoBin, available: true };
  }
  try {
    accessSync(denoBin, constants.X_OK);
    return { denoBin, available: true };
  } catch {
    return { denoBin, available: false };
  }
}

export function shutdownFunctions(): void {
  for (const fn of running.values()) {
    fn.process.kill("SIGTERM");
  }
  running.clear();
}
