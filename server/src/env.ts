/**
 * Configuração central do backend próprio (VPS).
 *
 * Todas as variáveis vêm do arquivo `.env` do servidor (nunca do frontend).
 * Falhamos cedo e de forma explícita quando algo obrigatório está ausente,
 * porque um backend que sobe "meio configurado" gera bugs silenciosos em
 * produção — muito mais caros de diagnosticar.
 */

// Precisa ser o primeiro efeito colateral: popula process.env a partir do .env
// (o PM2 não faz isso por conta própria).
import "./load-env.js";

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `[env] Variável obrigatória ausente: ${name}. Configure em server/.env`,
    );
  }
  return value.trim();
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : fallback;
}

function toInt(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  /** Porta HTTP interna. O Nginx faz o proxy para cá. */
  port: toInt(optional("PORT", "8787"), 8787),

  nodeEnv: optional("NODE_ENV", "production"),

  /** Origem pública da API, usada para montar URLs de storage. */
  publicUrl: optional("PUBLIC_API_URL", "https://api.maisresultadosonline.com.br"),

  /** Origens permitidas no CORS. `*` libera todas (padrão do app atual). */
  corsOrigins: optional("CORS_ORIGINS", "*")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),

  database: {
    /** Ex.: postgres://mro:senha@127.0.0.1:5432/mro */
    url: required("DATABASE_URL"),
    /** Conexões máximas no pool. Ajuste conforme a CPU da VPS. */
    poolMax: toInt(optional("DATABASE_POOL_MAX", "20"), 20),
    statementTimeoutMs: toInt(optional("DATABASE_STATEMENT_TIMEOUT_MS", "20000"), 20000),
  },

  auth: {
    /**
     * Segredo HS256 dos JWTs. Precisa ter no mínimo 32 caracteres.
     * Mantemos o mesmo formato de claims do Supabase para que o frontend
     * e as 162 funções continuem funcionando sem alteração.
     */
    jwtSecret: required("JWT_SECRET"),
    accessTokenTtlSeconds: toInt(optional("ACCESS_TOKEN_TTL", "3600"), 3600),
    refreshTokenTtlSeconds: toInt(optional("REFRESH_TOKEN_TTL", "2592000"), 2592000),
    /** Chave publicável (role anon) entregue ao frontend. */
    anonKey: optional("ANON_KEY", ""),
    /** Chave de serviço (role service_role) usada apenas server-side. */
    serviceRoleKey: optional("SERVICE_ROLE_KEY", ""),
  },

  storage: {
    /** Diretório raiz dos uploads na hospedagem. */
    root: optional("STORAGE_ROOT", "/var/www/uploads"),
    /** Limite de upload em bytes (300MB, igual ao Nginx atual). */
    maxFileSizeBytes: toInt(optional("STORAGE_MAX_BYTES", String(300 * 1024 * 1024)), 300 * 1024 * 1024),
    /**
     * Origens remotas usadas como fallback quando o arquivo ainda não existe
     * no disco (mídias que não foram baixadas na migração). Evita vídeo/imagem
     * quebrada: servimos do remoto e gravamos em disco no primeiro acesso.
     */
    fallbackOrigins: optional(
      "STORAGE_FALLBACK_URLS",
      [
        process.env.LEGACY_SUPABASE_URL ?? "",
        process.env.SUPABASE_URL ?? "",
        process.env.VITE_SUPABASE_URL ?? "",
      ]
        .filter(Boolean)
        .join(","),
    )
      .split(",")
      .map((o) => o.trim().replace(/\/+$/, ""))
      .filter(Boolean),
    /** Cacheia em disco o que vier do fallback (desative com `false`). */
    cacheFallback: optional("STORAGE_CACHE_FALLBACK", "true") !== "false",
  },


  functions: {
    /** Diretório com as funções portadas (código Deno original). */
    dir: optional("FUNCTIONS_DIR", "../supabase/functions"),
    /** Primeira porta do range usado pelos processos de função. */
    basePort: toInt(optional("FUNCTIONS_BASE_PORT", "9100"), 9100),
    /** Tempo máximo de execução por chamada. */
    timeoutMs: toInt(optional("FUNCTIONS_TIMEOUT_MS", "60000"), 60000),
    /** Caminho do binário do Deno na VPS. */
    denoBin: optional("DENO_BIN", "deno"),
    /** Desliga o host de funções (útil em ambiente de teste). */
    enabled: optional("FUNCTIONS_ENABLED", "true") !== "false",
  },

  /** Origem legada do Supabase — usada apenas pelos scripts de migração. */
  legacy: {
    supabaseUrl: optional("LEGACY_SUPABASE_URL", ""),
    supabaseServiceKey: optional("LEGACY_SUPABASE_SERVICE_KEY", ""),
    databaseUrl: optional("LEGACY_DATABASE_URL", ""),
  },
} as const;

if (env.auth.jwtSecret.length < 32) {
  throw new Error("[env] JWT_SECRET precisa ter no mínimo 32 caracteres.");
}

/**
 * Acesso à origem legada durante a migração.
 *
 * Retornado em formato estável para os scripts: `url` e `serviceKey` servem à
 * API de storage; `databaseUrl` serve ao pg_dump/psql. Cada script decide o
 * que é obrigatório para a sua etapa, por isso aqui apenas normalizamos.
 */
export function requireLegacy(): {
  url: string;
  serviceKey: string;
  databaseUrl: string;
} {
  return {
    url: env.legacy.supabaseUrl.replace(/\/+$/, ""),
    serviceKey: env.legacy.supabaseServiceKey,
    databaseUrl: env.legacy.databaseUrl,
  };
}
