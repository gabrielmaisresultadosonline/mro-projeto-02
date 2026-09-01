/**
 * Entrypoint do backend próprio na VPS.
 *
 * Expõe a mesma superfície que o app consome hoje:
 *   /rest/v1/*       → PostgreSQL local, sob RLS
 *   /auth/v1/*       → JWT próprio
 *   /storage/v1/*    → arquivos no disco da hospedagem
 *   /functions/v1/*  → funções (runtime Deno local)
 *   /realtime/v1     → WebSocket sobre LISTEN/NOTIFY
 */

// Encaminha rejeições de handlers async ao middleware de erro do Express 4.
// Sem este patch, um timeout de função encerra a conexão e vira 502 sem CORS.
import "express-async-errors";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import http from "node:http";
import { env } from "./env.js";
import { healthCheck } from "./db.js";
import { restRouter } from "./rest/router.js";
import { authRouter } from "./auth/router.js";
import { storageRouter } from "./storage/router.js";
import { functionsRouter, functionsRuntime, functionsStatus, listAvailableFunctions, shutdownFunctions } from "./functions/host.js";
import { attachRealtime, realtimeStatus } from "./realtime.js";
import { RestError } from "./rest/identifiers.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", true);

app.use(
  cors({
    origin: env.corsOrigins.includes("*") ? true : env.corsOrigins,
    credentials: true,
    exposedHeaders: ["Content-Range", "X-Total-Count"],
    allowedHeaders: [
      "authorization",
      "apikey",
      "content-type",
      "prefer",
      "range",
      "x-client-info",
      "x-upsert",
      "x-internal-call",
      "accept-profile",
      "content-profile",
    ],
  }),
);

// Webhooks precisam do corpo bruto para validar assinatura (Meta/Stripe/InfiniPay).
app.use("/functions/v1", express.raw({ type: "*/*", limit: "50mb" }));
// Upload binário direto (SDK de storage envia o arquivo no corpo).
app.use("/storage/v1", express.raw({ type: ["application/octet-stream", "video/*", "image/*", "audio/*"], limit: "300mb" }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.get("/health", async (_req, res) => {
  const db = await healthCheck().catch((error: Error) => ({ ok: false, error: error.message }));
  res.status(db.ok ? 200 : 503).json({
    ok: db.ok,
    database: db,
    functions: {
      available: listAvailableFunctions().length,
      running: functionsStatus(),
      runtime: functionsRuntime(),
    },
    realtime: realtimeStatus(),
    uptimeSeconds: Math.round(process.uptime()),
    version: process.env.APP_VERSION ?? "dev",
  });
});

app.use("/rest/v1", asyncRouter(restRouter));
app.use("/auth/v1", asyncRouter(authRouter));
app.use("/storage/v1", asyncRouter(storageRouter));
app.use("/functions/v1", asyncRouter(functionsRouter));

app.use((_req, res) => {
  res.status(404).json({ message: "Rota não encontrada." });
});

// Handler de erro no formato que o SDK entende (message/code/details/hint).
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof RestError) {
    res.status(error.status).json({
      message: error.message,
      details: error.details ?? null,
      hint: null,
      code: error.code ?? String(error.status),
    });
    return;
  }

  const pgError = error as { message?: string; code?: string; detail?: string; hint?: string };
  const isPgError = typeof pgError?.code === "string" && /^[0-9A-Z]{5}$/.test(pgError.code);

  if (isPgError) {
    // Erros de permissão de RLS devem virar 403, não 500.
    const status = pgError.code === "42501" ? 403 : 400;
    console.error("[api] erro do Postgres:", pgError.code, pgError.message);
    res.status(status).json({
      message: pgError.message ?? "Erro no banco de dados.",
      details: pgError.detail ?? null,
      hint: pgError.hint ?? null,
      code: pgError.code,
    });
    return;
  }

  console.error("[api] erro não tratado:", error);
  res.status(500).json({
    message: "Erro interno do servidor.",
    details: null,
    hint: null,
    code: "500",
  });
});

/** Encaminha rejeições de handlers async para o middleware de erro. */
function asyncRouter(router: express.Router): express.Router {
  const wrapper = express.Router();
  wrapper.use((req, res, next) => {
    Promise.resolve(router(req, res, next)).catch(next);
  });
  return wrapper;
}

const server = http.createServer(app);
attachRealtime(server);

server.listen(env.port, () => {
  console.log(`[api] backend no ar em http://127.0.0.1:${env.port}`);
  console.log(`[api] funções disponíveis: ${listAvailableFunctions().length}`);
  console.log(`[api] storage em ${env.storage.root}`);
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    console.log(`[api] recebido ${signal}, encerrando com graça...`);
    shutdownFunctions();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 10_000);
  });
}
