import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Nueva dirección",
  description:
    "Agregá una nueva dirección de envío para recibir tus sandalias artesanales.",
  robots: { index: false, follow: true },
};

// The real address form lives at /address (FormContainer + AddressForm with
// live-street autocomplete). This route had drifted into a non-operational
// copy of itself: redirect instead of rendering forms that never saved.
export default async function NewAddressPage() {
  redirect("/address");
}
