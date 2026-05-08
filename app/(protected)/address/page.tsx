import type { Metadata } from "next";
import { getUserAddress, updateAddress } from "@/actions/address";
import FormContainer from "@/components/FormContainer";

export const metadata: Metadata = {
  title: "Dirección de envío - NYADY",
  description: "Gestiona tu dirección de envío para recibir tus pantuflas y pantubotas artesanales en casa.",
};

export default async function AddressPage() {
  const address = await getUserAddress();

  return (
    <div className="form-page">
      <FormContainer title="Dirección de envío">
        <form action={updateAddress}>
          <input
            type="text"
            name="street"
            placeholder="Calle"
            defaultValue={address?.street || ""}
            required
          />
          <input
            type="text"
            name="city"
            placeholder="Ciudad"
            defaultValue={address?.city || ""}
            required
          />
          <input
            type="text"
            name="state"
            placeholder="Provincia"
            defaultValue={address?.state || ""}
          />
          <input
            type="text"
            name="postalCode"
            placeholder="Código postal"
            defaultValue={address?.postalCode || ""}
            required
          />
          <button type="submit">Guardar dirección</button>
        </form>
      </FormContainer>
    </div>
  );
}
