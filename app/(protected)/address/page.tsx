import type { Metadata } from "next";
import { getUserAddress } from "@/actions/address";
import FormContainer from "@/components/FormContainer";
import AddressForm from "@/components/AddressForm";

export const metadata: Metadata = {
  title: "Dirección de envío - NYADY",
  description:
    "Gestioná tu dirección de envío para recibir tus sandalias artesanales en casa.",
};

export default async function AddressPage() {
  const address = await getUserAddress();

  return (
    <div className="form-page">
      <FormContainer title="Dirección de envío">
        <AddressForm address={address} />
      </FormContainer>
    </div>
  );
}
