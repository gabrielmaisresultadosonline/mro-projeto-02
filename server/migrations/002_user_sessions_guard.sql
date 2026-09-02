-- ============================================================
-- Guard-rail para public.user_sessions no VPS/Postgres local.
--
-- Por que existe: user_sessions nunca foi definida em uma migration
-- versionada. Ela só chega ao Postgres local via pg_dump do banco legado
-- (server/scripts/migrate-schema.ts -> 001_schema_legacy.sql, gerado em
-- runtime e não commitado). Esse dump é um snapshot único: `CREATE TABLE
-- IF NOT EXISTS` cria a tabela na primeira vez, mas nunca adiciona colunas
-- novas em execuções seguintes. Qualquer coluna adicionada ao projeto
-- Supabase de origem DEPOIS do snapshot (ex.: lifetime_creative_used_at,
-- last_access, email, archived_profiles) fica ausente no VPS.
--
-- A função supabase/functions/user-cloud-storage/index.ts referencia
-- justamente essas colunas em `load`, `save` e `set_creatives_pro`. Quando
-- a coluna não existe, o shim REST (server/src/rest/router.ts) devolve um
-- erro de Postgres que o `if (error)` da função converte em HTTP 500
-- fixo (index.ts:130-136, 268-274, 374-380), mesmo a causa raiz sendo
-- "coluna/tabela inexistente" e não uma falha genérica.
--
-- Esta migration é idempotente e pode rodar em qualquer ordem após o
-- 001_schema_legacy.sql: cria a tabela se faltar e garante todas as
-- colunas usadas pela função de storage.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squarecloud_username      TEXT NOT NULL,
  email                     TEXT,
  days_remaining            INTEGER NOT NULL DEFAULT 365,
  profile_sessions          JSONB NOT NULL DEFAULT '[]'::jsonb,
  archived_profiles         JSONB NOT NULL DEFAULT '[]'::jsonb,
  lifetime_creative_used_at TIMESTAMPTZ,
  last_access               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garante as colunas em instalações onde a tabela já existia (dump antigo).
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS days_remaining INTEGER NOT NULL DEFAULT 365;
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS profile_sessions JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS archived_profiles JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS lifetime_creative_used_at TIMESTAMPTZ;
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS last_access TIMESTAMPTZ;
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.user_sessions'::regclass
       AND contype = 'u'
       AND conname = 'user_sessions_squarecloud_username_key'
  ) THEN
    ALTER TABLE public.user_sessions
      ADD CONSTRAINT user_sessions_squarecloud_username_key UNIQUE (squarecloud_username);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS user_sessions_squarecloud_username_idx
  ON public.user_sessions (squarecloud_username);

GRANT ALL ON public.user_sessions TO service_role;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Reaplica realtime (000_bootstrap.sql já tenta, mas na 1a execução do
-- bootstrap a tabela ainda não existia e a função ignorava silenciosamente).
SELECT public.enable_realtime('user_sessions');
