"use client";
import {
  getNextWholesaleTier,
  getWholesaleDiscountPercent
} from "@/lib/discounts";
import "@/styles/WholesaleNudge.scss";

interface WholesaleNudgeProps {
  totalQuantity: number;
}

const unitsText = (n: number) => `${n} ${n === 1 ? "unidad" : "unidades"}`;

export default function WholesaleNudge({ totalQuantity }: WholesaleNudgeProps) {
  const wholesalePercent = getWholesaleDiscountPercent(totalQuantity);
  const nextTier = getNextWholesaleTier(totalQuantity);
  const appliedTierLabel =
    wholesalePercent === 20 ? "MAYORISTA" : "REVENDEDORA";

  return (
    <div className={`wholesale-nudge${wholesalePercent > 0 ? " applied" : ""}`}>
      <p className="nudge-text">
        {wholesalePercent > 0 ? (
          <>
            <span className="nudge-check">✓</span>{" "}
            <strong>
              Descuento del {wholesalePercent}% por {appliedTierLabel} aplicado<br></br>
            </strong>
            {nextTier
              ? ` Te falta${nextTier.unitsNeeded === 1 ? "" : "n"} ${unitsText(
                  nextTier.unitsNeeded
                )} para el ${nextTier.percent}% (${nextTier.label})`
              : " - alcanzaste el máximo descuento por cantidad"}
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
