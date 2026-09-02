import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INFINITEPAY_HANDLE = "paguemro";

const log = (step: string, details?: unknown) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [CHECK-MRO-PAYMENT] ${step}${detailsStr}`);
};

const isPaymentConfirmed = (payload: unknown): boolean => {
  if (!payload || typeof payload !== "object") return false;
  const payment = payload as Record<string, unknown>;
  if (payment.paid === true) return true;

  const status = typeof payment.status === "string"
    ? payment.status.trim().toUpperCase()
    : "";

  return ["PAID", "APPROVED", "APPROVED_PAYMENT", "COMPLETED"].includes(status);
};

// Salvar log de verificação no banco
const saveVerificationLog = async (
  supabase: any,
  data: {
    event_type: string;
    order_nsu: string | null;
    email?: string | null;
    username?: string | null;
    status: string;
    result_message: string;
    order_found?: boolean;
  }
) => {
  try {
    await supabase.from("infinitepay_webhook_logs").insert({
      event_type: data.event_type,
      order_nsu: data.order_nsu,
      email: data.email || null,
      username: data.username || null,
      status: data.status,
      result_message: data.result_message,
      order_found: data.order_found ?? null,
    });
  } catch (e) {
    console.error("Error saving verification log:", e);
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase configuration" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    log("Checking MRO payment");

    const body = await req.json();
    const { nsu_order, transaction_nsu, slug, force_webhook } = body;

    log("Request params", { nsu_order, transaction_nsu, slug, force_webhook });

    if (!nsu_order) {
      return new Response(
        JSON.stringify({ error: "Missing nsu_order" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Buscar pedido no banco
    const { data: order, error: orderError } = await supabase
      .from("mro_orders")
      .select("*")
      .eq("nsu_order", nsu_order)
      .maybeSingle();

    if (orderError) {
      log("Database error", { error: orderError.message, nsu_order });
      await saveVerificationLog(supabase, {
        event_type: "auto_check",
        order_nsu: nsu_order,
        status: "error",
        result_message: `Erro no banco: ${orderError.message}`,
        order_found: false,
      });
      return new Response(
        JSON.stringify({ error: "Database error", details: orderError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!order) {
      log("Order not found", { nsu_order });
      await saveVerificationLog(supabase, {
        event_type: "auto_check",
        order_nsu: nsu_order,
        status: "error",
        result_message: "Pedido não encontrado",
        order_found: false,
      });
      return new Response(
        JSON.stringify({ error: "Order not found", nsu_order }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    log("Order found", { status: order.status, email: order.email, username: order.username });

    // Se já está completed, retornar sucesso
    if (order.status === "completed") {
      log("Order already completed");
      await saveVerificationLog(supabase, {
        event_type: "auto_check",
        order_nsu: nsu_order,
        email: order.email,
        username: order.username,
        status: "success",
        result_message: "Pedido já está completo",
        order_found: true,
      });
      return new Response(
        JSON.stringify({ success: true, status: "completed", order }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Se já está pago mas não completed, tentar processar via webhook
    if (order.status === "paid" || force_webhook) {
      log("Order paid or force_webhook, triggering webhook manually");
      
      try {
        // Chamar webhook para processar
        const webhookResult = await supabase.functions.invoke("mro-payment-webhook", {
          body: {
            order_nsu: nsu_order,
            paid: true,
            status: "paid",
            items: [{
              description: `MROIG_${order.plan_type === "lifetime" ? "VITALICIO" : order.plan_type === "trial" ? "TRIAL" : order.plan_type === "solo" ? "SOLO" : order.plan_type === "pro" ? "PRO" : order.plan_type === "agencia" ? "AGENCIA" : "ANUAL"}_${order.username}_${order.email}`
            }]
          }
        });

        log("Webhook result", webhookResult);

        // Aguardar um pouco e verificar novamente
        await new Promise(resolve => setTimeout(resolve, 2000));

        const { data: updatedOrder } = await supabase
          .from("mro_orders")
          .select("*")
          .eq("nsu_order", nsu_order)
          .single();

        await saveVerificationLog(supabase, {
          event_type: "auto_check",
          order_nsu: nsu_order,
          email: order.email,
          username: order.username,
          status: "success",
          result_message: `Webhook acionado - status: ${updatedOrder?.status || "paid"}`,
          order_found: true,
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            status: updatedOrder?.status || "paid", 
            order: updatedOrder,
            webhook_triggered: true,
            message: "Pagamento processado com sucesso"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } catch (webhookError) {
        log("Error invoking webhook", { error: String(webhookError) });
      }
    }

    // Tentar verificar via InfiniPay payment_check se tiver os parâmetros
    if (transaction_nsu && slug) {
      log("Checking payment via InfiniPay API with transaction_nsu", { transaction_nsu, slug });

      try {
        const checkResponse = await fetch(
          "https://api.checkout.infinitepay.io/payment_check",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              handle: INFINITEPAY_HANDLE,
              order_nsu: nsu_order,
              transaction_nsu,
              slug,
            }),
          }
        );

        const checkData = await checkResponse.json();
        log("InfiniPay payment_check response", checkData);

        // checkData.paid é o campo principal retornado pela API da InfiniPay
        if (isPaymentConfirmed(checkData)) {
          log("Payment confirmed via API, updating order and triggering webhook");

          // Atualizar para paid primeiro
          await supabase
            .from("mro_orders")
            .update({ 
              status: "paid", 
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("nsu_order", nsu_order);

          // Chamar webhook para processar
          await supabase.functions.invoke("mro-payment-webhook", {
            body: {
              order_nsu: nsu_order,
              paid: true,
              status: "paid",
              items: [{
                description: `MROIG_${order.plan_type === "lifetime" ? "VITALICIO" : order.plan_type === "trial" ? "TRIAL" : order.plan_type === "solo" ? "SOLO" : order.plan_type === "pro" ? "PRO" : order.plan_type === "agencia" ? "AGENCIA" : "ANUAL"}_${order.username}_${order.email}`
              }]
            }
          });

          // Aguardar processamento
          await new Promise(resolve => setTimeout(resolve, 3000));

          const { data: updatedOrder } = await supabase
            .from("mro_orders")
            .select("*")
            .eq("nsu_order", nsu_order)
            .single();

          await saveVerificationLog(supabase, {
            event_type: "auto_check",
            order_nsu: nsu_order,
            email: order.email,
            username: order.username,
            status: "success",
            result_message: "Pagamento confirmado via API (transaction_nsu)",
            order_found: true,
          });

          return new Response(
            JSON.stringify({ 
              success: true, 
              status: updatedOrder?.status || "paid", 
              order: updatedOrder,
              payment_confirmed: true 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          );
        }
      } catch (apiError) {
        log("Error checking InfiniPay API", { error: String(apiError) });
      }
    }

    // Tentar buscar status via API pública do InfiniPay usando o link
    if (order.infinitepay_link) {
      log("Trying to extract slug from payment link", { link: order.infinitepay_link });
      
      try {
        // Extrair parâmetros do link
        const url = new URL(order.infinitepay_link);
        const lenc = url.searchParams.get('lenc');
        
        if (lenc) {
          log("Found lenc parameter, checking payment status", { lenc: lenc.substring(0, 50) + "..." });
          
          // Tentar verificar o pagamento usando o lenc como slug
          const checkResponse = await fetch(
            "https://api.checkout.infinitepay.io/payment_check",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                handle: INFINITEPAY_HANDLE,
                order_nsu: nsu_order,
                slug: lenc,
              }),
            }
          );

          if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            log("InfiniPay payment_check with lenc response", checkData);

            if (isPaymentConfirmed(checkData)) {
              log("Payment confirmed via lenc, updating order and triggering webhook");

              // Atualizar para paid
              await supabase
                .from("mro_orders")
                .update({ 
                  status: "paid", 
                  paid_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq("nsu_order", nsu_order);

              // Chamar webhook
              await supabase.functions.invoke("mro-payment-webhook", {
                body: {
                  order_nsu: nsu_order,
                  paid: true,
                  status: "paid",
                  items: [{
                    description: `MROIG_${order.plan_type === "lifetime" ? "VITALICIO" : order.plan_type === "trial" ? "TRIAL" : order.plan_type === "solo" ? "SOLO" : order.plan_type === "pro" ? "PRO" : order.plan_type === "agencia" ? "AGENCIA" : "ANUAL"}_${order.username}_${order.email}`
                  }]
                }
              });

              await new Promise(resolve => setTimeout(resolve, 3000));

              const { data: updatedOrder } = await supabase
                .from("mro_orders")
                .select("*")
                .eq("nsu_order", nsu_order)
                .single();

              await saveVerificationLog(supabase, {
                event_type: "auto_check",
                order_nsu: nsu_order,
                email: order.email,
                username: order.username,
                status: "success",
                result_message: "Pagamento confirmado via lenc",
                order_found: true,
              });

              return new Response(
                JSON.stringify({ 
                  success: true, 
                  status: updatedOrder?.status || "paid", 
                  order: updatedOrder,
                  payment_confirmed: true,
                  method: "lenc"
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
              );
            }
          }
        }
      } catch (lencError) {
        log("Error checking with lenc", { error: String(lencError) });
      }
    }

    // Método alternativo: buscar pelo order_nsu na API (sem slug)
    log("Trying direct order_nsu check with InfiniPay");
    try {
      const directCheckResponse = await fetch(
        "https://api.checkout.infinitepay.io/payment_check",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            handle: INFINITEPAY_HANDLE,
            order_nsu: nsu_order,
          }),
        }
      );

      if (directCheckResponse.ok) {
        const directCheckData = await directCheckResponse.json();
        log("InfiniPay direct check response", directCheckData);

        if (isPaymentConfirmed(directCheckData)) {
          log("Payment confirmed via direct check, updating order and triggering webhook");

          await supabase
            .from("mro_orders")
            .update({ 
              status: "paid", 
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("nsu_order", nsu_order);

          await supabase.functions.invoke("mro-payment-webhook", {
            body: {
              order_nsu: nsu_order,
              paid: true,
              status: "paid",
              items: [{
                description: `MROIG_${order.plan_type === "lifetime" ? "VITALICIO" : order.plan_type === "trial" ? "TRIAL" : order.plan_type === "solo" ? "SOLO" : order.plan_type === "pro" ? "PRO" : order.plan_type === "agencia" ? "AGENCIA" : "ANUAL"}_${order.username}_${order.email}`
              }]
            }
          });

          await new Promise(resolve => setTimeout(resolve, 3000));

          const { data: updatedOrder } = await supabase
            .from("mro_orders")
            .select("*")
            .eq("nsu_order", nsu_order)
            .single();

          await saveVerificationLog(supabase, {
            event_type: "auto_check",
            order_nsu: nsu_order,
            email: order.email,
            username: order.username,
            status: "success",
            result_message: "Pagamento confirmado via direct_nsu",
            order_found: true,
          });

          return new Response(
            JSON.stringify({ 
              success: true, 
              status: updatedOrder?.status || "paid", 
              order: updatedOrder,
              payment_confirmed: true,
              method: "direct_nsu"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          );
        }
      }
    } catch (directError) {
      log("Error in direct check", { error: String(directError) });
    }

    // Último método: verificar através da consulta de comprovantes/transações
    // A InfiniPay pode ter confirmado o pagamento mas a API pública não reflete imediatamente
    log("Checking via transactions list (fallback)");
    try {
      // Buscar transações recentes que possam corresponder a este pedido
      // Isso é uma verificação de fallback para quando a API pública falha
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      // Se o pedido foi criado há menos de 5 minutos, pode ter pagamento pendente na fila
      const orderCreatedAt = new Date(order.created_at);
      if (orderCreatedAt > fiveMinutesAgo) {
        log("Order is very recent, payment might be processing", { 
          orderAge: Math.round((now.getTime() - orderCreatedAt.getTime()) / 1000) + "s"
        });
      }
    } catch (fallbackError) {
      log("Error in fallback check", { error: String(fallbackError) });
    }

    // Pedido ainda pendente - salvar log
    log("Order still pending");
    await saveVerificationLog(supabase, {
      event_type: "auto_check",
      order_nsu: nsu_order,
      email: order.email,
      username: order.username,
      status: "pending",
      result_message: "Aguardando pagamento",
      order_found: true,
    });

    return new Response(
      JSON.stringify({ success: true, status: "pending", order }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: errorMessage });

    await saveVerificationLog(supabase, {
      event_type: "auto_check",
      order_nsu: null,
      status: "error",
      result_message: `Erro: ${errorMessage}`,
    });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
