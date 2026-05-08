import type { Metadata } from "next";
import { getUserAddress } from "@/actions/address";
import FormContainer from "@/components/FormContainer";

export const metadata: Metadata = {
  title: "Nueva dirección - NYADY",
  description: "Agregá una nueva dirección de envío para recibir tus pantuflas y pantubotas.",
};

export default async function NewAddressPage() {
  const address = await getUserAddress();

  if (address) {
    return (
      <div className="form-page">
        <FormContainer title="Dirección de envío">
          <p>Ya tienes una dirección guardada. Puedes editarla a continuación.</p>
          <form action={async () => {}}>
            <input
              type="text"
              name="street"
              placeholder="Calle"
              defaultValue={address.street || ""}
              required
            />
            <input
              type="text"
              name="city"
              placeholder="Ciudad"
              defaultValue={address.city || ""}
              required
            />
            <input
              type="text"
              name="state"
              placeholder="Provincia"
              defaultValue={address.state || ""}
            />
            <input
              type="text"
              name="postalCode"
              placeholder="Código postal"
              defaultValue={address.postalCode || ""}
              required
            />
          </form>
        </FormContainer>
      </div>
    );
  }

  return (
    <div className="form-page">
      <FormContainer title="Nueva Dirección">
        <form action={async () => {}}>
          <input
            type="text"
            name="street"
            placeholder="Calle"
            required
          />
          <input
            type="text"
            name="city"
            placeholder="Ciudad"
            required
          />
          <input
            type="text"
            name="state"
            placeholder="Provincia"
          />
          <input
            type="text"
            name="postalCode"
            placeholder="Código postal"
            required
          />
          <button type="submit">Guardar dirección</button>
        </form>
      </FormContainer>
    </div>
  );
}