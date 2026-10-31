import prisma from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";
import { formatAdminDateTime } from "@/lib/admin/format";
import {
  PILLAR_LABELS,
  OBJECTIVE_LABELS,
  FORMAT_LABELS,
} from "@/lib/marketing/content-labels";
import {
  generateCopyVariants,
  generatePlanIdeas,
  CONTENT_PILLARS,
  CONTENT_FORMATS,
  CONTENT_OBJECTIVES,
  type CopyChannel,
} from "@/lib/marketing/ai";

/**
 * Content engine (phase 5).
 *
 * Turns "qué posteo hoy" into a repeatable loop:
 *
 *   preferencias → calendario → borrador con IA → cola de publicación
 *
 * Everything is Argentina time (ART, UTC-3) on the admin side; the publish
 * queue reads `scheduledAt` in UTC, so slots are converted here exactly
 * once (arSlotToUtc).
 */

export const ART_OFFSET_MINUTES = -180;

export {
  PILLAR_LABELS,
  OBJECTIVE_LABELS,
  FORMAT_LABELS,
  CHANNEL_LABELS,
} from "@/lib/marketing/content-labels";

// --- Argentina time helpers ----------------------------------------------------

/** "YYYY-MM-DD" of a Date in Argentina time. */
export function artDateString(date: Date): string {
  const shifted = new Date(date.getTime() + ART_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** Midnight (ART) of a "YYYY-MM-DD" as a UTC Date. */
export function artDateToUtc(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map((part) => Number(part));
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - ART_OFFSET_MINUTES * 60_000);
}

/**
 * A calendar slot in Argentina time as a UTC Date (what `scheduledAt`
 * stores). Slots outside the expected range are ignored by the caller.
 */
export function artSlotToUtc(dateStr: string, time: string): Date {
  const [year, month, day] = dateStr.split("-").map((part) => Number(part));
  const [hour, minute] = time.split(":").map((part) => Number(part));
  return new Date(
    Date.UTC(year, month - 1, day, hour, minute, 0) - ART_OFFSET_MINUTES * 60_000
  );
}

/** The 7 days (ART) starting at `startDateStr`. */
export function artWeekDays(startDateStr: string): string[] {
  const start = artDateToUtc(startDateStr);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start.getTime() + index * 24 * 60 * 60_000);
    return artDateString(day);
  });
}

// --- Preferences ---------------------------------------------------------------

export interface ContentPreferenceState {
  pillars: string[];
  formats: string[];
  objectives: string[];
  forbiddenTopics: string[];
  audience: string | null;
  defaultCta: string | null;
  postsPerWeek: number;
  bestHours: string[];
  maxPromoPerWeek: number;
}

export const DEFAULT_PREFERENCES: ContentPreferenceState = {
  pillars: ["proceso", "estilo", "prueba_social", "novedad"],
  formats: ["post", "carrusel"],
  objectives: ["alcance", "interaccion", "conversion"],
  forbiddenTopics: [],
  audience: null,
  defaultCta: null,
  postsPerWeek: 4,
  bestHours: ["11:00", "19:30"],
  maxPromoPerWeek: 1,
};

export async function loadContentPreferences(): Promise<ContentPreferenceState> {
  const row = await prisma.contentPreference
    .findUnique({ where: { id: "default" } })
    .catch(() => null);
  if (!row) return { ...DEFAULT_PREFERENCES };

  return {
    pillars: row.pillars.length ? row.pillars : DEFAULT_PREFERENCES.pillars,
    formats: row.formats.length ? row.formats : DEFAULT_PREFERENCES.formats,
    objectives: row.objectives.length ? row.objectives : DEFAULT_PREFERENCES.objectives,
    forbiddenTopics: row.forbiddenTopics,
    audience: row.audience,
    defaultCta: row.defaultCta,
    postsPerWeek: row.postsPerWeek,
    bestHours: row.bestHours.length ? row.bestHours : DEFAULT_PREFERENCES.bestHours,
    maxPromoPerWeek: row.maxPromoPerWeek,
  };
}

export interface ContentPreferenceInput {
  pillars: string[];
  formats: string[];
  objectives: string[];
  forbiddenTopics: string[];
  audience: string | null;
  defaultCta: string | null;
  postsPerWeek: number;
  bestHours: string[];
  maxPromoPerWeek: number;
}

function uniqueAllowed(
  values: string[],
  allowed: readonly string[],
  fallback: string[]
): string[] {
  const clean = values
    .map((value) => value.trim().toLowerCase())
    .filter((value) => allowed.includes(value));
  const result = [...new Set(clean)];
  return result.length ? result : fallback;
}

export async function saveContentPreferences(
  input: ContentPreferenceInput
): Promise<ContentPreferenceState> {
  const hours = input.bestHours
    .map((hour) => hour.trim())
    .filter((hour) => /^\d{2}:\d{2}$/.test(hour))
    .slice(0, 8);

  const data = {
    pillars: uniqueAllowed(input.pillars, CONTENT_PILLARS, DEFAULT_PREFERENCES.pillars),
    formats: uniqueAllowed(input.formats, CONTENT_FORMATS, DEFAULT_PREFERENCES.formats),
    objectives: uniqueAllowed(
      input.objectives,
      CONTENT_OBJECTIVES,
      DEFAULT_PREFERENCES.objectives
    ),
    forbiddenTopics: input.forbiddenTopics
      .map((topic) => topic.trim().slice(0, 60))
      .filter(Boolean)
      .slice(0, 20),
    audience: input.audience?.trim().slice(0, 400) || null,
    defaultCta: input.defaultCta?.trim().slice(0, 200) || null,
    postsPerWeek: Math.max(1, Math.min(14, Math.round(input.postsPerWeek) || 4)),
    bestHours: hours.length ? hours : DEFAULT_PREFERENCES.bestHours,
    maxPromoPerWeek: Math.max(0, Math.min(7, Math.round(input.maxPromoPerWeek) || 0)),
  };

  const row = await prisma.contentPreference.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });

  return {
    pillars: row.pillars,
    formats: row.formats,
    objectives: row.objectives,
    forbiddenTopics: row.forbiddenTopics,
    audience: row.audience,
    defaultCta: row.defaultCta,
    postsPerWeek: row.postsPerWeek,
    bestHours: row.bestHours,
    maxPromoPerWeek: row.maxPromoPerWeek,
  };
}

// --- Calendar ------------------------------------------------------------------

export interface ContentPlanRow {
  id: string;
  date: string;
  time: string;
  channel: string;
  pillar: string;
  format: string;
  objective: string;
  idea: string | null;
  productId: string | null;
  productName: string | null;
  status: string;
  postId: string | null;
  postTitle: string | null;
  postStatus: string | null;
  postScheduledAtText: string | null;
}

export async function loadContentPlan(days: string[]): Promise<ContentPlanRow[]> {
  if (days.length === 0) return [];

  const from = artDateToUtc(days[0]);
  const to = artDateToUtc(days[days.length - 1]);
  to.setTime(to.getTime() + 24 * 60 * 60_000);

  const rows = await prisma.contentPlan.findMany({
    where: { date: { gte: from, lt: to } },
    orderBy: [{ date: "asc" }, { time: "asc" }],
    include: { product: { select: { name: true } } },
  });

  // The linked draft (title/status/schedule) so the calendar shows what is
  // already written and what still needs to be approved.
  const postIds = rows
    .map((row) => row.postId)
    .filter((id): id is string => Boolean(id));
  const posts = postIds.length
    ? await prisma.socialPost.findMany({
        where: { id: { in: postIds } },
        select: { id: true, title: true, status: true, scheduledAt: true },
      })
    : [];
  const postById = new Map(posts.map((post) => [post.id, post]));

  return rows.map((row) => {
    const post = row.postId ? postById.get(row.postId) : undefined;
    return {
      id: row.id,
      date: artDateString(row.date),
      time: row.time,
      channel: row.channel,
      pillar: row.pillar,
      format: row.format,
      objective: row.objective,
      idea: row.idea,
      productId: row.productId,
      productName: row.product?.name ?? null,
      status: row.status,
      postId: row.postId,
      postTitle: post?.title ?? null,
      postStatus: post?.status ?? null,
      postScheduledAtText: post?.scheduledAt
        ? formatAdminDateTime(post.scheduledAt)
        : null,
    };
  });
}

export interface ContentPlanInput {
  date: string;
  time: string;
  channel: string;
  pillar: string;
  format: string;
  objective: string;
  idea: string | null;
  productId: string | null;
}

export async function createContentPlan(input: ContentPlanInput): Promise<string> {
  const date = artDateToUtc(input.date);
  const plan = await prisma.contentPlan.create({
    data: {
      date,
      time: input.time,
      channel: input.channel,
      pillar: input.pillar,
      format: input.format,
      objective: input.objective,
      idea: input.idea?.trim().slice(0, 300) || null,
      productId: input.productId || null,
      status: "planned",
    },
  });
  return plan.id;
}

export async function deleteContentPlan(id: string): Promise<void> {
  await prisma.contentPlan.delete({ where: { id } });
}

/**
 * Marks every draft generated for a plan as ready so the queue publishes it.
 * `planIds` are ContentPlan ids (not post ids).
 */
export async function approvePlanDrafts(planIds: string[]): Promise<number> {
  const plans = await prisma.contentPlan.findMany({
    where: { id: { in: planIds }, postId: { not: null } },
    select: { postId: true },
  });
  const postIds = plans
    .map((plan) => plan.postId)
    .filter((id): id is string => Boolean(id));
  if (postIds.length === 0) return 0;

  const posts = await prisma.socialPost.findMany({
    where: { id: { in: postIds } },
    select: { id: true, status: true },
  });
  const draftIds = posts.filter((post) => post.status !== "ready").map((post) => post.id);
  if (draftIds.length === 0) return 0;

  await prisma.socialPost.updateMany({
    where: { id: { in: draftIds } },
    data: { status: "ready" },
  });
  await prisma.contentPlan.updateMany({
    where: { postId: { in: draftIds } },
    data: { status: "draft" },
  });
  return draftIds.length;
}

// --- Generation ----------------------------------------------------------------

interface PlanProduct {
  name: string;
  slug: string;
  price: number;
  category: string;
  colors: string[];
  sizes: string[];
  description: string | null;
  photo: string;
  photoUrls: string[];
}

/** Builds the media list for a generated post (cover first, max 10). */
function buildMedia(product: PlanProduct | null, format: string): string[] {
  if (!product) return [];
  if (format === "reel" || format === "historia") {
    return product.photo ? [product.photo] : [];
  }
  const media = [product.photo, ...product.photoUrls].filter(
    (url): url is string => typeof url === "string" && url.length > 0
  );
  return [...new Set(media)].slice(0, 10);
}

function channelsFromPlan(channel: string): CopyChannel[] {
  if (channel === "facebook") return ["facebook"];
  if (channel === "instagram") return ["instagram"];
  return ["facebook", "instagram"];
}

/**
 * Generates the copy of one planned slot and stores it as a SocialPost draft.
 * Returns the created post id.
 */
async function generateDraftForPlan(
  plan: {
    id: string;
    date: Date;
    time: string;
    channel: string;
    pillar: string;
    format: string;
    objective: string;
    idea: string | null;
    productId: string | null;
  },
  preferences: ContentPreferenceState
): Promise<{ ok: boolean; postId?: string; error?: string }> {
  const settings = await prisma.marketingSettings.findUnique({
    where: { id: "default" },
  });

  let product: PlanProduct | null = null;
  if (plan.productId) {
    const row = await prisma.product.findUnique({
      where: { id: plan.productId },
      select: {
        name: true,
        slug: true,
        price: true,
        category: true,
        colors: true,
        sizes: true,
        description: true,
        photo: true,
        photos: true,
      },
    });
    if (row) {
      const perColor = (row.photos ?? null) as Record<string, string[]> | null;
      const photoUrls = perColor ? Object.values(perColor).flat() : [];
      product = {
        name: row.name,
        slug: row.slug,
        price: row.price.toNumber(),
        category: row.category,
        colors: row.colors,
        sizes: row.sizes,
        description: row.description,
        photo: row.photo,
        photoUrls,
      };
    }
  }

  const briefParts = [plan.idea ?? ""];
  if (preferences.audience) briefParts.push(`Audiencia: ${preferences.audience}`);
  briefParts.push(
    `Pilar: ${PILLAR_LABELS[plan.pillar] ?? plan.pillar}. Objetivo: ${
      OBJECTIVE_LABELS[plan.objective] ?? plan.objective
    }. Formato: ${FORMAT_LABELS[plan.format] ?? plan.format}.`
  );

  const result = await generateCopyVariants({
    brandVoice: settings?.brandVoice ?? null,
    defaultHashtags: settings?.defaultHashtags ?? [],
    manualBrief: briefParts.filter(Boolean).join("\n").slice(0, 800),
    tone: plan.objective === "conversion" ? 2 : plan.objective === "alcance" ? 1 : 0,
    channels: channelsFromPlan(plan.channel),
    siteUrl: getSiteUrl(),
    instagramHandle: settings?.instagramHandle ?? null,
    product: product
      ? {
          name: product.name,
          slug: product.slug,
          price: product.price,
          category: product.category,
          colors: product.colors,
          sizes: product.sizes,
          description: product.description,
        }
      : null,
    pillar: plan.pillar,
    objective: plan.objective,
    format: plan.format,
    audience: preferences.audience,
    forbiddenTopics: preferences.forbiddenTopics,
    defaultCta: preferences.defaultCta,
  });

  if (!result.ok || !result.variants || result.variants.length === 0) {
    return { ok: false, error: result.error ?? "La IA no devolvió variantes" };
  }

  const variant = result.variants[0];
  const body = [variant.hook, variant.body, variant.cta || preferences.defaultCta]
    .filter((part) => part && part.trim())
    .join("\n\n");

  const title = [
    PILLAR_LABELS[plan.pillar] ?? plan.pillar,
    product ? product.name : "marca",
  ].join(" · ");

  const post = await prisma.socialPost.create({
    data: {
      title: title.slice(0, 120),
      body: body.slice(0, 4000),
      hashtags: variant.hashtags.slice(0, 30),
      channels: channelsFromPlan(plan.channel),
      media: buildMedia(product, plan.format),
      productId: plan.productId || null,
      // The campaign is the attribution key (utm_campaign), so posts land in
      // the funnel grouped by pillar.
      campaign: `auto-${plan.pillar}`,
      status: "draft",
      scheduledAt: artSlotToUtc(artDateString(plan.date), plan.time),
    },
  });

  await prisma.contentPlan.update({
    where: { id: plan.id },
    data: { postId: post.id, status: "draft" },
  });

  return { ok: true, postId: post.id };
}

/**
 * Generates drafts for the given plans (or every planned slot of the week).
 * Slots that already have a post are skipped.
 */
export async function generateDraftsForPlans(
  planIds: string[]
): Promise<{ created: number; skipped: number; errors: string[] }> {
  const preferences = await loadContentPreferences();
  const plans = await prisma.contentPlan.findMany({
    where: { id: { in: planIds }, postId: null },
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const plan of plans) {
    const result = await generateDraftForPlan(plan, preferences);
    if (result.ok) {
      created += 1;
    } else {
      errors.push(`${plan.pillar}/${plan.time}: ${result.error ?? "error"}`);
    }
  }

  skipped = planIds.length - plans.length;
  return { created, skipped, errors };
}

/**
 * Asks the AI for a week of content and stores it as planned slots.
 * Existing slots are not duplicated.
 */
export async function generateIdeasForWeek(
  startDateStr: string
): Promise<{ created: number; error?: string }> {
  const days = artWeekDays(startDateStr);
  const preferences = await loadContentPreferences();
  const settings = await prisma.marketingSettings.findUnique({
    where: { id: "default" },
  });

  const products = await prisma.product.findMany({
    where: { archivedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 40,
    select: { name: true, category: true },
  });

  const result = await generatePlanIdeas({
    days,
    pillars: preferences.pillars,
    formats: preferences.formats,
    objectives: preferences.objectives,
    bestHours: preferences.bestHours,
    audience: preferences.audience,
    brandVoice: settings?.brandVoice ?? null,
    forbiddenTopics: preferences.forbiddenTopics,
    products,
    postsPerWeek: preferences.postsPerWeek,
  });

  if (!result.ok || !result.ideas) {
    return { created: 0, error: result.error ?? "La IA no devolvió ideas" };
  }

  const productByName = new Map(products.map((product) => [product.name, product]));

  let created = 0;
  for (const idea of result.ideas) {
    const existing = await prisma.contentPlan.findFirst({
      where: { date: artDateToUtc(idea.day), time: idea.time },
      select: { id: true },
    });
    if (existing) continue;

    const product = idea.productName ? productByName.get(idea.productName) : undefined;
    const productRow = product
      ? await prisma.product.findFirst({
          where: { name: idea.productName ?? undefined },
          select: { id: true },
        })
      : null;

    await prisma.contentPlan.create({
      data: {
        date: artDateToUtc(idea.day),
        time: idea.time,
        channel: idea.channel,
        pillar: idea.pillar,
        format: idea.format,
        objective: idea.objective,
        idea: idea.idea,
        productId: productRow?.id ?? null,
        status: "planned",
      },
    });
    created += 1;
  }

  return { created };
}
