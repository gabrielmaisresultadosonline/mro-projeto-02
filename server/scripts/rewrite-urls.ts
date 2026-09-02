/**
 * Etapa 4 — Reescrita de URLs salvas no banco.
 *
 * Milhares de registros (vídeos de aulas, thumbnails, criativos, fotos de
 * perfil) guardam a URL absoluta do storage antigo. Depois da migração, esses
 * links precisam apontar para o domínio próprio, senão o conteúdo continua
 * sendo servido pelo serviço que estamos desligando.
 *
 * Roda em modo simulação por padrão. Use `--apply` para gravar.
 */

import { pool } from "../src/db.js";
import { env, requireLegacy } from "../src/env.js";
import { log } from "./lib/log.js";
import { quoteIdent } from "../src/rest/identifiers.js";

interface TextColumn {
  table: string;
  column: string;
  type: string;
}

async function findTextColumns(): Promise<TextColumn[]> {
  const { rows } = await pool.query<TextColumn>(`
    SELECT c.table_name AS table, c.column_name AS column, c.data_type AS type
      FROM information_schema.columns c
      JOIN pg_class pc ON pc.relname = c.table_name
      JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = 'public'
     WHERE c.table_schema = 'public'
       AND pc.relkind = 'r'
       AND c.data_type IN ('text', 'character varying', 'jsonb', 'json')
       AND c.is_generated = 'NEVER'
     ORDER BY c.table_name, c.column_name
  `);
  return rows;
}

export async function rewriteUrls(apply: boolean): Promise<void> {
  log.step(`Etapa 4/5 — URLs de mídia ${apply ? "(aplicando)" : "(simulação)"}`);

  const legacy = requireLegacy();
  const legacyBase = `${legacy.url}/storage/v1/object/public/`;
  const newBase = `${env.publicUrl}/storage/v1/object/public/`;
  // Alguns registros vieram de projetos anteriores ao LEGACY_SUPABASE_URL
  // atual. O padrão cobre qualquer host histórico sem depender de DNS.
  const anyLegacyStoragePattern =
    "https?://[a-zA-Z0-9-]+\\.supabase\\.co/storage/v1/object/public/";

  if (legacyBase === newBase) {
    log.warn("URL antiga e nova são iguais; nada a reescrever.");
    return;
  }

  log.info(`De:   ${legacyBase}`);
  log.info(`Para: ${newBase}`);

  const columns = await findTextColumns();
  const changes: Record<string, unknown>[] = [];

  for (const column of columns) {
    const table = `public.${quoteIdent(column.table)}`;
    const field = quoteIdent(column.column);
    const asText = column.type === "jsonb" || column.type === "json" ? `${field}::text` : field;

    const { rows } = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM ${table} WHERE ${asText} ~ $1`,
      [anyLegacyStoragePattern],
    );
    const affected = Number(rows[0]?.count ?? 0);
    if (affected === 0) continue;

    changes.push({ tabela: column.table, coluna: column.column, registros: affected });

    if (apply) {
      // jsonb precisa voltar para o tipo original após a substituição textual.
      const expression =
        column.type === "jsonb"
          ? `regexp_replace(${field}::text, $1, $2, 'g')::jsonb`
          : column.type === "json"
            ? `regexp_replace(${field}::text, $1, $2, 'g')::json`
            : `regexp_replace(${field}, $1, $2, 'g')`;

      const result = await pool.query(
        `UPDATE ${table} SET ${field} = ${expression} WHERE ${asText} ~ $1`,
        [anyLegacyStoragePattern, newBase],
      );
      log.ok(`${column.table}.${column.column}: ${result.rowCount} registros atualizados.`);
    }
  }

  if (changes.length === 0) {
    log.ok("Nenhuma URL antiga encontrada no banco.");
    return;
  }

  log.table(changes);
  if (!apply) {
    log.warn("Simulação: rode com `--apply` para gravar as alterações.");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  rewriteUrls(process.argv.includes("--apply"))
    .then(() => pool.end())
    .catch((error: Error) => {
      log.error(error.message);
      process.exit(1);
    });
}
