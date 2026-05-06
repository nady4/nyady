import { getUserAddress, updateAddress } from "@/actions/address";
import FormContainer from "@/components/FormContainer";

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
