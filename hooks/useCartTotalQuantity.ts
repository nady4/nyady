"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useAppSelector } from "@/hooks/useStore";
import { getCartTotalQuantity } from "@/actions/cart";

// The Redux cart slice only tracks product ids, so this hook fetches the real
// quantities from the server and shares the total across components (catalog
// list, product page). The Redux ids act as a change signal to refetch.
let cachedUserId: string | null = null;
let cachedTotal = 0;
let inFlight: Promise<number> | null = null;
const listeners = new Set<(total: number) => void>();

function publish(total: number, userId: string) {
  cachedUserId = userId;
  cachedTotal = total;
  listeners.forEach((listener) => listener(total));
}

function fetchTotal(userId: string): Promise<number> {
  if (inFlight) return inFlight;

  inFlight = getCartTotalQuantity(userId)
    .then((total) => {
      publish(total, userId);
      return total;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export function useCartTotalQuantity(): number {
  const { data: session, status } = useSession();
  const userId =
    status === "authenticated" ? (session?.user?.id as string) : undefined;
  const cartIds = useAppSelector((state) => state.cart);
  const [total, setTotal] = useState(() =>
    userId && cachedUserId === userId ? cachedTotal : 0
  );

  useEffect(() => {
    if (!userId) {
      queueMicrotask(() => setTotal(0));
      return;
    }

    if (cachedUserId === userId) {
      queueMicrotask(() => setTotal(cachedTotal));
    }

    listeners.add(setTotal);
    fetchTotal(userId).catch(() => {});

    return () => {
      listeners.delete(setTotal);
    };
  }, [userId, cartIds]);

  return total;
}
