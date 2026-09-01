/**
 * Migração completa, em ordem de dependência, com registro de cada etapa.
 *
 * A ordem não é negociável: estrutura antes de dados, dados antes de URLs
 * (a reescrita de links roda sobre as linhas já importadas), e conferência
 * sempre por último.
 *
 * Uso:
 *   npm run migrate:all                # tudo, com reescrita de URLs simulada
 *   npm run migrate:all -- --apply-urls  # tudo, gravando as URLs novas
 *   npm run migrate:all -- --skip-storage
 */

import dns from "node:dns/promises";
import { pool } from "../src/db.js";
import { requireLegacy } from "../src/env.js";
import { migrateSchema } from "./migrate-schema.js";
import { migrateData } from "./migrate-data.js";
import { migrateUsers } from "./migrate-users.js";
import { migrateStorage } from "./migrate-storage.js";
import { rewriteUrls } from "./rewrite-urls.js";
import { verify } from "./verify.js";
import { log } from "./lib/log.js";

/**
 * A origem legada pode simplesmente não existir mais (projeto Supabase
 * removido/trocado). Nesse caso não há o que sincronizar: o banco local já é a
 * fonte da verdade e o corte deve seguir em frente, sem tentar pg_dump.
 */
async function legacyReachable(): Promise<boolean> {
  const { databaseUrl } = requireLegacy();
  if (!databaseUrl) return false;
  let host: string;
  try {
    host = new URL(databaseUrl).hostname;
  } catch {
    return false;
  }
  try {
    // Aceita IPv4 ou IPv6 (o host direto do Supabase costuma ser só IPv6).
    await dns.lookup(host, { all: true, verbatim: true });
    return true;
  } catch {
    return false;
  }
}


interface Step {
  name: string;
  run: () => Promise<unknown>;
  skip?: boolean;
}

async function record(step: string, status: string, details: unknown): Promise<void> {
  await pool
    .query(
      `INSERT INTO public.migration_runs (step, status, details, finished_at)
       VALUES ($1, $2, $3::jsonb, now())`,
      [step, status, JSON.stringify(details ?? {})],
    )
    .catch(() => undefined); // a tabela só existe após o bootstrap
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const applyUrls = args.includes("--apply-urls");
  // --only-storage: baixa apenas vídeos/áudios/imagens dos buckets.
  const onlyStorage = args.includes("--only-storage");
  const startedAt = Date.now();

  console.log("\n\x1b[1m═══ Migração para PostgreSQL próprio (VPS) ═══\x1b[0m");

  const steps: Step[] = [
    { name: "schema", run: () => migrateSchema(), skip: onlyStorage },
    { name: "users", run: () => migrateUsers(), skip: onlyStorage || args.includes("--skip-data") },
    { name: "data", run: () => migrateData(), skip: onlyStorage || args.includes("--skip-data") },
    { name: "storage", run: () => migrateStorage(), skip: args.includes("--skip-storage") },
    { name: "urls", run: () => rewriteUrls(applyUrls), skip: onlyStorage },
    {
      name: "verify",
      run: async () => {
        const clean = await verify();
        if (!clean && applyUrls) {
          throw new Error("A conferência final encontrou divergências; as URLs não podem ser cortadas com dados pendentes.");
        }
        if (!clean) {
          log.warn("A origem recebeu alterações durante a sincronização. Rode novamente antes do corte final.");
        }
      },
      skip: onlyStorage,
    },
  ];

  const failedSteps: string[] = [];

  for (const step of steps) {
    if (step.skip) {
      log.warn(`Etapa "${step.name}" ignorada por parâmetro.`);
      continue;
    }
    try {
      await step.run();
      await record(step.name, "ok", {});
    } catch (error) {
      const message = (error as Error).message;
      await record(step.name, "erro", { message });
      log.error(`Etapa "${step.name}" falhou: ${message}`);
      failedSteps.push(step.name);
      // Estrutura é pré-requisito de tudo; sem ela não faz sentido continuar.
      if (step.name === "schema" || (applyUrls && ["users", "data", "storage"].includes(step.name))) {
        await pool.end();
        throw new Error(`Etapa obrigatória "${step.name}" falhou. Nenhuma URL foi alterada.`);
      }
    }
  }

  const minutes = ((Date.now() - startedAt) / 60000).toFixed(1);
  log.step(`Concluído em ${minutes} min`);

  if (!applyUrls) {
    log.warn("As URLs de mídia foram apenas simuladas. Rode com `--apply-urls` no corte final.");
  }

  await pool.end();
  if (failedSteps.length > 0) {
    throw new Error(`Migração incompleta nas etapas: ${failedSteps.join(", ")}. O corte não foi autorizado.`);
  }
}

main().catch((error: Error) => {
  log.error(error.message);
  process.exit(1);
});
