"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { ensureAdmin } from "@/lib/admin";
import {
  approvePlanDrafts,
  createContentPlan,
  deleteContentPlan,
  generateDraftsForPlans,
  generateIdeasForWeek,
  loadContentPreferences,
  saveContentPreferences,
  type ContentPreferenceInput,
} from "@/lib/marketing/content-planner";
import {
  loadReferralCandidates,
  makeReferralCode,
} from "@/lib/marketing/referrals";
import type { AdminActionResult } from "@/types/admin";

/**
 * Admin actions for the content engine (phase 5): preferences, editorial
 * calendar, automatic draft generation and the referral program.
 */

function revalidateMarketing() {
  revalidatePath("/admin");
  revalidatePath("/admin/marketing");
  revalidatePath("/admin/marketing/calendario");
  revalidatePath("/admin/marketing/referidos");
}

// --- Preferences ---------------------------------------------------------------

export async function saveContentPreferencesAction(
  input: ContentPreferenceInput
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };

  try {
    await saveContentPreferences(input);
    revalidateMarketing();
    return { ok: true };
  } catch (error) {
    console.error("[admin/planner] save preferences failed:", error);
    return { ok: false, error: "No se pudieron guardar las preferencias" };
  }
}

export async function loadContentPreferencesAction() {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };
  return { ok: true, preferences: await loadContentPreferences() };
}

// --- Calendar ------------------------------------------------------------------

export interface ContentPlanActionInput {
  date: string;
  time: string;
  channel: string;
  pillar: string;
  format: string;
  objective: string;
  idea: string | null;
  productId: string | null;
}

export async function createContentPlanAction(
  input: ContentPlanActionInput
): Promise<AdminActionResult & { planId?: string }> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return { ok: false, error: "Fecha inválida" };
  }
  if (!/^\d{2}:\d{2}$/.test(input.time)) {
    return { ok: false, error: "Hora inválida" };
  }

  try {
    const planId = await createContentPlan(input);
    revalidateMarketing();
    return { ok: true, planId };
  } catch (error) {
    console.error("[admin/planner] create plan failed:", error);
    return { ok: false, error: "No se pudo crear la pieza del plan" };
  }
}

export async function deleteContentPlanAction(
  planId: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };
  try {
    await deleteContentPlan(planId);
    revalidateMarketing();
    return { ok: true };
  } catch (error) {
    console.error("[admin/planner] delete plan failed:", error);
    return { ok: false, error: "No se pudo eliminar la pieza del plan" };
  }
}

export async function generateContentIdeasAction(
  startDate: string
): Promise<AdminActionResult & { created?: number }> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return { ok: false, error: "Fecha de inicio inválida" };
  }

  try {
    const outcome = await generateIdeasForWeek(startDate);
    if (outcome.error) return { ok: false, error: outcome.error };
    revalidateMarketing();
    return { ok: true, created: outcome.created };
  } catch (error) {
    console.error("[admin/planner] generate ideas failed:", error);
    return { ok: false, error: "No se pudieron generar las ideas" };
  }
}

export async function generatePlanDraftsAction(
  planIds: string[]
): Promise<AdminActionResult & { created?: number; skipped?: number; errors?: string[] }> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };
  if (planIds.length === 0) {
    return { ok: false, error: "No hay piezas del plan para generar" };
  }

  try {
    const outcome = await generateDraftsForPlans(planIds);
    revalidateMarketing();
    if (outcome.created === 0 && outcome.errors.length > 0) {
      return {
        ok: false,
        error: outcome.errors[0],
        created: 0,
        skipped: outcome.skipped,
        errors: outcome.errors,
      };
    }
    return {
      ok: true,
      created: outcome.created,
      skipped: outcome.skipped,
      errors: outcome.errors,
    };
  } catch (error) {
    console.error("[admin/planner] generate drafts failed:", error);
    return { ok: false, error: "No se pudieron generar los borradores" };
  }
}

export async function approvePlanDraftsAction(
  planIds: string[]
): Promise<AdminActionResult & { approved?: number }> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };
  if (planIds.length === 0) {
    return { ok: false, error: "No hay piezas para aprobar" };
  }

  try {
    const approved = await approvePlanDrafts(planIds);
    revalidateMarketing();
    return { ok: true, approved };
  } catch (error) {
    console.error("[admin/planner] approve drafts failed:", error);
    return { ok: false, error: "No se pudieron aprobar los borradores" };
  }
}

// --- Referral program ----------------------------------------------------------

export interface GenerateReferralCodesInput {
  /** Percentage discount the referred buyer gets (5-30%). */
  discountPercent: number;
  /** How many top customers get a code. */
  count: number;
  /** Campaign tag used in the share links (attribution key). */
  campaign: string | null;
  /** Optional expiry (days). */
  expiresInDays: number | null;
}

export async function generateReferralCodesAction(
  input: GenerateReferralCodesInput
): Promise<AdminActionResult & { codes?: { code: string; owner: string }[] }> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };

  const percent = Math.round(input.discountPercent);
  if (!Number.isFinite(percent) || percent < 5 || percent > 30) {
    return { ok: false, error: "El descuento debe estar entre 5% y 30%" };
  }

  const count = Math.max(1, Math.min(50, Math.round(input.count) || 10));
  const campaign = input.campaign?.trim().slice(0, 60) || "referidos";
  const expiresAt =
    input.expiresInDays && input.expiresInDays > 0
      ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60_000)
      : null;

  try {
    const candidates = await loadReferralCandidates(count);
    if (candidates.length === 0) {
      return {
        ok: false,
        error: "No hay clientes con compras aprobadas para asignar códigos",
      };
    }

    const created: { code: string; owner: string }[] = [];
    for (const candidate of candidates) {
      let code = makeReferralCode(candidate.username);
      // Extremely unlikely, but a duplicate code would break the coupon
      // lookup — retry with a new suffix.
      let attempts = 0;
      while (attempts < 5) {
        const exists = await prisma.coupon.findUnique({
          where: { code },
          select: { id: true },
        });
        if (!exists) break;
        code = makeReferralCode(candidate.username + attempts);
        attempts += 1;
      }

      await prisma.coupon.create({
        data: {
          code,
          type: "PERCENT",
          value: percent,
          active: true,
          onePerUser: true,
          usageLimit: 10,
          expiresAt,
          isReferral: true,
          referrerUserId: candidate.userId,
          referrerName: candidate.username,
          sourceCampaign: campaign,
        },
      });
      created.push({ code, owner: candidate.username });
    }

    revalidateMarketing();
    return { ok: true, codes: created };
  } catch (error) {
    console.error("[admin/referrals] generate codes failed:", error);
    return { ok: false, error: "No se pudieron generar los códigos" };
  }
}

export async function deleteReferralCodeAction(
  code: string
): Promise<AdminActionResult> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };

  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, error: "Código inválido" };

  try {
    // Deactivate instead of delete: past orders keep referencing the code.
    await prisma.coupon.updateMany({
      where: { code: normalized, isReferral: true },
      data: { active: false },
    });
    revalidateMarketing();
    return { ok: true };
  } catch (error) {
    console.error("[admin/referrals] disable code failed:", error);
    return { ok: false, error: "No se pudo desactivar el código" };
  }
}
