"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getUserAddress } from "@/actions/address";
import {
  quoteShippingToAddress,
  ShippingQuoteItem,
  AddressType
} from "@/actions/shipping";
import {
  getDeliveryWindow,
  getEstimateQuotes,
  getFastestQuote,
  PACKAGE_ONE_PAIR
} from "@/lib/shipping";
import "@/styles/ProductShippingEstimate.scss";

interface ProductShippingEstimateProps {
  productName: string;
  price: number;
}

type Phase = "idle" | "loading" | "ready" | "no-address" | "error";

export default function ProductShippingEstimate({
  productName,
  price
}: ProductShippingEstimateProps) {
  const { status, data: session } = useSession();
  const userId = session?.user?.id;

  const [phase, setPhase] = useState<Phase>("idle");
  const [deliveryWindow, setDeliveryWindow] = useState<{
    min: string;
    max: string;
  } | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !userId) return;

    let cancelled = false;

    async function loadEstimate() {
      setPhase("loading");
      try {
        const addr = await getUserAddress();
        if (cancelled) return;

        if (!addr) {
          setPhase("no-address");
          return;
        }

        const address: AddressType = {
          id: addr.id,
          street: addr.street,
          city: addr.city,
          state: addr.state,
          postalCode: addr.postalCode
        };

        // Same standard package (one pair, its box) the cart quotes with, so
        // the estimate matches checkout. A single item is representative
        // enough for a delivery-time window.
        const items: ShippingQuoteItem[] = [
          {
            ...PACKAGE_ONE_PAIR,
            description: productName
          }
        ];

        const result = await quoteShippingToAddress(address, items, price);
        if (cancelled) return;

        const fastest = getFastestQuote(
          getEstimateQuotes(result?.all_results ?? [])
        );

        if (!fastest) {
          setPhase("error");
          return;
        }

        setDeliveryWindow(
          getDeliveryWindow(fastest.delivery_time.estimated_delivery)
        );
        setPhase("ready");
      } catch {
        if (!cancelled) setPhase("error");
      }
    }

    loadEstimate();

    return () => {
      cancelled = true;
    };
  }, [status, userId, productName, price]);

  if (status === "loading") return null;

  if (status !== "authenticated") {
    return (
      <div className="product-shipping-estimate">
        <Link href="/signin" className="estimate-action">
          Iniciá sesión para calcular el envío
        </Link>
      </div>
    );
  }

  if (phase === "idle" || phase === "loading") {
    return (
      <div className="product-shipping-estimate">
        <p className="estimate-muted">Calculando envío...</p>
      </div>
    );
  }

  if (phase === "no-address") {
    return (
      <div className="product-shipping-estimate">
        <Link href="/address" className="estimate-action">
          Agregar dirección de envío
        </Link>
      </div>
    );
  }

  if (phase === "error" || !deliveryWindow) {
    return (
      <div className="product-shipping-estimate">
        <p className="estimate-muted">No se pudo calcular el envío</p>
      </div>
    );
  }

  return (
    <div className="product-shipping-estimate">
      <p className="estimate-window">
        <Image src="/assets/icons/truck.svg" alt="" width={18} height={18} />
        Entrega estimada: {deliveryWindow.min} - {deliveryWindow.max}
      </p>
    </div>
  );
}
