import { z } from "zod";

/**
 * AI copywriting for the marketing section, backed by the OpenCode Go
 * subscription API (OpenAI-compatible endpoint, server-side only).
 *
 * The key lives in OPENCODE_API_KEY and never reaches the browser: the
 * composer talks to `generateCopyAction` in actions/admin/marketing.ts (which
 * enforces ensureAdmin) and that action calls into this module.
 */

// OpenCode Go subscription endpoints are OpenAI-compatible. GLM models are
// "reasoning" models: they answer with content after emitting a reasoning
// trace, so max_tokens has to cover both. The x-opencode-session header is
// required for routing (see opencode.ai/docs/go "Where can I use it").
const OPENCODE_ENDPOINT = "https://opencode.ai/inference/go/openai/v1/chat/completions";
const OPENCODE_USER_AGENT = "nyady-admin/1.0";
const DEFAULT_MODEL = "glm-5.3-flash";
const MAX_TOKENS = 4000;
const TIMEOUT_MS = 90_000;

// One stable session id per server process: enough for the routing/caching
// hints OpenCode expects without leaking per-user data.
const OPENCODE_SESSION = crypto.randomUUID();

export const COPY_CHANNELS = ["facebook", "instagram", "whatsapp"] as const;
export type CopyChannel = (typeof COPY_CHANNELS)[number];

export interface CopyProductData {
  name: string;
  slug: string;
  price: number;
  category: string;
  colors: string[];
  sizes: string[];
  description: string | null;
}

export interface CopyRequest {
  brandVoice: string | null;
  defaultHashtags: string[];
  manualBrief: string;
  tone: number; // 0 = directo, 1 = aspiracional, 2 = promo
  channels: CopyChannel[];
  siteUrl: string;
  instagramHandle: string | null;
  product: CopyProductData | null;
}

export interface CopyVariant {
  hook: string;
  body: string;
  hashtags: string[];
  cta: string;
}

const variantSchema = z.object({
  hook: z.string().min(1).max(160),
  body: z.string().min(1).max(3000),
  hashtags: z.array(z.string().min(1).max(40)).max(15),
  cta: z.string().min(1).max(200),
});

const responseSchema = z.array(variantSchema).min(1).max(3);

const TONES: string[] = [
  "directo y cercano (al grano, criollo, cero rodeo)",
  "aspiracional y elegante (editorial, sensual, sin florituras huecas)",
  "promo con urgencia (ofertas, escasez, remate final)",
];

function systemPrompt(): string {
  return [
    "Sos el redactor de contenido para redes del e-commerce argentino NYADY:",
    "sandalias y calzado de taco artesanal hecho a mano (hecho en Argentina, ARS).",
    "Escribís en español rioplatense, en tuteo (pero sin voseo exagerado que suene falso).",
    "Reglas duras:",
    "- Solo usás los datos que te pasan; NUNCA inventás precios, talles, colores o promos que no estén.",
    "- No usás hashtags dentro del body (van en el campo aparte).",
    "- Sin cringe corporativo, sin \"¡Hola! 👋 ¿Cómo estás?\", sin texto anónimo tipo banner.",
    "- Emojis: máximo 3 por copy, solo si suman.",
    "- Respondés EXCLUSIVAMENTE un array JSON válido (sin markdown, sin explicaciones):",
    '[{"hook":"gancho de 1 línea sin hashtags","body":"texto completo del post con salto de línea donde aporte","hashtags":["palabra","sin","#"],"cta":"llamado a la acción de 1 línea con el link incluido"}]',
    "- La URL del producto se pega tal cual en el cta (o en el body si fluye mejor): no la abreviás ni la inventás.",
    '- Para Instagram el link no se puede clickear en captions: escribí también algo como "link en bio" al final del body, y pasá el link completo igual en el cta por si se usa en otro canal.',
  ].join("\n");
}

function userPrompt(req: CopyRequest): string {
  const lines: string[] = [];
  lines.push(`Tono pedido: ${TONES[Math.max(0, Math.min(2, req.tone))]}`);
  if (req.brandVoice) {
    lines.push(`Instrucciones de voz de marca del dueño (máxima prioridad):`);
    lines.push(req.brandVoice.slice(0, 600));
  }
  if (req.defaultHashtags.length > 0) {
    lines.push(
      `Hashtags actuales de la marca (incluselos si el copy lo pide, nunca los borres): ${req.defaultHashtags.join(", ")}`
    );
  }
  if (req.manualBrief) {
    lines.push(`Brief del dueño para este post:`);
    lines.push(req.manualBrief.slice(0, 800));
  }
  if (req.product) {
    const p = req.product;
    lines.push(`Producto:`);
    lines.push(`- Nombre: ${p.name}`);
    lines.push(`- Categoría: ${p.category}`);
    lines.push(`- Precio: $${Math.round(p.price).toLocaleString("es-AR")}`);
    if (p.colors.length) lines.push(`- Colores: ${p.colors.join(", ")}`);
    if (p.sizes.length) lines.push(`- Talles: ${p.sizes.join(", ")}`);
    if (p.description) lines.push(`- Descripción: ${p.description.slice(0, 500)}`);
    lines.push(`- Link: ${req.siteUrl}/products/${p.slug}`);
  } else {
    lines.push(
      `Producto: ninguno (post de marca/campaña; no inventes productos ni precios)`
    );
  }
  if (req.channels.length) {
    lines.push(
      `Canales destino: ${req.channels.join(", ")}. Adaptá largo y estilo al conjunto (WhatsApp corto y conversacional, Facebook largo, Instagram intermedio).`
    );
  }
  if (req.instagramHandle) {
    lines.push(
      `El handle de Instagram de la marca es @${req.instagramHandle}: podés usar @${req.instagramHandle} para etiqueta de marca cuando se destaque.`
    );
  }
  lines.push("Generá exactamente 3 variantes con ángulos distintos.");
  return lines.join("\n");
}

/** Best-effort JSON extraction: models sometimes wrap arrays in prose/fences. */
function extractJsonArray(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    // Tolerant JSON extraction only — fancy single-quote / trailing-comma
    // repair is not worth the complexity; fail cleanly instead.
    return null;
  }
}

export interface CopyResult {
  ok: boolean;
  variants?: CopyVariant[];
  error?: string;
}

export async function generateCopyVariants(req: CopyRequest): Promise<CopyResult> {
  const apiKey = process.env.OPENCODE_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        "Falta OPENCODE_API_KEY en el entorno (Vercel / .env.local). Podés escribir el copy a mano igual.",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(OPENCODE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": OPENCODE_USER_AGENT,
        "x-opencode-session": OPENCODE_SESSION,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt() },
          { role: "user", content: userPrompt(req) },
        ],
        temperature: 0.8,
        max_tokens: MAX_TOKENS,
      }),
      signal: controller.signal,
    });

    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "La API key de OpenCode Go no es válida (401/403)" };
    }
    if (res.status === 429) {
      return {
        ok: false,
        error: "Llegaste al límite de uso de tu plan Go por ahora. Probá de nuevo más tarde.",
      };
    }
    if (res.status === 402) {
      return { ok: false, error: "La suscripción Go no está activa (402) — revisá el billing en opencode.ai/console" };
    }
    if (!res.ok) {
      return { ok: false, error: `Error de la API de OpenCode (HTTP ${res.status})` };
    }

    const json: unknown = await res.json();
    const message = z
      .object({
        choices: z.array(
          z.object({
            message: z.object({
              // GLM reasoning models can return content: null when
              // max_tokens runs out mid-reasoning; the OpenAI-compatible
              // gateway reports the trace as reasoning_content. Fall back
              // to its trailing JSON if the final answer is missing.
              content: z.string().nullable().optional(),
              reasoning_content: z.string().nullable().optional(),
              reasoning: z.string().nullable().optional(),
            }),
          })
        ),
      })
      .optional()
      .safeParse(json);
    const content = message.success
      ? (message.data?.choices[0]?.message?.content ?? "")
      : "";
    const reasoningTrace = message.success
      ? (message.data?.choices[0]?.message?.reasoning_content ??
        message.data?.choices[0]?.message?.reasoning ??
        "")
      : "";
    const extracted = extractJsonArray(content) || extractJsonArray(reasoningTrace);
    if (!extracted) {
      console.error(
        `[marketing/ai] unparseable response (content.len=${content.length}, reasoning.len=${reasoningTrace.length}):`,
        String(content || reasoningTrace).slice(0, 500)
      );
      return { ok: false, error: "La IA respondió en un formato inesperado. Probá de nuevo." };
    }

    const parsed = responseSchema.safeParse(extracted);
    if (!parsed.success) {
      console.error("[marketing/ai] schema mismatch:", JSON.stringify(extracted).slice(0, 600));
      return { ok: false, error: "La IA devolvió variantes incompletas. Probá de nuevo." };
    }
    return { ok: true, variants: parsed.data };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: "La IA tardó demasiado. Probá de nuevo." };
    }
    console.error("[marketing/ai] generate failed:", error);
    return { ok: false, error: "No se pudieron generar variantes (error de red)." };
  } finally {
    clearTimeout(timer);
  }
}
