import { getSiteUrl } from "@/lib/site-url";

/**
 * Meta Graph API client for the marketing section:
 * - OAuth (Facebook Login for Business) to connect the NYADY Page + linked
 *   Instagram business account (both owned by the admin → no App Review
 *   needed while the app runs in development mode).
 * - Publishing: FB photo/feed posts and IG single-image/carousel posts via
 *   the container → media_publish flow (with status polling).
 *
 * Only page-scoped, non-expiring tokens derived from a long-lived user token
 * are stored (AES-encrypted via lib/marketing/crypto.ts).
 */

export const SCOPE = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
].join(",");

const API_VERSION = process.env.META_API_VERSION ?? "v26.0";
const GRAPH = `https://graph.facebook.com/${API_VERSION}`;

export interface MetaTokenRow {
  id: string;
  name: string;
  access_token: string;
  tasks?: string[];
  instagram_business_account?: { id: string; username?: string } | null;
}

interface GraphErrorShape {
  error?: { message?: string; code?: number; error_subcode?: number };
}

export interface IgBusiness {
  id: string;
  username: string | null;
}

export class MetaError extends Error {
  code?: number;
  subcode?: number;

  constructor(message: string, code?: number, subcode?: number) {
    super(message);
    this.name = "MetaError";
    this.code = code;
    this.subcode = subcode;
  }
}

function metaGraphUrl(versionedPath: string, params?: URLSearchParams): string {
  const url = new URL(`${GRAPH}/${versionedPath}`);
  if (params) {
    for (const [k, v] of params) url.searchParams.set(k, v);
  }
  return url.toString();
}

async function metaFetch(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 30_000);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    let json: GraphErrorShape | null = null;
    try {
      json = (await res.json()) as GraphErrorShape;
    } catch {
      // non-JSON body
    }
    if (!res.ok) {
      const raw =
        json?.error?.message ??
        `${res.status} ${res.statusText || "(sin cuerpo)"}`;
      throw new MetaError(
        `Meta respondió HTTP ${res.status}: ${raw}`,
        json?.error?.code,
        json?.error?.error_subcode
      );
    }
    if (json?.error) {
      throw new MetaError(
        json.error.message ?? "Error de la API de Meta",
        json.error.code,
        json.error.error_subcode
      );
    }
    return json;
  } catch (error) {
    if (error instanceof MetaError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new MetaError("La API de Meta tardó demasiado. Probá de nuevo.");
    }
    throw new MetaError(
      error instanceof Error ? error.message : "Error de red hablando con Meta"
    );
  } finally {
    clearTimeout(timer);
  }
}

// --- OAuth -------------------------------------------------------------------

export function isMetaConfigured(): boolean {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

export function buildOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID ?? "",
    redirect_uri: `${getSiteUrl()}/api/admin/marketing/meta/callback`,
    state,
    response_type: "code",
    scope: SCOPE,
    display: "popup",
  });
  return `https://www.facebook.com/${API_VERSION}/dialog/oauth?${params}`;
}

export interface ConnectedMeta {
  pageId: string;
  pageName: string;
  pageToken: string;
  ig: IgBusiness | null;
}

/**
 * Full connect flow: code → short-lived user token → long-lived user token →
 * pages → pick the first manageable page → probe the linked IG business
 * account. The admin owns these assets, so no App Review is required in
 * development mode.
 */
export async function completeMetaConnect(code: string): Promise<ConnectedMeta> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new MetaError("Falta META_APP_ID / META_APP_SECRET");
  }

  const shortTokenUrl = metaGraphUrl("oauth/access_token", new URLSearchParams({
    client_id: appId,
    redirect_uri: `${getSiteUrl()}/api/admin/marketing/meta/callback`,
    client_secret: appSecret,
    code,
  }));
  const shortJson = (await metaFetch(shortTokenUrl)) as { access_token?: string };
  const shortToken = shortJson.access_token;
  if (!shortToken) throw new MetaError("Meta no devolvió el token inicial");

  const longJson = (await metaFetch(
    metaGraphUrl("oauth/access_token", new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortToken,
    }))
  )) as { access_token?: string };
  const longToken = longJson.access_token ?? shortToken;

  // One call resolves pages AND their linked Instagram business account, so
  // the callback flow needs no follow-up probe.
  const pagesJson = (await metaFetch(
    metaGraphUrl("me/accounts", new URLSearchParams({
      access_token: longToken,
      fields:
        "id,name,access_token,tasks,instagram_business_account{id,username}",
    }))
  )) as { data?: (MetaTokenRow & { instagram_business_account?: IgBusiness | null })[] };
  const rawPages = pagesJson.data ?? [];
  const pages = rawPages.filter(
    (page) => !page.tasks || page.tasks.includes("CREATE_CONTENT")
  );

  /**
   * Standalone IG probe (kept for callers that pass a page token directly).
   */
  if (pages.length === 0) {
    // FB4B quirk resolver: when /me/accounts comes back empty even though the
    // user granted assets in the picker, inspect the token itself via
    // /debug_token (app access token) — granular_scopes carry the granted
    // page ids. If a page id is there, the page can usually still be fetched
    // directly with the user token (id, name, access_token, IG), and the
    // connect completes with that page token instead of failing.
    const appId = process.env.META_APP_ID ?? "";
    const appSecret = process.env.META_APP_SECRET ?? "";
    const debugInfo: string[] = [];
    let granularPageIds: string[] = [];
    try {
      const appToken = `${appId}|${appSecret}`;
      const debugJson = (await metaFetch(
        metaGraphUrl("debug_token", new URLSearchParams({
          input_token: longToken,
          access_token: appToken,
          fields: "scopes,granular_scopes,profile_id,token_type",
        }))
      )) as {
        data?: {
          scopes?: string[];
          granular_scopes?: { scope: string; target_ids?: string[] }[];
          profile_id?: string;
          token_type?: string;
        };
      };
      const debugData = debugJson.data ?? {};
      granularPageIds = (debugData.granular_scopes ?? [])
        .filter(
          (gs) =>
            gs.scope === "pages_show_list" ||
            gs.scope === "pages_manage_posts" ||
            gs.scope === "pages_read_engagement"
        )
        .flatMap((gs) => gs.target_ids ?? []);
      debugInfo.push(
        `token_type=${debugData.token_type ?? "?"}`,
        `scopes=${(debugData.scopes ?? []).join("/")}`,
        `grant_id=${debugData.profile_id ?? "?"}`,
        granularPageIds.length > 0
          ? `páginas en scopes granulares: ${granularPageIds.join(",")}`
          : "sin páginas en scopes granulares"
      );
    } catch (error) {
      debugInfo.push(
        `debug_token falló: ${error instanceof Error ? error.message.slice(0, 120) : "?"}`
      );
    }

    // Direct fetch fallback for every page id the granular scopes mention.
    for (const pageId of granularPageIds.slice(0, 5)) {
      try {
        const pageJson = (await metaFetch(
          metaGraphUrl(pageId, new URLSearchParams({
            access_token: longToken,
            fields:
              "id,name,access_token,tasks,instagram_business_account{id,username}",
          }))
        )) as MetaTokenRow & {
          instagram_business_account?: IgBusiness | null;
        };
        if (pageJson.access_token) {
          return {
            pageId: pageJson.id,
            pageName: pageJson.name,
            pageToken: pageJson.access_token,
            ig: pageJson.instagram_business_account ?? null,
          };
        }
      } catch (error) {
        debugInfo.push(
          `fetch directo de ${pageId} falló: ${
            error instanceof Error ? error.message.slice(0, 120) : "?"
          }`
        );
      }
    }

    const summary =
      rawPages.length === 0
        ? `/me/accounts devolvió 0 páginas para este perfil (${debugInfo.join(" · ")}). En el selector de activos del login hay que DEJAR TILDADAS la Página (y el Instagram); si se destildó la página o solo se tildó el Instagram, /me/accounts queda vacío — reconectá e incluí la Página \`ny4dy\`.`
        : `${rawPages.length} página(s) sin tarea CREATE_CONTENT: ${rawPages
            .slice(0, 8)
            .map(
              (page) =>
                `${page.name} (id ${page.id}, tareas: ${
                  page.tasks?.join("/") ?? "ninguna"
                })`
            )
            .join(" · ")}`;
    throw new MetaError(
      `No se encontró una Página de Facebook donde puedas publicar (tarea CREATE_CONTENT). ${summary}`
    );
  }
  const page = pages[0];

  // instagram_business_account came in the same /me/accounts payload; only
  // fall back to a dedicated probe when the combined field was absent.
  const ig = page.instagram_business_account ?? (await fetchIgBusiness(page.id, page.access_token));

  return {
    pageId: page.id,
    pageName: page.name,
    pageToken: page.access_token,
    ig,
  };
}

export async function fetchIgBusiness(
  pageId: string,
  pageToken: string
): Promise<IgBusiness | null> {
  try {
    const json = (await metaFetch(
      metaGraphUrl(pageId, new URLSearchParams({
        access_token: pageToken,
        fields: "instagram_business_account{id,username}",
      }))
    )) as {
      instagram_business_account?: { id: string; username?: string } | null;
    };
    const ig = json.instagram_business_account;
    if (!ig) return null;
    return { id: ig.id, username: ig.username ?? null };
  } catch (error) {
    console.error("[meta] ig probe failed:", error);
    return null;
  }
}

// --- Publisher ---------------------------------------------------------------

export interface MetaPublishResult {
  id: string;
  permalink?: string;
}

function isCaptionTooLong(captionLength: number): boolean {
  return captionLength > 2200;
}

export interface FacebookPostInput {
  pageId: string;
  pageToken: string;
  message: string;
  imageUrl: string | null;
  link: string | null;
}

/** FB: photo post when there's an image (caption text), else a link/text feed post. */
export async function publishFacebookPost(
  input: FacebookPostInput
): Promise<MetaPublishResult> {
  const { pageId, pageToken, message, imageUrl, link } = input;
  if (message.length > 5000) {
    throw new MetaError(
      "El copy supera los 5000 caracteres de Facebook; acortalo y guardá el post"
    );
  }

  if (imageUrl) {
    const json = (await metaFetch(
      metaGraphUrl(`${pageId}/photos`),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: imageUrl,
          caption: message,
          access_token: pageToken,
        }),
      }
    )) as { post_id?: string; id?: string };
    const id = json.post_id ?? json.id;
    if (!id) throw new MetaError("Meta no devolvió el id del posteo de Facebook");
    return { id, permalink: facebookPermalink(pageId, id) };
  }

  const params = new URLSearchParams({ message, access_token: pageToken });
  if (link) params.set("link", link);
  const json = (await metaFetch(
    metaGraphUrl(`${pageId}/feed`),
    {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: params.toString(),
    }
  )) as { id?: string };
  if (!json.id) throw new MetaError("Meta no devolvió el id del posteo de Facebook");
  return { id: json.id, permalink: facebookPermalink(pageId, json.id) };
}

export function facebookPermalink(pageId: string, postId: string): string {
  // Post ids look like "<page>_<post>"; FB links support the short verb form.
  return `https://www.facebook.com/${postId}/`;
}

export interface InstagramPostInput {
  igUserId: string;
  pageToken: string;
  imageUrls: string[];
  caption: string;
}

/**
 * IG: single image or carousel (≤10). Two-step container flow with a bounded
 * status poll (containers can take a few seconds to become publishable).
 */
export async function publishInstagramPost(
  input: InstagramPostInput
): Promise<MetaPublishResult> {
  const { igUserId, pageToken, imageUrls, caption } = input;
  if (imageUrls.length === 0) {
    throw new MetaError("El post de Instagram necesita al menos una imagen");
  }
  if (imageUrls.length > 10) {
    throw new MetaError("Máximo 10 imágenes por carrusel de Instagram");
  }
  if (isCaptionTooLong(caption.length)) {
    throw new MetaError(
      "El caption de Instagram supera 2200 caracteres; acortalon y guardá el post"
    );
  }
  for (const url of imageUrls) {
    if (!/^https:\/\//.test(url)) {
      throw new MetaError(
        "Las imágenes de Instagram deben ser URLs https públicas (subilas al Blob o pegá una URL https)"
      );
    }
  }

  const creationId = await createIgContainer(
    igUserId,
    pageToken,
    caption,
    imageUrls
  );
  await pollIgContainer(creationId, pageToken);

  const publishJson = (await metaFetch(metaGraphUrl(`${igUserId}/media_publish`), {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: new URLSearchParams({
      creation_id: creationId,
      access_token: pageToken,
    }).toString(),
  })) as { id?: string };
  if (!publishJson.id) {
    throw new MetaError("Meta no devolvió el id del posteo de Instagram");
  }

  let permalink: string | undefined;
  try {
    const media = (await metaFetch(
      metaGraphUrl(publishJson.id, new URLSearchParams({
        fields: "permalink",
        access_token: pageToken,
      }))
    )) as { permalink?: string };
    permalink = media.permalink;
  } catch (error) {
    console.error("[meta] ig permalink fetch failed:", error);
  }

  return { id: publishJson.id, permalink };
}

async function createIgContainer(
  igUserId: string,
  pageToken: string,
  caption: string,
  imageUrls: string[]
): Promise<string> {
  // Single image: one container with image_url + caption.
  if (imageUrls.length === 1) {
    const json = (await metaFetch(metaGraphUrl(`${igUserId}/media`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrls[0],
        caption,
        access_token: pageToken,
      }),
    })) as { id?: string };
    if (!json.id) throw new MetaError("Meta no creó el contenedor de Instagram");
    return json.id;
  }

  // Carousel: create child containers first, then the parent with children.
  const children: string[] = [];
  for (const url of imageUrls) {
    const json = (await metaFetch(metaGraphUrl(`${igUserId}/media`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: url,
        is_carousel_item: true,
        access_token: pageToken,
      }),
      timeoutMs: 45_000,
    })) as { id?: string };
    if (!json.id) {
      throw new MetaError("Meta no creó los ítems del carrusel de Instagram");
    }
    children.push(json.id);
  }

  const json = (await metaFetch(metaGraphUrl(`${igUserId}/media`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "CAROUSEL",
      children: children.join(","),
      caption,
      access_token: pageToken,
    }),
  })) as { id?: string };
  if (!json.id) throw new MetaError("Meta no creó el contenedor del carrusel");
  return json.id;
}

async function pollIgContainer(
  containerId: string,
  pageToken: string
): Promise<void> {
  const deadline = Date.now() + 75_000;
  while (Date.now() < deadline) {
    const json = (await metaFetch(
      metaGraphUrl(containerId, new URLSearchParams({
        fields: "status_code",
        access_token: pageToken,
      }))
    )) as { status_code?: string };
    const status = json.status_code;
    if (status === "FINISHED") return;
    if (status === "ERROR" || status === "EXPIRED") {
      throw new MetaError(
        "El contenedor de Instagram falló al procesarse (ERROR/EXPIRED); reintentá"
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new MetaError(
    "Instagram sigue procesando la imagen (tarda más de lo normal). Reintentá en un rato."
  );
}
