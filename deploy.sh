#!/usr/bin/env bash
# ============================================================
# COMANDO ÚNICO DE DEPLOY — VPS (PostgreSQL próprio, sem Supabase)
#
#   ./deploy.sh              → atualiza código, banco, backend e frontend
#   ./deploy.sh --migrate    → o acima + sincroniza dados/arquivos do Supabase
#   ./deploy.sh --cutover    → corte final: migra, reescreve URLs, compila o
#                              site JÁ no PostgreSQL da VPS e valida
#   ./deploy.sh --voltar     → desfaz só o corte do frontend (volta ao Supabase)

#
# Executar na raiz do projeto, na VPS, como o usuário da aplicação.
# ============================================================
set -euo pipefail

cd "$(dirname "$0")"

BLUE='\033[1;36m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RED='\033[0;31m'; NC='\033[0m'
step() { echo -e "\n${BLUE}▶ $1${NC}"; }
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; exit 1; }

MIGRATE=false
CUTOVER=false
VOLTAR=false
FRONT_ENV=".env.production.local"   # não versionado; tem prioridade no build
for arg in "$@"; do
  case "$arg" in
    --migrate) MIGRATE=true ;;
    --cutover) MIGRATE=true; CUTOVER=true ;;
    --voltar)  VOLTAR=true ;;
    *) fail "Parâmetro desconhecido: $arg (use --migrate, --cutover ou --voltar)" ;;
  esac
done

# ---------- Rollback rápido do frontend (não toca no banco nem nos arquivos) ----------
if [ "$VOLTAR" = true ]; then
  step "Desfazendo o corte do frontend"
  rm -f "$FRONT_ENV"
  npm run build
  [ -n "${WEB_ROOT:-}" ] && rsync -a --delete dist/ "$WEB_ROOT/"
  command -v systemctl >/dev/null 2>&1 && sudo systemctl reload nginx || true
  ok "Site voltou a ler o Supabase. O PostgreSQL da VPS continua intacto."
  exit 0
fi



# ---------- 0. Pré-requisitos ----------
step "Verificando pré-requisitos"
for binary in node npm psql pg_dump; do
  command -v "$binary" >/dev/null 2>&1 || fail "$binary não encontrado. Rode ./deploy/install-vps.sh primeiro."
done
[ -f server/.env ] || fail "server/.env não existe. Copie de server/.env.example e preencha."
command -v deno >/dev/null 2>&1 || warn "deno não encontrado: as funções (/functions/v1) não vão subir."
ok "Ambiente pronto."

# ---------- 1. Código ----------
step "Atualizando o código"
if [ -d .git ]; then
  git fetch --all --quiet
  git reset --hard origin/main --quiet
  ok "Código em $(git rev-parse --short HEAD)."
else
  warn "Não é um repositório git; usando os arquivos presentes no disco."
fi

# ---------- 2. Dependências ----------
step "Instalando dependências"
npm ci --no-audit --no-fund --silent
(cd server && npm ci --no-audit --no-fund --silent)
ok "Backend e frontend com dependências instaladas."

# ---------- 3. Banco de dados ----------
step "Aplicando estrutura do banco"
set -a; . ./server/.env; set +a
psql -v ON_ERROR_STOP=1 -d "$DATABASE_URL" -f server/migrations/000_bootstrap.sql >/dev/null
ok "Extensões, roles, storage, auth e realtime aplicados."

if [ -f server/migrations/001_schema_legacy.sql ]; then
  psql -v ON_ERROR_STOP=0 -d "$DATABASE_URL" -f server/migrations/001_schema_legacy.sql >/dev/null 2>&1 || true
  ok "Schema das tabelas do projeto aplicado."
fi

# Migrações extras criadas depois do corte (002_, 003_, ...).
for migration in $(ls server/migrations/0[2-9]*.sql 2>/dev/null || true); do
  psql -v ON_ERROR_STOP=1 -d "$DATABASE_URL" -f "$migration" >/dev/null
  ok "Migração aplicada: $(basename "$migration")"
done

# ---------- 4. Migração de dados e mídias ----------
if [ "$MIGRATE" = true ]; then
  step "Sincronizando dados e arquivos do Supabase"
  if [ "$CUTOVER" = true ]; then
    (cd server && npm run migrate:all -- --apply-urls)
  else
    (cd server && npm run migrate:all)
  fi
else
  warn "Migração de dados não solicitada (use --migrate)."
fi

# ---------- 5. Diretórios de upload ----------
step "Preparando o diretório de uploads"
STORAGE_DIR="${STORAGE_ROOT:-/var/www/uploads}"
mkdir -p "$STORAGE_DIR"
chmod 750 "$STORAGE_DIR"
ok "Uploads em $STORAGE_DIR ($(du -sh "$STORAGE_DIR" 2>/dev/null | cut -f1) usados)."

# ---------- 6. Frontend ----------
# No corte final o site precisa ser compilado com VITE_USE_LOCAL_BACKEND=true;
# sem isso as 213 páginas continuariam falando com o Supabase mesmo já tendo o
# banco e as mídias na VPS. As chaves vêm do server/.env que já está no disco.
if [ "$CUTOVER" = true ]; then
  step "Apontando o site para o backend próprio"
  [ -n "${ANON_KEY:-}" ] || fail "ANON_KEY vazio em server/.env — é a chave que o site usa para falar com a API."
  API_URL_FINAL="${PUBLIC_API_URL:-https://api.maisresultadosonline.com.br}"
  cat > "$FRONT_ENV" <<EOF
# Gerado por deploy.sh --cutover em $(date -Is). Remova com ./deploy.sh --voltar.
VITE_USE_LOCAL_BACKEND=true
VITE_API_URL=$API_URL_FINAL
VITE_API_ANON_KEY=$ANON_KEY
VITE_SUPABASE_URL=$API_URL_FINAL
VITE_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY
EOF
  chmod 600 "$FRONT_ENV"
  ok "Build usará $API_URL_FINAL."
fi

step "Compilando o site"
npm run build
[ -d dist ] || fail "Build não gerou a pasta dist/."
ok "Site compilado ($(du -sh dist | cut -f1))."


if [ -n "${WEB_ROOT:-}" ]; then
  rsync -a --delete dist/ "$WEB_ROOT/"
  ok "Publicado em $WEB_ROOT."
else
  warn "WEB_ROOT não definido; o Nginx deve apontar para $(pwd)/dist."
fi

# ---------- 7. Serviços ----------
step "Reiniciando o backend"
if command -v pm2 >/dev/null 2>&1; then
  pm2 startOrReload ecosystem.config.cjs --update-env
  pm2 save >/dev/null
  ok "PM2 recarregado."
else
  warn "PM2 não instalado: rode 'npm i -g pm2' para manter o backend no ar."
fi

# ---------- 8. Verificação ----------
step "Checando a saúde do sistema"
PORT_LOCAL="${PORT:-8787}"
for attempt in $(seq 1 20); do
  if HEALTH_JSON="$(curl -sf --max-time 3 "http://127.0.0.1:${PORT_LOCAL}/health")" \
    && printf '%s' "$HEALTH_JSON" | grep -q '"ok":true'; then
    printf '%s' "$HEALTH_JSON" | head -c 400; echo
    ok "Backend respondendo na porta ${PORT_LOCAL}."
    break
  fi
  if [ "$attempt" = "20" ]; then
    pm2 status mro-api 2>/dev/null || true
    tail -n 40 /var/log/mro/api-error.log 2>/dev/null || true
    fail "Backend não respondeu de forma saudável em /health."
  fi
  sleep 1
done

echo -e "\n${GREEN}═══ Deploy concluído ═══${NC}"
[ "$CUTOVER" = true ] && echo -e "${YELLOW}Corte final aplicado: as URLs de mídia agora apontam para a VPS.${NC}"
exit 0
