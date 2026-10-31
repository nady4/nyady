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
  /** Editorial pillar (see CONTENT_PILLARS). Shapes the angle of the copy. */
  pillar?: string | null;
  /** Goal of the piece: "alcance" | "interaccion" | "conversion" | "seguidores". */
  objective?: string | null;
  /** Format: "post" | "carrusel" | "reel" | "historia". */
  format?: string | null;
  /** Description of the audience (from the content preferences). */
  audience?: string | null;
  /** Topics the copy must never mention. */
  forbiddenTopics?: string[];
  /** Default call to action used when the model does not write one. */
  defaultCta?: string | null;
}

/** Editorial pillars the planner can schedule. */
export const CONTENT_PILLARS = [
  "proceso",
  "estilo",
  "prueba_social",
  "promo",
  "detras_camaras",
  "sorteo",
  "novedad",
] as const;

/** Goals a piece of content can pursue. */
export const CONTENT_OBJECTIVES = [
  "alcance",
  "interaccion",
  "conversion",
  "seguidores",
] as const;

/** Formats the planner can schedule. */
export const CONTENT_FORMATS = ["post", "carrusel", "reel", "historia"] as const;

const PILLAR_BRIEFS: Record<string, string> = {
  proceso:
    "el oficio: cómo se hace el calzado a mano, materiales, terminaciones, el taller",
  estilo:
    "estilo: cómo combinarlo, qué sigue bien, talles, outfits, seasonality",
  prueba_social:
    "prueba social: reseñas, fotos de clientas,andover real, confianza",
  promo: "promo: descuentos, stock, lanzamientos, urgencia real (sin inventar)",
  detras_camaras:
    "detrás de cámaras: la marca, el día a día, el equipo, los pedidos, el empaque",
  sorteo: "sorteo: giveaway, cómo participar, premio y condiciones",
  novedad: "novedad: modelos nuevos, restock, cambios en la tienda",
};

const OBJECTIVE_BRIEFS: Record<string, string> = {
  alcance: "que alcance gente nueva: gancho fuerte, contenido compartible",
  interaccion: "que comenten y guarden: pregunta, opinión, encuesta, tip útil",
  conversion: "que lleven a comprar: urgencia, precio, link claro, scarcity real",
  seguidores:
    "que sigan la cuenta: el valor claro de la marca, comunidad, qué viene después",
};

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
  if (req.audience) {
    lines.push(`Audiencia objetivo: ${req.audience.slice(0, 300)}`);
  }
  if (req.defaultHashtags.length > 0) {
    lines.push(
      `Hashtags actuales de la marca (incluselos si el copy lo pide, nunca los borres): ${req.defaultHashtags.join(", ")}`
    );
  }
  if (req.forbiddenTopics && req.forbiddenTopics.length > 0) {
    lines.push(
      `Nunca mencionés estos temas: ${req.forbiddenTopics.join(", ").slice(0, 300)}`
    );
  }
  if (req.pillar) {
    lines.push(
      `Pilar editorial: ${req.pillar} — ${PILLAR_BRIEFS[req.pillar] ?? req.pillar}.`
    );
  }
  if (req.objective) {
    lines.push(
      `Objetivo del post: ${req.objective} — ${OBJECTIVE_BRIEFS[req.objective] ?? req.objective}.`
    );
  }
  if (req.format) {
    lines.push(`Formato: ${req.format}.`);
  }
  if (req.defaultCta) {
    lines.push(`Llamado a la acción por defecto de la marca: ${req.defaultCta.slice(0, 200)}`);
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

// --- Content plan ideas (phase 5) ---------------------------------------------

export interface PlanIdea {
  /** Day in Argentina time, "YYYY-MM-DD". */
  day: string;
  /** Publication slot, "HH:MM". */
  time: string;
  channel: "facebook" | "instagram" | "both";
  pillar: string;
  format: string;
  objective: string;
  /** The angle of the piece (used as the brief for the copy generator). */
  idea: string;
  /** Product to feature (name as it appears in the catalog), if any. */
  productName: string | null;
}

export interface PlanIdeasResult {
  ok: boolean;
  ideas?: PlanIdea[];
  error?: string;
}

const planIdeaSchema = z.object({
  day: z.string().min(1),
  time: z.string().min(1),
  channel: z.enum(["facebook", "instagram", "both"]),
  pillar: z.string().min(1),
  format: z.string().min(1),
  objective: z.string().min(1),
  idea: z.string().min(1).max(300),
  productName: z.string().max(80).nullable().optional(),
});

function planSystemPrompt(): string {
  return [
    "Sos el planificador de contenido de NYADY (sandalias y calzado de taco artesanal, Argentina).",
    "Armás un calendario de contenido para las redes de la marca.",
    "Reglas duras:",
    "- Usás SOLO los datos que te pasan: productos, pilares y objetivos disponibles.",
    "- No inventás productos, precios, promos ni fechas de evento.",
    "- Cada idea es una pieza concreta y publicable, no un titular genérico.",
    '- Respondés EXCLUSIVAMENTE un array JSON válido (sin markdown, sin explicaciones):',
    '[{"day":"YYYY-MM-DD","time":"HH:MM","channel":"instagram","pillar":"proceso","format":"reel","objective":"seguidores","idea":"Ángulo en una frase","productName":"Nombre exacto del producto o null"}]',
    "- day SIEMPRE dentro de los días que te paso.",
    "- time en formato HH:MM, usando las horas sugeridas.",
    "- Alternás pilares: no encadenes dos ideas del mismo pilar.",
  ].join("\n");
}

function planUserPrompt(params: {
  days: string[];
  pillars: string[];
  formats: string[];
  objectives: string[];
  bestHours: string[];
  audience: string | null;
  brandVoice: string | null;
  forbiddenTopics: string[];
  products: { name: string; category: string }[];
  postsPerWeek: number;
}): string {
  const lines: string[] = [];
  lines.push(`Días a planificar (todos en hora Argentina): ${params.days.join(", ")}`);
  lines.push(`Cantidad de piezas a proponer: ${params.postsPerWeek}`);
  lines.push(
    `Pilares disponibles: ${params.pillars.length ? params.pillars.join(", ") : "proceso, estilo, prueba_social, promo, detras_camaras, novedad"}`
  );
  lines.push(
    `Formatos disponibles: ${params.formats.length ? params.formats.join(", ") : "post, carrusel, reel, historia"}`
  );
  lines.push(
    `Objetivos disponibles: ${params.objectives.length ? params.objectives.join(", ") : "alcance, interaccion, conversion, seguidores"}`
  );
  lines.push(
    `Horas sugeridas (usá solo estas): ${params.bestHours.length ? params.bestHours.join(", ") : "11:00, 19:30"}`
  );
  if (params.audience) lines.push(`Audiencia: ${params.audience.slice(0, 300)}`);
  if (params.brandVoice) lines.push(`Voz de marca: ${params.brandVoice.slice(0, 400)}`);
  if (params.forbiddenTopics.length) {
    lines.push(`Temas prohibidos: ${params.forbiddenTopics.join(", ")}`);
  }
  if (params.products.length) {
    lines.push("Productos del catálogo (usá el nombre exacto si lo mencionás):");
    for (const product of params.products) {
      lines.push(`- ${product.name} (${product.category})`);
    }
  } else {
    lines.push("No hay productos cargados: las ideas deben ser de marca, no de producto.");
  }
  return lines.join("\n");
}

/**
 * Proposes the content plan for a set of days. The result is normalized
 * against the allowed pillars/formats/objectives so a hallucinated value
 * can never reach the calendar.
 */
export async function generatePlanIdeas(params: {
  days: string[];
  pillars: string[];
  formats: string[];
  objectives: string[];
  bestHours: string[];
  audience: string | null;
  brandVoice: string | null;
  forbiddenTopics: string[];
  products: { name: string; category: string }[];
  postsPerWeek: number;
}): Promise<PlanIdeasResult> {
  if (params.days.length === 0) {
    return { ok: false, error: "No hay días para planificar" };
  }

  const reply = await callModel(
    planSystemPrompt(),
    planUserPrompt(params),
    0.9
  );
  if (!reply.ok) return { ok: false, error: reply.error };

  const extracted = extractJsonArray(reply.text);
  if (!extracted) {
    console.error("[marketing/ai] unparseable plan response:", reply.text.slice(0, 400));
    return { ok: false, error: "La IA respondió en un formato inesperado. Probá de nuevo." };
  }

  const parsed = z.array(planIdeaSchema).safeParse(extracted);
  if (!parsed.success || parsed.data.length === 0) {
    console.error("[marketing/ai] plan schema mismatch:", JSON.stringify(extracted).slice(0, 600));
    return { ok: false, error: "La IA no devolvió un plan utilizable. Probá de nuevo." };
  }

  const allowedDays = new Set(params.days);
  const allowedPillars = new Set(params.pillars.length ? params.pillars : CONTENT_PILLARS);
  const allowedFormats = new Set(params.formats.length ? params.formats : CONTENT_FORMATS);
  const allowedObjectives = new Set(params.objectives.length ? params.objectives : CONTENT_OBJECTIVES);
  const allowedHours = new Set(params.bestHours.length ? params.bestHours : ["11:00", "19:30"]);

  const ideas: PlanIdea[] = [];
  for (const idea of parsed.data) {
    if (!allowedDays.has(idea.day)) continue;
    const time = /^\d{2}:\d{2}$/.test(idea.time) ? idea.time : params.bestHours[0] ?? "11:00";
    ideas.push({
      day: idea.day,
      time: allowedHours.has(time) ? time : params.bestHours[0] ?? "11:00",
      channel: idea.channel,
      pillar: allowedPillars.has(idea.pillar) ? idea.pillar : [...allowedPillars][0],
      format: allowedFormats.has(idea.format) ? idea.format : [...allowedFormats][0],
      objective: allowedObjectives.has(idea.objective)
        ? idea.objective
        : [...allowedObjectives][0],
      idea: idea.idea,
      productName: idea.productName ?? null,
    });
  }

  if (ideas.length === 0) {
    return { ok: false, error: "La IA propuso ideas fuera de los días pedidos. Probá de nuevo." };
  }

  return { ok: true, ideas };
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

type ModelReply = { ok: true; text: string } | { ok: false; error: string };

/**
 * Single entry point to the OpenCode Go API. Returns the assistant text
 * (falling back to the reasoning trace when a GLM model burns its tokens
 * mid-thinking and leaves the final answer empty).
 */
async function callModel(
  system: string,
  user: string,
  temperature = 0.8
): Promise<ModelReply> {
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
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature,
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
        error:
          "Llegaste al límite de uso de tu plan Go por ahora. Probá de nuevo más tarde.",
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
    const text = content || reasoningTrace;
    if (!text) {
      console.error("[marketing/ai] empty model response");
      return { ok: false, error: "La IA respondió vacío. Probá de nuevo." };
    }
    return { ok: true, text };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: "La IA tardó demasiado. Probá de nuevo." };
    }
    console.error("[marketing/ai] model call failed:", error);
    return { ok: false, error: "No se pudo generar contenido (error de red)." };
  } finally {
    clearTimeout(timer);
  }
}

export async function generateCopyVariants(req: CopyRequest): Promise<CopyResult> {
  const reply = await callModel(systemPrompt(), userPrompt(req), 0.8);
  if (!reply.ok) return { ok: false, error: reply.error };

  const extracted = extractJsonArray(reply.text);
  if (!extracted) {
    console.error(
      `[marketing/ai] unparseable response (len=${reply.text.length}):`,
      String(reply.text).slice(0, 500)
    );
    return { ok: false, error: "La IA respondió en un formato inesperado. Probá de nuevo." };
  }

  const parsed = responseSchema.safeParse(extracted);
  if (!parsed.success) {
    console.error("[marketing/ai] schema mismatch:", JSON.stringify(extracted).slice(0, 600));
    return { ok: false, error: "La IA devolvió variantes incompletas. Probá de nuevo." };
  }
  return { ok: true, variants: parsed.data };
}

