import { getUserAddress, updateAddress } from "@/actions/address";
import FormContainer from "@/components/FormContainer";

export default async function AddressPage() {
  const address = await getUserAddress();

  return (
    <div className="form-page">
      <FormContainer title="Shipping Address">
        <form action={updateAddress}>
          <input
            type="text"
            name="street"
            placeholder="Street"
            defaultValue={address?.street || ""}
            required
          />
          <input
            type="text"
            name="city"
            placeholder="City"
            defaultValue={address?.city || ""}
            required
          />
          <input
            type="text"
            name="state"
            placeholder="State / Province"
            defaultValue={address?.state || ""}
          />
          <input
            type="text"
            name="postalCode"
            placeholder="Postal Code"
            defaultValue={address?.postalCode || ""}
            required
          />
          <input
            type="text"
            name="country"
            placeholder="Country"
            defaultValue={address?.country || ""}
            required
          />
          <button type="submit">Save Address</button>
        </form>
      </FormContainer>
    </div>
  );
}