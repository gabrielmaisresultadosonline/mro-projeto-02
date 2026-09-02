import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { createAdminSessionToken, verifyAdminSessionToken } from "../_shared/admin-session.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const LoginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(255),
  session_id: z.string().trim().max(255).optional(),
});

const UserSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(255),
  whatsapp: z.string().trim().max(30).optional().nullable(),
  plan_type: z.enum(["trial", "monthly", "lifetime"]).default("monthly"),
});

/** Plano único mensal da Lovablack (em reais). */
const LOVABLACK_PRICE = 97;
const INFINITEPAY_HANDLE = "paguemro";

const CheckoutSchema = z.object({
  name: z.string().trim().min(3, "Informe seu nome completo").max(120),
  email: z.string().trim().email("E-mail inválido").max(255).transform((v) => v.toLowerCase()),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres").max(72),
  whatsapp: z.string().trim().transform((v) => v.replace(/\D/g, "")).refine((v) => v.length >= 10, "WhatsApp inválido"),
});

const UpdateSchema = z.object({
  blocked: z.boolean().optional(),
  custom_message: z.string().max(1000).nullable().optional(),
}).strict();

const createServiceClient = (url: string, serviceKey: string) => {
  const isOpaqueKey = serviceKey.startsWith("sb_secret_");

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: isOpaqueKey ? {
      fetch: (input, init = {}) => {
        const headers = new Headers(init.headers);
        const authorization = headers.get("Authorization");

        // Opaque secret keys identify the privileged backend through `apikey`.
        // Sending the same opaque value as a Bearer token makes PostgREST treat
        // the request as anonymous and incorrectly apply RLS.
        if (authorization === `Bearer ${serviceKey}`) {
          headers.delete("Authorization");
        }

        return fetch(input, { ...init, headers });
      },
    } : undefined,
  });
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Método não permitido" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const adminEmail = Deno.env.get("MRO_ADMIN_EMAIL");
    const adminPassword = Deno.env.get("MRO_ADMIN_PASSWORD");
    const sessionSecret = Deno.env.get("MRO_ADMIN_SESSION_SECRET");
    if (!url || !serviceKey || !adminEmail || !adminPassword || !sessionSecret) {
      return json({ success: false, error: "Configuração do servidor incompleta" }, 500);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.action !== "string") return json({ success: false, error: "Requisição inválida" }, 400);
    const db = createServiceClient(url, serviceKey);

    if (body.action === "admin_login") {
      const parsed = LoginSchema.safeParse(body);
      if (!parsed.success) return json({ success: false, error: "Credenciais inválidas" }, 400);
      // Comparação tolerante a espaços/quebras de linha acidentais nos secrets.
      const valid =
        parsed.data.email.trim().toLowerCase() === adminEmail.trim().toLowerCase() &&
        parsed.data.password === adminPassword.trim();
      if (!valid) return json({ success: false, error: "Credenciais inválidas" }, 401);
      const expiresAt = Date.now() + 12 * 60 * 60 * 1000;
      const token = await createAdminSessionToken({ email: adminEmail, scope: "mro-main-admin", exp: expiresAt }, sessionSecret);
      return json({ success: true, token, expires_at: expiresAt });
    }

    if (body.action === "login") {
      const parsed = LoginSchema.safeParse(body);
      if (!parsed.success) return json({ success: false, error: "Email e senha são obrigatórios" }, 400);
      const { data: user, error } = await db.from("lovablack_users").select("*")
        .eq("email", parsed.data.email.toLowerCase()).eq("password", parsed.data.password).maybeSingle();
      if (error || !user) return json({ success: false, error: "Credenciais inválidas" }, 401);
      const { data: settingsRows } = await db.from("lovablack_settings").select("key,value");
      const settings = Object.fromEntries((settingsRows ?? []).map((row) => [row.key, row.value]));
      if (settings.multi_login_block === "true" && user.session_id && parsed.data.session_id && user.session_id !== parsed.data.session_id) {
        return json({ success: false, error: "Já existe uma sessão ativa em outro dispositivo.", code: "MULTI_LOGIN" }, 403);
      }
      const updates: Record<string, unknown> = { last_access: new Date().toISOString() };
      if (parsed.data.session_id) updates.session_id = parsed.data.session_id;
      await db.from("lovablack_users").update(updates).eq("id", user.id);
      const expired = user.plan_type === "trial" && user.trial_expires_at && new Date(user.trial_expires_at) < new Date();
      return json({ success: true, user: {
        name: user.name, email: user.email, plan_type: user.plan_type,
        is_active: !expired && !user.blocked, is_expired: Boolean(expired), blocked: user.blocked,
        expires_at: user.plan_type === "trial" ? user.trial_expires_at : null,
        last_access: user.last_access, custom_message: user.custom_message,
        global_announcement: settings.global_announcement || "", min_version: settings.min_extension_version || "1.0.0",
      }});
    }

    // Checkout público: cria pedido pendente + link InfinitePay (plano mensal R$97)
    if (body.action === "checkout") {
      const parsed = CheckoutSchema.safeParse(body);
      if (!parsed.success) {
        return json({ success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, 400);
      }
      const { name, email, password, whatsapp } = parsed.data;

      const { data: existing } = await db.from("lovablack_users").select("id").eq("email", email).maybeSingle();
      if (existing) {
        return json({ success: false, error: "Este e-mail já possui acesso. Faça login." }, 400);
      }

      const orderNsu = `LOVABLACK${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
      const priceInCents = LOVABLACK_PRICE * 100;
      const redirectUrl = "https://maisresultadosonline.com.br/lovablack?paid=1";
      const webhookUrl = `${url}/functions/v1/infinitepay-webhook`;
      const items = [{ description: `LOVABLACK_${email}`, quantity: 1, price: priceInCents }];

      let paymentLink = "";
      try {
        const res = await fetch("https://api.checkout.infinitepay.io/links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            handle: INFINITEPAY_HANDLE,
            items,
            itens: items,
            order_nsu: orderNsu,
            redirect_url: redirectUrl,
            webhook_url: webhookUrl,
            customer: { email, name, ...(whatsapp ? { phone_number: whatsapp, phone: whatsapp } : {}) },
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) paymentLink = data.checkout_url || data.link || data.url || "";
      } catch (err) {
        console.error("[lovablack-api] InfinitePay error", err);
      }

      if (!paymentLink) {
        const itemsEncoded = encodeURIComponent(JSON.stringify([{ name: `LOVABLACK_${email}`, price: priceInCents, quantity: 1 }]));
        paymentLink = `https://checkout.infinitepay.io/${INFINITEPAY_HANDLE}?items=${itemsEncoded}&redirect_url=${encodeURIComponent(redirectUrl)}&webhook_url=${encodeURIComponent(webhookUrl)}`;
      }

      const { error: orderError } = await db.from("lovablack_orders").insert({
        name, email, password, whatsapp: whatsapp || null,
        plan_type: "monthly", amount: LOVABLACK_PRICE, status: "pending",
        nsu_order: orderNsu, infinitepay_link: paymentLink,
        expired_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });
      if (orderError) {
        console.error("[lovablack-api] order insert error", orderError);
        return json({ success: false, error: "Não foi possível iniciar o pagamento." }, 500);
      }

      return json({ success: true, payment_link: paymentLink, order_nsu: orderNsu });
    }



    const bearer = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    const isServiceRequest = bearer === serviceKey;
    const admin = await verifyAdminSessionToken(body.admin_token, sessionSecret, "mro-main-admin");
    if (!admin && !isServiceRequest) return json({ success: false, error: "Sessão administrativa inválida ou expirada" }, 401);

    if (body.action === "admin_list_users") {
      const { data, error } = await db.from("lovablack_users").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return json({ success: true, users: data ?? [] });
    }
    if (body.action === "admin_get_settings") {
      const { data, error } = await db.from("lovablack_settings").select("*");
      if (error) throw error;
      return json({ success: true, settings: data ?? [] });
    }
    if (body.action === "admin_create_user" || body.action === "create_user") {
      const parsed = UserSchema.safeParse(body.user ?? body);
      if (!parsed.success) return json({ success: false, error: "Dados do usuário inválidos" }, 400);
      const { data, error } = await db.from("lovablack_users").insert(parsed.data).select().single();
      if (error) return json({ success: false, error: error.code === "23505" ? "Este e-mail já está cadastrado" : error.message }, 400);
      return json({ success: true, user: data });
    }
    if (body.action === "admin_update_user") {
      const id = z.string().uuid().safeParse(body.id);
      const updates = UpdateSchema.safeParse(body.updates);
      if (!id.success || !updates.success) return json({ success: false, error: "Atualização inválida" }, 400);
      const { error } = await db.from("lovablack_users").update(updates.data).eq("id", id.data);
      if (error) throw error;
      return json({ success: true });
    }
    if (body.action === "admin_update_settings") {
      const settings = z.record(z.string().max(2000)).safeParse(body.settings);
      if (!settings.success) return json({ success: false, error: "Configurações inválidas" }, 400);
      const rows = Object.entries(settings.data).map(([key, value]) => ({ key, value }));
      const { error } = await db.from("lovablack_settings").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      return json({ success: true });
    }
    return json({ success: false, error: "Ação inválida" }, 400);
  } catch (error) {
    console.error("[lovablack-api]", error);
    return json({ success: false, error: "Erro interno do servidor" }, 500);
  }
});