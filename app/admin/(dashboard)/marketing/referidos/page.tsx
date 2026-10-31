import Link from "next/link";
import ReferralCodesCard from "@/components/admin/marketing/ReferralCodesCard";
import {
  loadReferralCandidates,
  loadReferralCodes,
} from "@/lib/marketing/referrals";

export const metadata = {
  title: "Marketing · Referidos",
};

/**
 * Referral program (phase 5).
 *
 * A referral is a coupon with an owner: the customer shares a tracked link,
 * the buyer gets the discount and the order records who brought it. The
 * admin sees the revenue per referrer here and in the funnel.
 */
export default async function MarketingReferralsPage() {
  const [codes, candidates] = await Promise.all([
    loadReferralCodes().catch((error) => {
      console.error("[admin/referrals] codes load failed:", error);
      return [];
    }),
    loadReferralCandidates(20).catch((error) => {
      console.error("[admin/referrals] candidates load failed:", error);
      return [];
    }),
  ]);

  return (
    <main className="admin-page admin-page-wide">
      <div className="admin-page-header">
        <h1 className="admin-title">Referidos</h1>
        <Link href="/admin/marketing" className="admin-button">
          Volver a Marketing
        </Link>
      </div>

      <p className="admin-field-hint">
        El link que compartís lleva el código en <code>?ref=</code>: la clienta
        llega, el cupón se aplica solo en el carrito y la orden queda atribuida
        a esa clienta.
      </p>

      <ReferralCodesCard codes={codes} candidates={candidates} />
    </main>
  );
}
