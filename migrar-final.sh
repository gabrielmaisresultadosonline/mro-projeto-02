#!/usr/bin/env bash
# ============================================================
#  CORTE FINAL — MIGRAR 100% PARA O POSTGRESQL DA VPS
#
#      cd /var/www/ia-mro && ./migrar-final.sh
#
#  O que ele faz, nesta ordem (idempotente, pode repetir):
#    1. Atualiza o código do GitHub (mantém .env, uploads e node_modules)
#    2. Instala dependências (frontend + server)
#    3. Garante papel/banco/extensões do PostgreSQL local
#    4. Sincroniza o que faltou: tabelas, usuários (hashes) e TODAS as mídias
#    5. Confere linha por linha e arquivo por arquivo
#    6. Reescreve as URLs de mídia para a VPS  (--apply)
#    7. Compila o site JÁ APONTANDO para o backend próprio
#    8. Reinicia PM2 + Nginx e valida /health, /rest/v1 e /storage/v1
#
#  NADA é apagado no Supabase: ele continua no ar como cópia de segurança.
#  Só o site passa a ler/gravar no PostgreSQL da VPS.
#
#  Opções:
#    --repo <url>   troca o remoto origin antes do pull
#                   (ex.: https://github.com/gabriel.../mro-projeto-02.git)
#    --forcar       aplica o corte mesmo com divergências na conferência
#    --voltar       desfaz só o corte do frontend (volta a ler o Supabase)
# ============================================================
set -euo pipefail
cd "$(dirname "$0")"

B='\033[1;36m'; G='\033[0;32m'; Y='\033[0;33m'; R='\033[0;31m'; N='\033[0m'
step(){ echo -e "\n${B}▶ $1${N}"; }
ok(){   echo -e "  ${G}✓${N} $1"; }
warn(){ echo -e "  ${Y}!${N} $1"; }
fail(){ echo -e "  ${R}✗${N} $1"; exit 1; }

FORCAR=false
VOLTAR=false
REPO=""
while [ $# -gt 0 ]; do
  case "$1" in
    --forcar) FORCAR=true ;;
    --voltar) VOLTAR=true ;;
    --repo)   REPO="${2:-}"; shift ;;
    *) fail "Parâmetro desconhecido: $1 (use --repo <url>, --forcar ou --voltar)" ;;
  esac
  shift
done

FRONT_ENV=".env.production.local"   # não versionado; tem prioridade no build

# ---------- Rollback rápido do frontend ----------
if [ "$VOLTAR" = true ]; then
  step "Desfazendo o corte do frontend"
  rm -f "$FRONT_ENV"
  npm run build
  command -v systemctl >/dev/null 2>&1 && sudo systemctl reload nginx || true
  ok "Site recompilado lendo o Supabase novamente (banco da VPS permanece intacto)."
  exit 0
fi

# ---------- 1. Código ----------
step "1/8 Atualizando o código do GitHub"
if [ -n "$REPO" ]; then
  git remote set-url origin "$REPO"
  ok "origin → $REPO"
fi
if [ -d .git ]; then
  git fetch --all --quiet
  BRANCH="$(git remote show origin 2>/dev/null | sed -n 's/.*HEAD branch: //p' | head -n1)"
  BRANCH="${BRANCH:-main}"
  git reset --hard "origin/$BRANCH" --quiet
  ok "Código em $(git rev-parse --short HEAD) (branch $BRANCH). .env, uploads e chaves preservados."
else
  warn "Não é um repositório git; usando os arquivos do disco."
fi
chmod +x atualizar.sh deploy.sh migrar-tudo.sh migrar-final.sh 2>/dev/null || true

# ---------- 2. Dependências ----------
step "2/8 Instalando dependências"
npm install --legacy-peer-deps --no-audit --no-fund --silent
(cd server && npm install --no-audit --no-fund --silent)
ok "Frontend e backend prontos."

# ---------- 3. Banco local ----------
[ -f server/.env ] || fail "server/.env não existe. Baixe o arquivo pronto em /admin → Migração e salve como server/.env."
set -a; . ./server/.env; set +a
[ -n "${DATABASE_URL:-}" ]  || fail "DATABASE_URL vazio em server/.env."
[ -n "${ANON_KEY:-}" ]      || fail "ANON_KEY vazio em server/.env (é a chave que o site usa)."
[ -n "${LEGACY_DATABASE_URL:-}" ] || fail "LEGACY_DATABASE_URL vazio: sem ele não há de onde copiar o que falta."
[ -n "${LEGACY_SUPABASE_SERVICE_KEY:-}" ] || fail "LEGACY_SUPABASE_SERVICE_KEY vazio: é essa chave que baixa vídeos e imagens."

step "3/8 Garantindo o PostgreSQL local"
DB_URL_NO_PROTO="${DATABASE_URL#*://}"
DB_CREDS="${DB_URL_NO_PROTO%%@*}"
DB_USER_ENV="${DB_CREDS%%:*}"
DB_PASS_ENV="${DB_CREDS#*:}"
DB_NAME_ENV="$(printf '%s' "${DB_URL_NO_PROTO##*/}" | cut -d'?' -f1)"

if command -v sudo >/dev/null 2>&1 && sudo -n -u postgres psql -tAc 'select 1' >/dev/null 2>&1; then
  DB_PASS_SQL="$(printf '%s' "$DB_PASS_ENV" | sed "s/'/''/g")"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -q <<SQL
DO \$\$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER_ENV') THEN
    EXECUTE format('ALTER ROLE %I WITH LOGIN SUPERUSER CREATEROLE CREATEDB PASSWORD %L', '$DB_USER_ENV', '$DB_PASS_SQL');
  ELSE
    EXECUTE format('CREATE ROLE %I LOGIN SUPERUSER CREATEROLE CREATEDB PASSWORD %L', '$DB_USER_ENV', '$DB_PASS_SQL');
  END IF;
END
\$\$;
SQL
  sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME_ENV'" | grep -q 1 \
    || sudo -u postgres createdb -O "$DB_USER_ENV" "$DB_NAME_ENV"
  ok "Papel \"$DB_USER_ENV\" e banco \"$DB_NAME_ENV\" sincronizados com o server/.env."
fi

PGCONNECT_TIMEOUT=5 psql -d "$DATABASE_URL" -c 'select 1' >/dev/null \
  || fail "Sem conexão com o Postgres local. Confira DATABASE_URL em server/.env."
psql -v ON_ERROR_STOP=1 -d "$DATABASE_URL" -f server/migrations/000_bootstrap.sql >/dev/null
for m in $(ls server/migrations/0[1-9]*.sql 2>/dev/null || true); do
  psql -v ON_ERROR_STOP=0 -d "$DATABASE_URL" -f "$m" >/dev/null 2>&1 || true
done
STORAGE_DIR="${STORAGE_ROOT:-/var/www/uploads}"
mkdir -p "$STORAGE_DIR"; chmod 750 "$STORAGE_DIR"
mkdir -p /var/log/mro 2>/dev/null || sudo mkdir -p /var/log/mro
ok "Estrutura aplicada. Uploads em $STORAGE_DIR."

# pg_dump precisa ser >= servidor de origem (Supabase roda PostgreSQL 17).
if ! ls /usr/lib/postgresql/1[7-9]/bin/pg_dump >/dev/null 2>&1; then
  warn "Instalando postgresql-client-17…"
  sudo install -d /usr/share/keyrings
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /usr/share/keyrings/pgdg.gpg
  echo "deb [signed-by=/usr/share/keyrings/pgdg.gpg] http://apt.postgresql.org/pub/repos/apt $(. /etc/os-release && echo "$VERSION_CODENAME")-pgdg main" \
    | sudo tee /etc/apt/sources.list.d/pgdg.list >/dev/null
  sudo apt-get update -qq && sudo apt-get install -y -qq postgresql-client-17 \
    || fail "Instale o postgresql-client-17 manualmente e rode de novo."
fi

# ---------- 4. Sincronizar o que falta ----------
step "4/8 Sincronizando tabelas, usuários e mídias que faltam"
warn "Só o que ainda não existe é copiado; os vídeos são o maior volume."
(cd server && npm run migrate:all) || warn "Alguma etapa reclamou; a conferência abaixo decide."

# ---------- 5. Conferência ----------
step "5/8 Conferência final"
CONF_OK=true
(cd server && npm run migrate:verify) || CONF_OK=false
if [ "$CONF_OK" != true ]; then
  if [ "$FORCAR" != true ]; then
    fail "A conferência apontou divergências. Rode o comando de novo (a cópia é incremental) ou use --forcar se as diferenças forem aceitáveis. Nada foi cortado; o site segue no Supabase."
  fi
  warn "Divergências ignoradas por --forcar."
fi

# ---------- 6. URLs de mídia ----------
step "6/8 Apontando as URLs de mídia para a VPS"
(cd server && npm run migrate:urls -- --apply)
ok "Links de vídeo, imagem e PDF agora servidos pela VPS."

# ---------- 7. Frontend no backend próprio ----------
step "7/8 Compilando o site já no PostgreSQL da VPS"
API_URL_FINAL="${PUBLIC_API_URL:-https://api.maisresultadosonline.com.br}"
cat > "$FRONT_ENV" <<EOF
# Gerado por migrar-final.sh em $(date -Is) — corte para o backend próprio.
VITE_USE_LOCAL_BACKEND=true
VITE_API_URL=$API_URL_FINAL
VITE_API_ANON_KEY=$ANON_KEY
VITE_SUPABASE_URL=$API_URL_FINAL
VITE_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY
EOF
chmod 600 "$FRONT_ENV"
npm run build
[ -d dist ] || fail "Build não gerou dist/."
grep -rqs "supabase.co" dist/assets 2>/dev/null \
  && warn "Ainda há referências a supabase.co no bundle (links fixos em texto). Verifique se são apenas conteúdos antigos." \
  || ok "Bundle sem chamadas ao Supabase."
ok "Site compilado apontando para $API_URL_FINAL."
if [ -n "${WEB_ROOT:-}" ] && [ "$WEB_ROOT" != "$(pwd)/dist" ]; then
  rsync -a --delete dist/ "$WEB_ROOT/"; ok "Publicado em $WEB_ROOT."
fi

# ---------- 8. Serviços + validação ----------
step "8/8 Reiniciando serviços e validando"
if command -v pm2 >/dev/null 2>&1; then
  pm2 startOrReload ecosystem.config.cjs --update-env >/dev/null
  pm2 save >/dev/null || true
  ok "PM2 recarregado (mro-api)."
else
  warn "PM2 não instalado (npm i -g pm2): o backend não fica no ar sozinho."
fi
command -v systemctl >/dev/null 2>&1 && sudo systemctl reload nginx && ok "Nginx recarregado."

PORT_LOCAL="${PORT:-8787}"
BASE="http://127.0.0.1:${PORT_LOCAL}"
for i in $(seq 1 30); do
  if H="$(curl -sf --max-time 3 "$BASE/health")" && printf '%s' "$H" | grep -q '"ok":true'; then
    printf '  %s\n' "$(printf '%s' "$H" | head -c 300)"
    ok "Backend saudável."
    break
  fi
  if [ "$i" = 30 ]; then
    pm2 status mro-api 2>/dev/null || true
    tail -n 40 /var/log/mro/api-error.log 2>/dev/null || true
    fail "Backend não respondeu em /health. O site continuará quebrado até isso subir — rode ./migrar-final.sh --voltar para reverter o frontend enquanto investiga."
  fi
  sleep 1
done

curl -sf --max-time 5 -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  "$BASE/rest/v1/hub_products?select=id&limit=1" >/dev/null \
  && ok "REST (/rest/v1) respondendo com a chave anônima." \
  || warn "REST não respondeu como esperado; confira as políticas RLS e a ANON_KEY."

curl -sf --max-time 5 -o /dev/null "$BASE/storage/v1/object/public/assets/" \
  && ok "Storage local acessível." || warn "Storage: verifique $STORAGE_DIR e o Nginx."

TAB=$(psql -tAd "$DATABASE_URL" -c "select count(*) from information_schema.tables where table_schema='public'")
ARQ=$(find "$STORAGE_DIR" -type f 2>/dev/null | wc -l)
cat <<EOF

$(echo -e "${G}═══ Migração concluída — o site agora roda no PostgreSQL da VPS ═══${NC}")

  Tabelas no schema public : $TAB
  Arquivos em $STORAGE_DIR : $ARQ
  API                      : $API_URL_FINAL

O Supabase segue intacto como cópia de segurança. Quando estiver seguro por
alguns dias, aí sim pode encerrá-lo.

Reverter só o frontend (sem perder nada do banco novo):
  ./migrar-final.sh --voltar

Atualizações do dia a dia depois do corte:
  ./deploy.sh
EOF
