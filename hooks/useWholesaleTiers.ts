"use client";

import { useEffect, useState } from "react";
import { getWholesaleTiersAction } from "@/actions/admin/content";
import { DEFAULT_WHOLESALE_TIERS, type WholesaleTier } from "@/lib/discounts";

// Owned by one module-level cache: the config rarely changes and many
// components (cards, cart, product page) share it per session.
let cache: WholesaleTier[] | null = null;
let inflight: Promise<WholesaleTier[]> | null = null;

/**
 * Server-provided seed (routed through CatalogClient): fills the shared
 * cache synchronously so cards skip the fetch entirely.
 */
export function seedWholesaleTiers(tiers: WholesaleTier[]) {
  if (!tiers || tiers.length === 0) return;
  cache = tiers;
  inflight ??= Promise.resolve(tiers);
}

/**
 * Editable volume-discount tiers for client UIs (cart, cards, nudge). Server
 * pages can seed the shared cache with `preloaded` so cards render live
 * prices on the first paint (no discount flash); while nothing else arrived
 * it returns the defaults, matching checkout until refresh.
 */
export function useWholesaleTiers(preloaded?: WholesaleTier[]): WholesaleTier[] {
  // Server-provided seed wins on the first render so cards show live prices
  // immediately; the module cache is only touched inside effects/callbacks.
  const [tiers, setTiers] = useState<WholesaleTier[]>(() => {
    if (preloaded && preloaded.length > 0) return preloaded;
    return cache ?? DEFAULT_WHOLESALE_TIERS;
  });
  const [loaded, setLoaded] = useState(() => Boolean(cache) || (preloaded && preloaded.length > 0));

  useEffect(() => {
    if (preloaded && preloaded.length > 0 && cache === null) {
      seedWholesaleTiers(preloaded);
    }
  }, [preloaded]);

  useEffect(() => {
    if (loaded) return;
    inflight ??= getWholesaleTiersAction();
    void inflight
      .then((values) => {
        cache = values;
        setTiers(values);
        setLoaded(true);
      })
      .catch(() => {
        // Keep defaults on failure: checkout recomputes server-side anyway.
        setLoaded(true);
      });
  }, [loaded]);

  return tiers;
}
