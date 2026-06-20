export type ProductType = {
  id: string;
  name: string;
  photo: string;
  price: number;
  category: string;
  stock: number;
  description?: string | null;
  code?: string | null;
  sizes?: string[];
  colors?: string[];
  photos?: Record<string, string[]> | null | unknown;
  tacoOptions?: string[];
  selectedSize?: string;
  selectedColor?: string;
  selectedTacoOption?: string;
  weight?: number;
  height?: number;
  width?: number;
  length?: number;
};

export type AddressType = {
  id: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
};

export type ShippingQuoteResult = {
  selectable?: boolean;
  service_type: {
    code: string;
    name: string;
  };
  logistic_type: string;
  carrier: {
    id: number;
    name: string;
  };
  delivery_time: {
    estimated_delivery: string;
    estimation_expires_at: string;
    times?: {
      dispatch?: string;
      last_mile?: string;
      delivery?: string;
    };
  };
  amounts: {
    price: number;
    price_incl_tax: number;
  };
  pickup_points?: Array<{
    point_id: number;
    description: string;
    location: {
      street: string;
      street_number: string;
      city: string;
      state: string;
      zipcode: string;
    };
  }>;
};