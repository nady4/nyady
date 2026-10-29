"use client";
import { useEffect, useRef, useState } from "react";
import styles from "@/styles/Toast.module.scss";

interface ToastState {
  id: number;
  message: string;
  tone: "success" | "error";
}

interface ToastDetail {
  message: string;
  tone: "success" | "error";
}

/**
 * Global feedback pills for storefront actions (add to cart, wishlist,
 * sign-in prompts). Listens to `nyady:toast` custom events so any island
 * component can announce changes without owning DOM state.
 */
export default function Toast() {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ToastDetail>).detail;
      if (!detail?.message) return;
      counter.current += 1;
      const id = counter.current;
      setToasts((prev) => [...prev.slice(-2), { id, message: detail.message, tone: detail.tone }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3200);
    };

    window.addEventListener("nyady:toast", handler);
    return () => window.removeEventListener("nyady:toast", handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.viewport} role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${toast.tone === "error" ? styles.error : styles.success}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
