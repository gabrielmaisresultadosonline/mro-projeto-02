import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Provider = 'openai' | 'deepseek' | 'google' | 'gateway';

/** Mapeia a chave salva no /admin para o provedor correspondente. */
function providerFromToken(name: string, value: string): Provider {
  const n = name.toLowerCase();
  if (n.includes('deepseek')) return 'deepseek';
  if (n.includes('openai') || n.includes('chatgpt') || n.includes('gpt')) return 'openai';
  if (value.startsWith('AIza')) return 'google';
  if (n.includes('gemini') || n.includes('google')) return 'google';
  return 'gateway';
}

/**
 * Resolve a chave de IA disponível.
 * Prioridade: tokens salvos no /admin (tabela api_tokens) → variáveis de ambiente.
 * Aceita OpenAI (ChatGPT) e DeepSeek — basta colar o token na aba Tokens do /admin.
 */
async function resolveAiKey(): Promise<{ key: string; provider: Provider; source: string } | null> {
  const candidates = [
    'openai', 'openai_api_key', 'chatgpt', 'gpt',
    'deepseek', 'deepseek_api_key',
    'gemini', 'gemini_api_key', 'google_ai', 'google_api_key',
    'lovable', 'lovable_api_key',
  ];

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (url && serviceKey) {
      const db = createClient(url, serviceKey, { auth: { persistSession: false } });
      const { data } = await db.from('api_tokens').select('key, value').in('key', candidates);
      if (Array.isArray(data) && data.length > 0) {
        for (const wanted of candidates) {
          const row = data.find((r: { key: string; value: string }) => r.key === wanted && r.value?.trim());
          if (row) {
            const value = String(row.value).trim();
            return { key: value, provider: providerFromToken(wanted, value), source: `admin:${wanted}` };
          }
        }
      }
    }
  } catch (error) {
    console.error('⚠️ Falha ao ler api_tokens:', (error as Error).message);
  }

  const envOpenai = Deno.env.get('OPENAI_API_KEY');
  if (envOpenai) return { key: envOpenai, provider: 'openai', source: 'env:OPENAI_API_KEY' };

  const envDeepseek = Deno.env.get('DEEPSEEK_API_KEY');
  if (envDeepseek) return { key: envDeepseek, provider: 'deepseek', source: 'env:DEEPSEEK_API_KEY' };

  const envGoogle = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_AI_API_KEY');
  if (envGoogle) return { key: envGoogle, provider: 'google', source: 'env:GEMINI_API_KEY' };

  const envGateway = Deno.env.get('LOVABLE_API_KEY');
  if (envGateway) return { key: envGateway, provider: 'gateway', source: 'env:LOVABLE_API_KEY' };

  return null;
}

/** Chamada OpenAI-compatível (OpenAI/ChatGPT, DeepSeek e gateway Lovable). */
async function callOpenAICompatible(opts: {
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  imageUrl: string;
  label: string;
}) {
  const response = await fetch(`${opts.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${opts.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model,
      messages: [
        { role: 'system', content: opts.systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: opts.userPrompt },
            { type: 'image_url', image_url: { url: opts.imageUrl } },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 2500,
    }),
  });

  if (!response.ok) {
    throw new Error(`${opts.label} ${response.status}: ${(await response.text()).slice(0, 400)}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content as string | undefined;
}


/** Converte a imagem (URL) para base64 quando o cliente não enviou os bytes. */
async function fetchImageBase64(url: string): Promise<{ data: string; mime: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const mime = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
    const bytes = new Uint8Array(await res.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return { data: btoa(binary), mime };
  } catch (error) {
    console.error('⚠️ Falha ao baixar screenshot:', (error as Error).message);
    return null;
  }
}

async function callGateway(apiKey: string, systemPrompt: string, userPrompt: string, imageUrl: string) {
  return await callOpenAICompatible({
    baseUrl: 'https://ai.gateway.lovable.dev/v1',
    apiKey,
    model: 'google/gemini-2.5-flash',
    systemPrompt,
    userPrompt,
    imageUrl,
    label: 'gateway',
  });
}


async function callGoogle(apiKey: string, systemPrompt: string, userPrompt: string, image: { data: string; mime: string }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{
          role: 'user',
          parts: [
            { text: userPrompt },
            { inline_data: { mime_type: image.mime, data: image.data } },
          ],
        }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2500 },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`google ${response.status}: ${await response.text()}`);
  }
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') as string | undefined;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { screenshot_url, username, image_base64, content_type } = body as {
      screenshot_url?: string;
      username?: string;
      image_base64?: string;
      content_type?: string;
    };

    if (!screenshot_url && !image_base64) {
      return Response.json(
        { success: false, error: 'missing_image', message: 'URL do screenshot é obrigatória' },
        { status: 400, headers: corsHeaders },
      );
    }

    const normalizedUsername = String(username || 'username').replace('@', '').trim().toLowerCase();
    console.log(`🔍 Analisando print de @${normalizedUsername}`);

    const credential = await resolveAiKey();
    if (!credential) {
      return Response.json({
        success: false,
        error: 'missing_ai_token',
        message: 'Token de IA não configurado. Salve a chave da IA no painel /admin (aba Tokens) e tente novamente.',
      }, { headers: corsHeaders });
    }
    console.log(`🔑 Provedor de IA: ${credential.provider} (${credential.source})`);

    const systemPrompt = `Você é um especialista em marketing digital e análise de perfis do Instagram.

Você vai receber uma IMAGEM de screenshot de perfil do Instagram. Analise a imagem visualmente e extraia os dados visíveis.

PRIMEIRO: Verifique se a imagem é realmente um print/screenshot de um perfil do Instagram.
Se NÃO for um print do Instagram (por exemplo: foto aleatória, meme, outro app, etc), responda APENAS:
{"not_instagram": true}

Se FOR um print válido do Instagram, extraia APENAS dados realmente visíveis na imagem.
Não invente números. Se algum campo não estiver legível, use 0 ou string vazia.

RETORNE APENAS JSON VÁLIDO no seguinte formato:
{
  "not_instagram": false,
  "extracted_data": {
    "username": "username exato visível no print, sem @",
    "full_name": "",
    "bio": "",
    "followers": 0,
    "following": 0,
    "posts_count": 0,
    "is_business": true,
    "category": "",
    "external_link": "",
    "profile_picture_visible": true,
    "posts_visible": []
  },
  "analysis": {
    "strengths": ["pontos fortes identificados com emoji"],
    "weaknesses": ["pontos fracos identificados com emoji"],
    "opportunities": ["oportunidades de melhoria com emoji"],
    "niche": "nicho identificado",
    "audienceType": "tipo de público-alvo estimado",
    "contentScore": 0,
    "engagementScore": 0,
    "profileScore": 0,
    "recommendations": ["recomendações específicas"]
  },
  "visual_observations": {
    "profile_quality": "",
    "brand_consistency": "",
    "content_variety": "",
    "grid_aesthetic": ""
  }
}

Regras extras:
- followers, following e posts_count devem ser números inteiros.
- Se o print mostrar pontuação brasileira como 4.254 ou 1,2 mil, converta para número inteiro.
- Extraia o username real visível no print, nunca o informado pelo sistema.`;

    const userPrompt = `Analise este print do Instagram e extraia os dados visíveis do perfil.
O perfil cadastrado no sistema é @${normalizedUsername}.
Extraia o username REAL visível na imagem — se for diferente de @${normalizedUsername}, retorne o que está na imagem.
Depois gere uma análise profissional curta baseada no que aparece no print.
Se esta imagem NÃO for um print de perfil do Instagram, retorne {"not_instagram": true}.`;

    let content: string | undefined;
    try {
      if (credential.provider === 'google') {
        const image = image_base64
          ? { data: image_base64, mime: content_type || 'image/jpeg' }
          : await fetchImageBase64(screenshot_url!);
        if (!image) throw new Error('não foi possível ler a imagem do print');
        content = await callGoogle(credential.key, systemPrompt, userPrompt, image);
      } else {
        const imageUrl = image_base64
          ? `data:${content_type || 'image/jpeg'};base64,${image_base64}`
          : screenshot_url!;
        content = await callGateway(credential.key, systemPrompt, userPrompt, imageUrl);
      }
    } catch (aiError) {
      console.error('❌ Falha na chamada de IA:', (aiError as Error).message);
      return Response.json({
        success: false,
        error: 'ai_request_failed',
        message: 'A IA não conseguiu analisar o print agora. Tente novamente em alguns segundos.',
      }, { headers: corsHeaders });
    }

    const jsonMatch = content?.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ Resposta da IA sem JSON:', content?.slice(0, 300));
      return Response.json({
        success: false,
        error: 'invalid_ai_response',
        message: 'Não conseguimos ler o print. Envie um print nítido do perfil e tente novamente.',
      }, { headers: corsHeaders });
    }

    const analysisResult = JSON.parse(jsonMatch[0]);

    if (analysisResult.not_instagram === true) {
      return Response.json({
        success: false,
        error: 'not_instagram_profile',
        message: 'Não conseguimos ler o print do perfil. Você precisa enviar um print real do perfil do Instagram que está utilizando.',
      }, { headers: corsHeaders });
    }

    const extracted = analysisResult.extracted_data || {};
    const extractedUsername = String(extracted.username || '').replace('@', '').trim().toLowerCase();

    if (!extractedUsername) {
      return Response.json({
        success: false,
        error: 'username_not_detected',
        message: `Não conseguimos confirmar o @ do print de @${normalizedUsername}. Envie um print real e nítido do perfil @${normalizedUsername}.`,
      }, { headers: corsHeaders });
    }

    if (extractedUsername !== normalizedUsername) {
      console.log(`❌ Username divergente: esperado @${normalizedUsername}, lido @${extractedUsername}`);
      return Response.json({
        success: false,
        error: 'username_mismatch',
        message: `O print enviado é do perfil @${extractedUsername}, mas a conta cadastrada é @${normalizedUsername}. Envie um print real do perfil @${normalizedUsername}.`,
      }, { headers: corsHeaders });
    }

    extracted.username = extractedUsername;

    return Response.json({
      success: true,
      analysis: analysisResult.analysis,
      extracted_data: extracted,
      visual_observations: analysisResult.visual_observations || null,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('❌ Erro ao analisar screenshot:', error);
    return Response.json(
      { success: false, error: 'internal_error', message: 'Erro ao analisar screenshot' },
      { status: 500, headers: corsHeaders },
    );
  }
});
