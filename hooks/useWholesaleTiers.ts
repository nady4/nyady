"use client";

import { useEffect, useState } from "react";
import { getWholesaleTiersAction } from "@/actions/admin/content";
import { DEFAULT_WHOLESALE_TIERS, type WholesaleTier } from "@/lib/discounts";

// Owned by one module-level cache: the config rarely changes and many
// components (cards, cart, product page) share it per session.
let cache: WholesaleTier[] | null = null;
let inflight: Promise<WholesaleTier[]> | null = null;

/**
 * Editable volume-discount tiers for client UIs (cart, cards, nudge). While
 * loading it returns the defaults, matching what checkout uses until refresh.
 */
export function useWholesaleTiers(): WholesaleTier[] {
  const [tiers, setTiers] = useState<WholesaleTier[]>(
    cache ?? DEFAULT_WHOLESALE_TIERS
  );
  const [loaded, setLoaded] = useState(cache !== null);

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
