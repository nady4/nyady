"use client";
import {
  getNextWholesaleTier,
  getWholesaleDiscountPercent
} from "@/lib/discounts";
import "@/styles/WholesaleNudge.scss";

interface WholesaleNudgeProps {
  totalQuantity: number;
  // The cart and product page hide the "10% REVENDEDORA aplicado" line (the
  // discount is already visible in their prices); catalog keeps it.
  showRevendedoraApplied?: boolean;
}

const unitsText = (n: number) => `${n} ${n === 1 ? "unidad" : "unidades"}`;

export default function WholesaleNudge({
  totalQuantity,
  showRevendedoraApplied = false
}: WholesaleNudgeProps) {
  const wholesalePercent = getWholesaleDiscountPercent(totalQuantity);
  const nextTier = getNextWholesaleTier(totalQuantity);
  const showAppliedLine =
    wholesalePercent === 20 ||
    (wholesalePercent === 10 && showRevendedoraApplied);

  return (
    <div className={`wholesale-nudge${wholesalePercent > 0 ? " applied" : ""}`}>
      <p className="nudge-text">
        {showAppliedLine ? (
          <>
            <span className="nudge-check">✓</span>{" "}
            <strong>
              Descuento del {wholesalePercent}% aplicado<br></br>
            </strong>
            {nextTier ? (
              <>
                Te falta{nextTier.unitsNeeded === 1 ? "" : "n"}{" "}
                <strong>{unitsText(nextTier.unitsNeeded)}</strong> para el{" "}
                <strong>{nextTier.percent}%</strong> ({nextTier.label})
              </>
            ) : (
              " Alcanzaste el máximo descuento por cantidad"
            )}
          </>
        ) : (
          nextTier && (
            <>
              Te falta{nextTier.unitsNeeded === 1 ? "" : "n"}{" "}
              <strong>{unitsText(nextTier.unitsNeeded)}</strong> para el{" "}
              <strong>{nextTier.percent}%</strong> de descuento ({nextTier.label}
              )
            </>
          )
        )}
      </p>
      {nextTier && (
        <div className="nudge-progress">
          <div
            className="nudge-progress-fill"
            style={{
              width: `${Math.min(100, (totalQuantity / nextTier.units) * 100)}%`
            }}
          />
        </div>
      )}
    </div>
  );
}
