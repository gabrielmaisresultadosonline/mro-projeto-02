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
install_deno() {
  local arch asset tmp_dir
  case "$(uname -m)" in
    x86_64|amd64) arch="x86_64-unknown-linux-gnu" ;;
    aarch64|arm64) arch="aarch64-unknown-linux-gnu" ;;
    *) return 1 ;;
  esac
  asset="https://github.com/denoland/deno/releases/latest/download/deno-${arch}.zip"
  tmp_dir="$(mktemp -d)"
  curl -fL --retry 3 --connect-timeout 15 "$asset" -o "$tmp_dir/deno.zip" || { rm -rf "$tmp_dir"; return 1; }
  command -v unzip >/dev/null 2>&1 || sudo apt-get install -y unzip
  unzip -oq "$tmp_dir/deno.zip" -d "$tmp_dir"
  sudo install -m 0755 "$tmp_dir/deno" /usr/local/bin/deno
  rm -rf "$tmp_dir"
}

if ! command -v deno >/dev/null 2>&1; then
  warn "Deno ausente; instalando o runtime obrigatório das funções."
  install_deno || true
fi

if command -v deno >/dev/null 2>&1; then
  DENO_PATH="$(command -v deno)"
  # O daemon do PM2 pode ter um PATH diferente do shell. Persistimos o caminho
  # absoluto sem alterar as demais variáveis ou segredos existentes.
  if grep -q '^DENO_BIN=' server/.env; then
    sed -i "s|^DENO_BIN=.*|DENO_BIN=$DENO_PATH|" server/.env
  else
    printf '\nDENO_BIN=%s\n' "$DENO_PATH" >> server/.env
  fi
  ok "Deno disponível ($(deno --version | head -1))."
elif [ "$CUTOVER" = true ]; then
  fail "Deno não pôde ser instalado. Corte bloqueado para não publicar logins sem /functions/v1."
else
  warn "Deno não encontrado: as funções (/functions/v1) não vão subir."
fi

ok "Ambiente pronto."

# ---------- 1. Código ----------
# Repositório oficial deste projeto. Pode ser sobrescrito com REPO_URL=... ./deploy.sh
REPO_URL="${REPO_URL:-https://github.com/gabrielmaisresultadosonline/mro-projeto-02.git}"

step "Atualizando o código"
if [ -d .git ]; then
  CURRENT_REMOTE="$(git remote get-url origin 2>/dev/null || echo '')"
  # normaliza (ignora sufixo .git e barra final) para comparar com o oficial
  norm() { echo "${1%/}" | sed -E 's/\.git$//'; }
  if [ "$(norm "$CURRENT_REMOTE")" != "$(norm "$REPO_URL")" ]; then
    warn "origin apontava para: ${CURRENT_REMOTE:-<nenhum>}"
    if [ -n "$CURRENT_REMOTE" ]; then
      git remote set-url origin "$REPO_URL"
    else
      git remote add origin "$REPO_URL"
    fi
    ok "origin corrigido para $REPO_URL"
  fi
  git fetch origin main --quiet
  git reset --hard origin/main --quiet
  ok "Código em $(git rev-parse --short HEAD) ($(git remote get-url origin))."
else
  warn "Não é um repositório git; usando os arquivos presentes no disco."
fi


# ---------- 2. Dependências ----------
# Sem --silent: se o npm falhar (lockfile desatualizado, conflito de peer deps,
# falta de memória) precisamos ver o motivo em vez de sair calado.
step "Instalando dependências"
install_deps() {
  local dir="$1"
  ( cd "$dir" && { npm ci --no-audit --no-fund --legacy-peer-deps \
      || { warn "npm ci falhou em '$dir'; tentando npm install --legacy-peer-deps."
           npm install --no-audit --no-fund --legacy-peer-deps; }; } ) \
    || fail "Falha ao instalar dependências em '$dir' (veja o log acima; se foi 'Killed', a VPS ficou sem memória — adicione swap)."
}
install_deps "."
install_deps "server"
ok "Backend e frontend com dependências instaladas."

# Resolve e compila os imports remotos antes de reiniciar o serviço. Sem esse
# aquecimento, o primeiro login após cada deploy pode ficar aguardando o Deno
# baixar módulos e exceder o timeout do proxy.
if command -v deno >/dev/null 2>&1; then
  step "Preparando as funções locais"
  # --config supabase/functions/deno.json define nodeModulesDir=none. Sem isso o
  # Deno 2 usa o modo "manual" (por causa do package.json da raiz) e falha em
  # todo import npm: que não esteja em node_modules — exatamente o erro que
  # deixava /functions/v1 sem login e sem vídeo.
  if timeout 900 deno cache --config supabase/functions/deno.json supabase/functions/*/index.ts; then
    ok "Imports das Edge Functions armazenados no cache local."
  elif [ "$CUTOVER" = true ]; then
    fail "Imports das Edge Functions não resolveram. Corte bloqueado: login e vídeos dependem deles."
  else
    warn "Algum import não pôde ser pré-carregado; o backend fará nova tentativa sob demanda."
  fi
fi



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
  # Rede de segurança: dump do banco local ANTES de qualquer escrita.
  if [ -f server/.env ]; then
    DB_URL="$(grep -E '^DATABASE_URL=' server/.env | head -1 | cut -d= -f2- | tr -d '"'"'"'')"
    if [ -n "${DB_URL:-}" ]; then
      BACKUP_DIR="${BACKUP_DIR:-/var/backups/mro}"
      sudo mkdir -p "$BACKUP_DIR" 2>/dev/null || mkdir -p "$BACKUP_DIR" 2>/dev/null || true
      BACKUP_FILE="$BACKUP_DIR/pg-$(date +%Y%m%d-%H%M%S).sql.gz"
      if pg_dump -d "$DB_URL" 2>/dev/null | gzip > "$BACKUP_FILE"; then
        ok "Backup do PostgreSQL local em $BACKUP_FILE"
      else
        rm -f "$BACKUP_FILE"
        warn "Não foi possível gerar o backup automático (segue adiante; nada é apagado)."
      fi
    fi
  fi

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
  # Remove processos Deno órfãos de reinícios anteriores; sem isso, eles podem
  # manter as portas 9100+ ocupadas e provocar 502 nas novas funções.
  pkill -f '[r]unner\.ts' 2>/dev/null || true
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

# Atualiza somente a rota pública de mídia dentro do virtual host já ativo.
# O restante da configuração (incluindo certificados TLS) é preservado.
if command -v nginx >/dev/null 2>&1 && [ -d /etc/nginx/sites-enabled ]; then
  step "Configurando streaming de mídias no Nginx"
  API_DOMAIN="$(echo "${PUBLIC_API_URL:-api.maisresultadosonline.com.br}" | sed -E 's|https?://||; s|/.*|')"
  # -R segue os links de sites-enabled. A busca ampla também cobre instalações
  # que mantêm o vhost diretamente em nginx.conf ou apenas em sites-available.
  API_NGINX_CONFIG="$(sudo grep -RlE --include='*.conf' --include='*mro*' --include='*api*' \
    "server_name.*$API_DOMAIN" /etc/nginx 2>/dev/null \
    | grep -vE '\.(pre-media-hotfix|bak|backup|disabled)$' | head -1 || true)"
  if [ -n "$API_NGINX_CONFIG" ]; then
    sudo python3 - "$API_NGINX_CONFIG" "$API_DOMAIN" <<'PY'
import pathlib, re, sys
config_path = pathlib.Path(sys.argv[1])
api_domain = sys.argv[2]
text = config_path.read_text()
storage_block = """    location /storage/v1/object/public/ {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Range $http_range;
        proxy_set_header If-Range $http_if_range;
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_read_timeout 600s;
        add_header 'Access-Control-Allow-Origin' '*' always;
    }"""
functions_block = """    location /functions/v1/ {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_request_buffering off;
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
        add_header 'Access-Control-Allow-Origin' $http_origin always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
    }"""
loc_regex = re.compile(r"(?ms)^\s*location\s+/storage/v1/object/public/\s*\{[^{}]*\}")
fn_regex = re.compile(r"(?ms)^\s*location\s+/functions/v1/?\s*\{[^{}]*\}")
if loc_regex.search(text):
    updated = loc_regex.sub(storage_block, text, count=1)
else:
    server_blocks = re.split(r"(server\s*\{)", text)
    new_parts, found = [], False
    for i in range(len(server_blocks)):
        part = server_blocks[i]
        if not found and api_domain in part:
            last_brace = part.rfind("}")
            if last_brace != -1: part = part[:last_brace] + "\n" + storage_block + "\n" + part[last_brace:]; found = True
        new_parts.append(part)
    updated = "".join(new_parts)
if fn_regex.search(updated):
    updated = fn_regex.sub(functions_block, updated, count=1)
else:
    generic_location = re.search(r"(?m)^\s*location\s+/\s*\{", updated)
    if generic_location:
        updated = updated[:generic_location.start()] + functions_block + "\n\n" + updated[generic_location.start():]
if updated != text:
    config_path.with_suffix(config_path.suffix + ".pre-media-hotfix").write_text(text)
    config_path.write_text(updated)
PY
    sudo nginx -t || fail "Configuração do Nginx inválida; o arquivo anterior foi preservado em .pre-media-hotfix."
    ok "Funções e mídias públicas encaminhadas ao backend local."
  else
    warn "Virtual host da API não localizado; preservando a configuração atual."
  fi
fi

# Recarrega o Nginx (site estático em dist/) para servir o build novo.
command -v systemctl >/dev/null 2>&1 && sudo systemctl reload nginx && ok "Nginx recarregado."

if [ "$CUTOVER" = true ]; then
  # O navegador faz OPTIONS antes do POST. Validamos explicitamente o CORS
  # público, não apenas a porta local, para detectar configuração antiga do Nginx.
  if curl -sf --max-time 10 -X OPTIONS \
      -H "Origin: https://maisresultadosonline.com.br" \
      -H "Access-Control-Request-Method: POST" \
      -H "Access-Control-Request-Headers: authorization,apikey,content-type,x-client-info" \
      -D /tmp/mro-cors-headers -o /dev/null \
      "${API_URL_FINAL%/}/functions/v1/ferramentamropromo-video" \
      && grep -qi '^access-control-allow-origin:' /tmp/mro-cors-headers; then
    ok "CORS público das Edge Functions validado."
  else
    fail "CORS público das Edge Functions inválido; confira o virtual host da API no Nginx."
  fi

  # Confere de fato pela porta pública se a API responde com a chave anônima:
  # é isso que o navegador vai fazer em cada página.
  curl -sf --max-time 5 -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
    "http://127.0.0.1:${PORT_LOCAL}/rest/v1/hub_products?select=id&limit=1" >/dev/null \
    && ok "REST respondendo com a chave anônima do site." \
    || warn "REST não respondeu como esperado — confira RLS/ANON_KEY antes de divulgar."

  # O login e várias áreas dependem de Edge Functions. Um /health saudável não
  # basta: iniciamos uma função real pelo mesmo proxy usado no navegador.
  FUNCTION_CHECK_BODY="$(mktemp)"
  FUNCTION_CHECK_STATUS="$(curl -sS --max-time 75 -o "$FUNCTION_CHECK_BODY" -w '%{http_code}' -X POST \
      -H "Origin: https://maisresultadosonline.com.br" \
      -H "apikey: $ANON_KEY" \
      -H "Authorization: Bearer $ANON_KEY" \
      -H "Content-Type: application/json" \
      --data '{"action":"verify_user","username":"__deploy_healthcheck__"}' \
      "http://127.0.0.1:${PORT_LOCAL}/functions/v1/mro-tool-api" || true)"
  if [[ "$FUNCTION_CHECK_STATUS" =~ ^[234] ]]; then
    ok "Edge Function de login iniciou e respondeu pelo proxy local."
  else
    echo "  Resposta local (${FUNCTION_CHECK_STATUS:-sem status}):"
    head -c 4000 "$FUNCTION_CHECK_BODY" 2>/dev/null || true; echo
    echo "  Últimas saídas do backend:"
    tail -n 100 /var/log/mro/api-out.log 2>/dev/null || true
    tail -n 100 /var/log/mro/api-error.log 2>/dev/null || true
    rm -f "$FUNCTION_CHECK_BODY"
    fail "Edge Functions indisponíveis; corte bloqueado para evitar falha de login."
  fi
  rm -f "$FUNCTION_CHECK_BODY"

  # Esta função consulta o PostgreSQL e entrega a configuração dos vídeos;
  # portanto testa de uma vez proxy, runtime Deno e acesso interno ao REST.
  if curl -sf --max-time 70 -X POST \
      -H "Origin: https://maisresultadosonline.com.br" \
      -H "apikey: $ANON_KEY" \
      -H "Authorization: Bearer $ANON_KEY" \
      -H "Content-Type: application/json" \
      --data '{"action":"get_video"}' \
      "${API_URL_FINAL%/}/functions/v1/ferramentamropromo-video" >/dev/null; then
    ok "Função de vídeo respondeu usando o PostgreSQL local."
  else
    tail -n 80 /var/log/mro/api-error.log 2>/dev/null || true
    fail "Função de vídeo indisponível; deploy bloqueado para evitar páginas sem mídia."
  fi
fi

echo -e "\n${GREEN}═══ Deploy concluído ═══${NC}"
if [ "$CUTOVER" = true ]; then
  echo -e "${YELLOW}Corte final aplicado: banco, mídias E site agora no PostgreSQL da VPS.${NC}"
  echo "O Supabase segue intacto como backup. Para reverter só o site: ./deploy.sh --voltar"
fi
exit 0

