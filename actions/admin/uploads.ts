"use server";

import { ensureAdmin } from "@/lib/admin";
import { blobClientUploadStatus } from "@/lib/marketing/blob-status";
import type { AdminActionResult } from "@/types/admin";

/** Whether image uploads from the admin are configured (Blob read-write token). */
export async function getBlobUploadStatusAction(): Promise<
  AdminActionResult & { ready?: boolean }
> {
  if (!(await ensureAdmin()).ok) return { ok: false, error: "No autorizado" };
  const status = blobClientUploadStatus();
  return { ok: true, ready: status.ready, error: status.error ?? undefined };
}
