import type { Metadata } from "next";
import { getUserAddress } from "@/actions/address";
import FormContainer from "@/components/FormContainer";
import AddressForm from "@/components/AddressForm";

export const metadata: Metadata = {
  title: "Dirección de envío",
  description:
    "Gestioná tu dirección de envío para recibir tus sandalias artesanales en casa.",
  robots: { index: false, follow: true },
};

export default async function AddressPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [address, params] = await Promise.all([getUserAddress(), searchParams]);
  const next = params.next && params.next.startsWith("/") ? params.next : undefined;

  return (
    <div className="form-page">
      <FormContainer title="Dirección de envío">
        <AddressForm address={address} nextPath={next} />
      </FormContainer>
    </div>
  );
}
