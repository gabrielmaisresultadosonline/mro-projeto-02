import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const respond = (payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const normalizeEmail = (value: unknown) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized && normalized.length <= 255 ? normalized : null;
};

const normalizePassword = (value: unknown) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= 255 ? normalized : null;
};

const normalizeToken = (value: unknown) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
};

const normalizeOrderId = (value: unknown) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)
    ? normalized
    : null;
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const toBase64Url = (input: Uint8Array | string) => {
  const bytes = typeof input === "string" ? textEncoder.encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const fromBase64Url = (value: string) => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const getSigningKey = async () => {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
};

const createSessionToken = async (email: string) => {
  const payload = JSON.stringify({ scope: "instagram-admin", email, exp: Date.now() + SESSION_TTL_MS });
  const key = await getSigningKey();
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, textEncoder.encode(payload)));
  return `${toBase64Url(payload)}.${toBase64Url(signature)}`;
};

const verifySessionToken = async (token: string) => {
  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) return null;

  try {
    const payloadBytes = fromBase64Url(payloadPart);
    const signatureBytes = fromBase64Url(signaturePart);
    const key = await getSigningKey();
    const valid = await crypto.subtle.verify("HMAC", key, signatureBytes, payloadBytes);
    if (!valid) return null;

    const payload = JSON.parse(textDecoder.decode(payloadBytes));
    if (payload?.scope !== "instagram-admin" || typeof payload?.exp !== "number" || payload.exp < Date.now()) {
      return null;
    }

    return payload as { email: string; exp: number; scope: string };
  } catch {
    return null;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : null;

    if (!action) {
      return respond({ success: false, error: "Ação inválida" });
    }

    if (action === "login") {
      const email = normalizeEmail(body.email);
      const password = normalizePassword(body.password);

      if (!email || !password) {
        return respond({ success: false, error: "Email e senha são obrigatórios" });
      }

      const { data: settings, error } = await supabase
        .from("license_settings")
        .select("admin_email, admin_password")
        .limit(1)
        .single();

      if (error || !settings) {
        console.error("[instagram-admin] login settings error", error);
        return respond({ success: false, error: "Configuração de admin não encontrada" });
      }

      const validEmail = normalizeEmail(settings.admin_email);
      const validPassword = normalizePassword(settings.admin_password);

      if (!validEmail || !validPassword || email !== validEmail || password !== validPassword) {
        return respond({ success: false, error: "Email ou senha incorretos" });
      }

      const token = await createSessionToken(email);
      return respond({ success: true, token });
    }

    const token = normalizeToken(body.token);
    const session = token ? await verifySessionToken(token) : null;

    if (!session) {
      return respond({ success: false, error: "Sessão expirada. Faça login novamente." });
    }

    // Registra qualquer evento do painel (cadastro reconhecido, pagamento
    // confirmado, falha de verificação etc.) em `infinitepay_webhook_logs`,
    // que já é a tabela lida pela aba de Logs do painel.
    if (action === "logEvent") {
      const truncate = (value: unknown, max = 500) =>
        typeof value === "string" && value.trim() !== "" ? value.trim().slice(0, max) : null;

      const eventType = truncate(body.event_type, 80) ?? "panel_event";
      const status = truncate(body.status, 40) ?? "info";

      const { error } = await supabase.from("infinitepay_webhook_logs").insert({
        event_type: eventType,
        status,
        order_nsu: truncate(body.order_nsu, 120),
        transaction_nsu: truncate(body.transaction_nsu, 120),
        email: truncate(body.email, 255),
        username: truncate(body.username, 120),
        amount: typeof body.amount === "number" && Number.isFinite(body.amount) ? body.amount : null,
        result_message: truncate(body.result_message, 1000),
        order_found: typeof body.order_found === "boolean" ? body.order_found : null,
        order_id: typeof body.order_id === "string" && /^[0-9a-f-]{36}$/i.test(body.order_id) ? body.order_id : null,
        payload: body.payload && typeof body.payload === "object" ? body.payload : null,
      });

      if (error) {
        console.error("[instagram-admin] logEvent error", error);
        return respond({ success: false, error: "Erro ao salvar log" });
      }

      return respond({ success: true });
    }

    if (action === "listOrders") {
      const { data, error } = await supabase
        .from("mro_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[instagram-admin] listOrders error", error);
        return respond({ success: false, error: "Erro ao carregar pedidos" });
      }

      return respond({ success: true, orders: data ?? [] });
    }

    if (action === "listLogs") {
      const { data, error } = await supabase
        .from("infinitepay_webhook_logs")
        .select("id, created_at, event_type, order_nsu, transaction_nsu, email, username, affiliate_id, amount, status, result_message, order_found")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("[instagram-admin] listLogs error", error);
        return respond({ success: false, error: "Erro ao carregar logs" });
      }

      return respond({ success: true, logs: data ?? [] });
    }

    if (action === "listCrmWebhookLogs") {
      const { data, error } = await supabase
        .from("crm_webhook_delivery_logs")
        .select(`
          id, 
          created_at, 
          to_number, 
          message, 
          status, 
          error_message, 
          order_id,
          crm_webhooks (
            name
          )
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("[instagram-admin] listCrmWebhookLogs error", error);
        return respond({ success: false, error: "Erro ao carregar histórico do CRM" });
      }

      return respond({ success: true, logs: data ?? [] });
    }

    if (action === "updateOrderEmail") {
      const orderId = normalizeOrderId(body.orderId);
      const email = normalizeEmail(body.email);

      if (!orderId || !email || !isValidEmail(email)) {
        return respond({ success: false, error: "Email inválido" });
      }

      const { error } = await supabase
        .from("mro_orders")
        .update({ email, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) {
        console.error("[instagram-admin] updateOrderEmail error", error);
        return respond({ success: false, error: "Erro ao atualizar email" });
      }

      return respond({ success: true });
    }
    if (action === "updateOrderWhatsAppSent") {
      const orderId = normalizeOrderId(body.orderId);
      const whatsappSent = typeof body.whatsappSent === "boolean" ? body.whatsappSent : true;

      if (!orderId) {
        return respond({ success: false, error: "Pedido inválido" });
      }

      const { error } = await supabase
        .from("mro_orders")
        .update({ whatsapp_sent: whatsappSent, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) {
        console.error("[instagram-admin] updateOrderWhatsAppSent error", error);
        return respond({ success: false, error: "Erro ao atualizar status do WhatsApp" });
      }

      return respond({ success: true });
    }


    if (action === "deleteOrder") {
      const orderId = normalizeOrderId(body.orderId);

      if (!orderId) {
        return respond({ success: false, error: "Pedido inválido" });
      }

      const { error } = await supabase.from("mro_orders").delete().eq("id", orderId);

      if (error) {
        console.error("[instagram-admin] deleteOrder error", error);
        return respond({ success: false, error: "Erro ao excluir pedido" });
      }

      return respond({ success: true });
    }

    if (action === "listAccesses") {
      const { data, error } = await supabase
        .from("created_accesses")
        .select("id, customer_email, customer_name, username, password, access_type, service_type, expiration_date, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[instagram-admin] listAccesses error", error);
        return respond({ success: false, error: "Erro ao carregar acessos" });
      }

      return respond({ success: true, accesses: data ?? [] });
    }

    if (action === "logReminder") {
      const email = normalizeEmail(body.email);
      const username = typeof body.username === "string" ? body.username.trim().slice(0, 255) : null;

      if (!email || !username) {
        return respond({ success: false, error: "Dados inválidos" });
      }

      // Load existing history from storage
      const historyPath = "admin/reminder-history.json";
      const { data: existing } = await supabase.storage
        .from("user-data")
        .download(historyPath);

      let history: Array<{ email: string; username: string; sent_at: string }> = [];
      if (existing) {
        try {
          history = JSON.parse(await existing.text());
        } catch { /* start fresh */ }
      }

      history.unshift({ email, username, sent_at: new Date().toISOString() });
      if (history.length > 500) history.length = 500;

      await supabase.storage
        .from("user-data")
        .upload(historyPath, new Blob([JSON.stringify(history)], { type: "application/json" }), {
          upsert: true,
          contentType: "application/json",
        });

      return respond({ success: true });
    }

    if (action === "listReminderHistory") {
      const historyPath = "admin/reminder-history.json";
      const { data } = await supabase.storage
        .from("user-data")
        .download(historyPath);

      let history: unknown[] = [];
      if (data) {
        try {
          history = JSON.parse(await data.text());
        } catch { /* empty */ }
      }

      return respond({ success: true, history });
    }

    if (action === "updateCrmWebhook") {
      const webhookId = typeof body.webhookId === "string" ? body.webhookId : null;
      const config = body.config;

      if (!webhookId || !config) {
        return respond({ success: false, error: "Dados inválidos" });
      }

      const { error } = await supabase
        .from("crm_webhooks")
        .update({
          is_active: config.enabled,
          secret_token: config.token,
          default_status: config.default_status || 'pending',
          message_template: config.message_template,
          metadata: config.kanban_labels || {},
          updated_at: new Date().toISOString()
        })
        .eq("id", webhookId);
        
      if (error) {
        console.error("[instagram-admin] updateCrmWebhook error", error);
        return respond({ success: false, error: "Erro ao atualizar webhook" });
      }

      return respond({ success: true });
    }

    if (action === "getCrmWebhook") {
      const { data, error } = await supabase
        .from("crm_webhooks")
        .select("*")
        .limit(1)
        .single();

      if (error) {
        console.error("[instagram-admin] getCrmWebhook error", error);
        return respond({ success: false, error: "Erro ao carregar webhook" });
      }

      return respond({ success: true, config: data });
    }

    return respond({ success: false, error: "Ação inválida" });
  } catch (error) {
    console.error("[instagram-admin] unexpected error", error);
    return respond({ success: false, error: "Erro interno" });
  }
});
