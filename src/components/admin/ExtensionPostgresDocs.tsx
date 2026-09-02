import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Check, Database, Server, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/** Ferramenta a ser documentada. Cada uma tem sua própria função de API. */
export type ExtensionTool = 'mro' | 'zapmro';

interface ExtensionPostgresDocsProps {
  tool: ExtensionTool;
  /** Origem pública da API na VPS. Pode ser trocada pelo admin. */
  defaultApiUrl?: string;
}

interface ToolMeta {
  label: string;
  fn: string;
  legacy: string;
  /** Todas as actions aceitas pela função, para o programador não precisar perguntar. */
  actions: Array<{ action: string; body: string; note: string }>;
}

const LEGACY_ORIGIN = 'https://adljdeekwifwcdcgbpit.supabase.co';

/** Chave publishable (anon) do backend antigo — pode ir no código da extensão. */
const LEGACY_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkbGpkZWVrd2lmd2NkY2dicGl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMjk0MDMsImV4cCI6MjA4MDcwNTQwM30.odKBOAuEEW0WJEburLRTL9Qj1EbitETmhxqNoE_F_g4';

const TOOL_META: Record<ExtensionTool, ToolMeta> = {
  mro: {
    label: 'Ferramenta MRO (Instagram)',
    fn: 'mro-tool-api',
    legacy: `${LEGACY_ORIGIN}/functions/v1/mro-tool-api`,
    actions: [
      { action: 'login', body: '{ username, password, instagram? }', note: 'Autentica o usuário da extensão.' },
      { action: 'check_username', body: '{ username }', note: 'Verifica se o usuário existe.' },
      { action: 'plan_status', body: '{ username }', note: 'Plano, dias restantes e vitalício.' },
      { action: 'verify_user', body: '{ username }', note: 'Dados completos: plano, contas, testes e slots.' },
      { action: 'verify_instagram', body: '{ username, instagram }', note: 'Alias: check_instagram.' },
      { action: 'check_account', body: '{ username, instagram }', note: 'Conta liberada para o usuário?' },
      { action: 'add_account', body: '{ username, instagram, trial?, trial_hours? }', note: 'Cadastra conta fixa ou de teste.' },
      { action: 'get_user_logs', body: '{ username, limit? }', note: 'Histórico de ações do usuário.' },
      { action: 'list_users', body: '{ }', note: 'Admin: lista todos os usuários.' },
      { action: 'sync_credentials', body: '{ }', note: 'Alias: sync_emails.' },
      { action: 'send_access', body: '{ username }', note: 'Reenvia credenciais por e-mail.' },
      { action: 'upsert_user', body: '{ username, ...campos }', note: 'Cria ou atualiza usuário.' },
      { action: 'set_extras', body: '{ username, extras }', note: 'Define slots extras.' },
      { action: 'delete_user', body: '{ username }', note: 'Remove usuário.' },
      { action: 'admin_add_account', body: '{ username, instagram }', note: 'Cadastro forçado pelo admin.' },
      { action: 'remove_account', body: '{ username, instagram }', note: 'Remove conta do usuário.' },
      { action: 'reset_trials', body: '{ username }', note: 'Zera os testes usados.' },
      { action: 'bulk_import', body: '{ users: [...] }', note: 'Importação em massa.' },
    ],
  },
  zapmro: {
    label: 'ZAPMRO (WhatsApp)',
    fn: 'zapmro-api',
    legacy: `${LEGACY_ORIGIN}/functions/v1/zapmro-api`,
    actions: [
      { action: 'login', body: '{ username, password }', note: 'Autentica o usuário da extensão.' },
      { action: 'verify_user', body: '{ username }', note: 'Plano, validade e permissões.' },
      { action: 'heartbeat', body: '{ username, session_token? }', note: 'Mantém a sessão viva.' },
      { action: 'register_whatsapp', body: '{ username, phone }', note: 'Vincula o número à conta.' },
      { action: 'remove_whatsapp', body: '{ username }', note: 'Desvincula o número.' },
      { action: 'get_announcements', body: '{ }', note: 'Avisos exibidos na extensão.' },
      { action: 'list_announcements', body: '{ }', note: 'Admin: lista avisos.' },
      { action: 'save_announcement', body: '{ ...campos }', note: 'Admin: cria/edita aviso.' },
      { action: 'delete_announcement', body: '{ id }', note: 'Admin: remove aviso.' },
      { action: 'list_users', body: '{ }', note: 'Admin: lista usuários.' },
      { action: 'upsert_user', body: '{ username, ...campos }', note: 'Cria ou atualiza usuário.' },
      { action: 'bulk_import_users', body: '{ users: [...] }', note: 'Importação em massa.' },
      { action: 'sync_credentials', body: '{ }', note: 'Sincroniza e-mails/senhas.' },
      { action: 'make_all_lifetime', body: '{ }', note: 'Converte todos em vitalício.' },
      { action: 'send_access', body: '{ username }', note: 'Reenvia credenciais por e-mail.' },
      { action: 'delete_user', body: '{ username }', note: 'Remove usuário.' },
      { action: 'list_sessions', body: '{ username? }', note: 'Sessões ativas.' },
      { action: 'revoke_session', body: '{ session_id }', note: 'Encerra uma sessão.' },
      { action: 'revoke_all_sessions', body: '{ username }', note: 'Encerra todas as sessões.' },
      { action: 'block_ip', body: '{ ip, reason? }', note: 'Bloqueia um IP.' },
      { action: 'unblock_ip', body: '{ ip }', note: 'Desbloqueia um IP.' },
    ],
  },
};

const DEFAULT_API = 'https://api.maisresultadosonline.com.br';
const STORAGE_KEY_PREFIX = 'mro_pg_docs_';

/** Chave anon da VPS embutida no build (definida em vite.config.ts). */
const BUILD_VPS_ANON_KEY = String(
  (import.meta.env.VITE_API_ANON_KEY as string | undefined) ?? '',
).trim();

/**
 * Documentação da NOVA versão da extensão, já apontando para o backend
 * próprio em PostgreSQL (VPS). O contrato de request/response é idêntico ao
 * atual — o único item que muda na extensão é a URL base (e a chave anon).
 *
 * As chaves ficam preenchidas nos exemplos: a do backend antigo é fixa
 * (publishable) e a da VPS vem do build ou é colada pelo admin e guardada
 * localmente, para que o pacote entregue ao programador esteja completo.
 */
const ExtensionPostgresDocs: React.FC<ExtensionPostgresDocsProps> = ({
  tool,
  defaultApiUrl = DEFAULT_API,
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState<string>(defaultApiUrl);
  const [vpsAnonKey, setVpsAnonKey] = useState<string>(BUILD_VPS_ANON_KEY);

  // Persistência local: o admin cola a chave uma vez e ela reaparece depois.
  useEffect(() => {
    try {
      const savedUrl = localStorage.getItem(`${STORAGE_KEY_PREFIX}url`);
      const savedKey = localStorage.getItem(`${STORAGE_KEY_PREFIX}anon`);
      if (savedUrl) setApiUrl(savedUrl);
      if (savedKey) setVpsAnonKey(savedKey);
    } catch {
      /* localStorage indisponível: segue com os padrões do build. */
    }
  }, []);

  const persist = (key: 'url' | 'anon', value: string): void => {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${key}`, value);
    } catch {
      /* ignora quota/privacidade */
    }
  };

  const meta = TOOL_META[tool];
  const base = apiUrl.replace(/\/+$/, '');
  const endpoint = `${base}/functions/v1/${meta.fn}`;
  const anonKey = vpsAnonKey.trim() || 'COLE_A_ANON_KEY_DA_VPS';
  const anonKeyReady = Boolean(vpsAnonKey.trim());

  const copy = (key: string, value: string): void => {
    void navigator.clipboard.writeText(value);
    setCopied(key);
    toast({ title: 'Copiado!' });
    window.setTimeout(() => setCopied(null), 1500);
  };

  const credentialsSnippet = useMemo(
    () => `# ===== Credenciais completas =====

# --- Backend NOVO (PostgreSQL / VPS) ---
API_URL      = ${base}
ENDPOINT     = ${endpoint}
ANON_KEY     = ${anonKey}
REST         = ${base}/rest/v1/<tabela>
STORAGE      = ${base}/storage/v1/object/public/<bucket>/<arquivo>
AUTH         = ${base}/auth/v1/*
HEALTH       = ${base}/health

# --- Backend ANTIGO (Supabase) — manter durante a transição ---
API_URL      = ${LEGACY_ORIGIN}
ENDPOINT     = ${meta.legacy}
ANON_KEY     = ${LEGACY_ANON_KEY}

# Headers usados nas duas pontas (idênticos):
#   Content-Type: application/json
#   apikey: <ANON_KEY do backend escolhido>
#   Authorization: Bearer <ANON_KEY ou JWT do usuário>   (HS256, mesmas claims)
# Nunca usar a service_role na extensão — ela é apenas do servidor.`,
    [base, endpoint, anonKey, meta.legacy],
  );

  const curl = useMemo(
    () => `curl -X POST '${endpoint}' \\
  -H 'Content-Type: application/json' \\
  -H 'apikey: ${anonKey}' \\
  -H 'Authorization: Bearer ${anonKey}' \\
  -d '{"action":"login","username":"usuario","password":"senha"}'`,
    [endpoint, anonKey],
  );

  const actionsSnippet = useMemo(
    () =>
      `POST ${endpoint}\n` +
      `Headers: Content-Type: application/json | apikey: <ANON_KEY> | Authorization: Bearer <ANON_KEY>\n` +
      `Body: { "action": "<action>", ...campos }\n\n` +
      meta.actions
        .map((a) => `${a.action.padEnd(22)} ${a.body.padEnd(46)} ${a.note}`)
        .join('\n'),
    [endpoint, meta.actions],
  );

  const migrationSnippet = useMemo(
    () => `// ===== extensão: config.js =====
// Mantenha AS DUAS URLs durante a transição.
const BACKENDS = {
  supabase: {
    url: "${meta.legacy}",
    apikey: "${LEGACY_ANON_KEY}",
  },
  postgres: {
    url: "${endpoint}",
    apikey: "${anonKey}",
  },
};

// Troque para "postgres" na versão nova. Se algo falhar, o fallback
// automático abaixo devolve o usuário ao backend antigo (zero downtime).
const PREFER = "postgres";

async function api(body) {
  const order = PREFER === "postgres" ? ["postgres", "supabase"] : ["supabase", "postgres"];
  let lastError = null;

  for (const key of order) {
    const cfg = BACKENDS[key];
    try {
      const res = await fetch(cfg.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: cfg.apikey,
          Authorization: "Bearer " + cfg.apikey,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok && res.status >= 500) throw new Error("backend " + key + " indisponível");
      return { ...(await res.json()), _backend: key };
    } catch (error) {
      lastError = error;   // tenta o próximo backend
    }
  }
  throw lastError ?? new Error("Nenhum backend respondeu");
}`,
    [endpoint, meta.legacy, anonKey],
  );

  const healthSnippet = `# 1) o backend da VPS está de pé?
curl -s ${base}/health | jq

# 2) a função da extensão responde?
curl -s -X POST '${endpoint}' \\
  -H 'Content-Type: application/json' \\
  -H 'apikey: ${anonKey}' \\
  -d '{"action":"verify_user","username":"usuario_de_teste"}' | jq`;

  const Block: React.FC<{ id: string; title: string; description?: string; code: string }> = ({
    id,
    title,
    description,
    code,
  }) => (
    <Card className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-sm">{title}</h4>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
        <Button size="sm" variant="outline" onClick={() => copy(id, code)}>
          {copied === id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </Button>
      </div>
      <pre className="bg-muted rounded-md p-3 text-[11px] overflow-x-auto whitespace-pre">{code}</pre>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Documentação PostgreSQL (VPS) — {meta.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Esta é a documentação da <strong>versão nova</strong> da extensão, já apontando para o backend próprio em
            PostgreSQL. Todas as <em>actions</em>, campos de envio e respostas são <strong>exatamente os mesmos</strong>{' '}
            da documentação atual (Supabase) — só muda a URL base e a chave <code>apikey</code>. Os exemplos abaixo já
            saem <strong>com as chaves preenchidas</strong>, prontos para entregar ao programador.
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border p-3 space-y-1">
              <Badge variant="outline" className="gap-1">
                <Server className="w-3 h-3" /> Atual (Supabase)
              </Badge>
              <code className="block text-[11px] break-all text-muted-foreground">{meta.legacy}</code>
              <code className="block text-[10px] break-all text-muted-foreground">apikey: {LEGACY_ANON_KEY}</code>
            </div>
            <div className="rounded-md border border-primary/40 bg-primary/5 p-3 space-y-1">
              <Badge className="gap-1">
                <Database className="w-3 h-3" /> Nova (PostgreSQL / VPS)
              </Badge>
              <code className="block text-[11px] break-all">{endpoint}</code>
              <code className="block text-[10px] break-all">apikey: {anonKey}</code>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="pg-api-url">
              Origem da API na VPS
            </label>
            <div className="flex gap-2">
              <input
                id="pg-api-url"
                value={apiUrl}
                onChange={(e) => {
                  setApiUrl(e.target.value);
                  persist('url', e.target.value);
                }}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-xs"
                placeholder={DEFAULT_API}
              />
              <Button size="sm" variant="outline" onClick={() => copy('endpoint', endpoint)}>
                {copied === 'endpoint' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label
              className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"
              htmlFor="pg-anon-key"
            >
              <KeyRound className="w-3.5 h-3.5" />
              ANON_KEY da VPS
              {anonKeyReady ? (
                <Badge variant="outline" className="ml-1 text-[10px]">
                  preenchida
                </Badge>
              ) : (
                <Badge variant="destructive" className="ml-1 text-[10px]">
                  faltando
                </Badge>
              )}
            </label>
            <div className="flex gap-2">
              <input
                id="pg-anon-key"
                value={vpsAnonKey}
                onChange={(e) => {
                  setVpsAnonKey(e.target.value);
                  persist('anon', e.target.value);
                }}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-xs font-mono"
                placeholder="cole aqui a ANON_KEY gerada na VPS (npm run keys)"
              />
              <Button size="sm" variant="outline" onClick={() => copy('anon', anonKey)}>
                {copied === 'anon' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              É a chave pública (role <code>anon</code>) do servidor — pode ir no código da extensão. A{' '}
              <code>service_role</code> nunca sai do servidor. Se estiver vazia, gere na VPS com{' '}
              <code>cd server &amp;&amp; npm run keys</code> e cole aqui: todos os exemplos desta página são atualizados
              na hora.
            </p>
          </div>
        </CardContent>
      </Card>

      <Block
        id="creds"
        title="1) Credenciais e endpoints (entregar ao programador)"
        description="Bloco único com URLs, chaves e headers dos dois backends."
        code={credentialsSnippet}
      />

      <Block
        id="curl"
        title="2) Teste rápido (login)"
        description="O corpo do POST é idêntico ao da API atual."
        code={curl}
      />

      <Block
        id="actions"
        title={`3) Todas as actions de ${meta.fn}`}
        description="Contrato completo: mesmas actions e respostas nos dois backends."
        code={actionsSnippet}
      />

      <Block
        id="paridade"
        title="4) Paridade de rotas (o que muda)"
        description="Mapa de conversão entre os dois backends. Nenhum campo de resposta muda."
        code={`Supabase                                     →  PostgreSQL (VPS)
/functions/v1/${meta.fn}${' '.repeat(Math.max(1, 22 - meta.fn.length))}→  /functions/v1/${meta.fn}
/rest/v1/<tabela>                            →  /rest/v1/<tabela>
/storage/v1/object/public/<bucket>/<arquivo> →  /storage/v1/object/public/<bucket>/<arquivo>
/auth/v1/*                                   →  /auth/v1/*

Header 'apikey'  → usar a ANON_KEY da VPS (mesma posição, valor diferente)
Header 'Authorization: Bearer <jwt>' → formato de claims idêntico (HS256)`}
      />

      <Block
        id="config"
        title="5) Código da extensão com fallback automático"
        description="Publique a versão nova com PREFER='postgres'. Se a VPS falhar, a extensão volta sozinha ao Supabase — os usuários não percebem nada."
        code={migrationSnippet}
      />

      <Block
        id="health"
        title="6) Checklist de validação antes de desligar o Supabase"
        description="Rode na VPS ou no seu terminal. Só desligue o backend antigo quando as duas respostas vierem OK."
        code={healthSnippet}
      />

      <Card className="p-4 space-y-2 border-yellow-500/40 bg-yellow-500/5">
        <h4 className="font-semibold text-sm text-yellow-600">⚠️ Ordem segura de corte</h4>
        <ol className="text-xs text-muted-foreground list-decimal pl-5 space-y-1">
          <li>Rodar a sincronização na VPS (dados + usuários + mídias) até a conferência não apontar divergências.</li>
          <li>Publicar a versão nova da extensão com <code>PREFER = "postgres"</code> e fallback ligado.</li>
          <li>Acompanhar o campo <code>_backend</code> nas respostas: quando ninguém mais cair em "supabase", o corte é seguro.</li>
          <li>Rodar a sincronização final e só então desligar o backend antigo.</li>
        </ol>
      </Card>
    </div>
  );
};

export default ExtensionPostgresDocs;
