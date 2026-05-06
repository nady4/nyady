"use server";

const ZIPNOVA_API_URL = "https://api.zipnova.com.ar/v2";

function getZipnovaConfig() {
  const key = process.env.ZIPNOVA_KEY;
  const secret = process.env.ZIPNOVA_SECRET;
  const accountId = process.env.ZIPNOVA_ACCOUNT_ID;

  if (!key || !secret || !accountId) {
    console.error("[getShippingQuote] Missing ZIPNOVA credentials");
    return null;
  }

  return { key, secret, accountId: parseInt(accountId, 10) };
}

export interface ShippingQuoteItem {
  sku?: string;
  weight: number;
  height: number;
  width: number;
  length: number;
  description?: string;
  classification_id?: string;
  must_keep_vertical?: boolean;
}

export interface ShippingDestination {
  city: string;
  state: string;
  zipcode: string;
  street?: string;
  street_number?: string;
  id?: number;
}

export interface ShippingQuoteResult {
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
}

export interface ShippingQuoteResponse {
  destination: {
    city: string;
    state: string;
    zipcode: string;
  };
  packages: Array<{
    weight: number;
    height: number;
    width: number;
    length: number;
  }>;
  results: {
    [serviceType: string]: ShippingQuoteResult;
  };
  all_results: ShippingQuoteResult[];
}

export async function getShippingQuote(
  destination: ShippingDestination,
  items: ShippingQuoteItem[],
  declaredValue: number
): Promise<ShippingQuoteResponse | null> {
  const config = getZipnovaConfig();
  if (!config) return null;

  const { key, secret, accountId } = config;

  try {
    const response = await fetch(`${ZIPNOVA_API_URL}/shipments/quote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
      },
      body: JSON.stringify({
        account_id: accountId,
        source: "nyady",
        declared_value: declaredValue,
        destination: {
          city: destination.city,
          state: destination.state,
          zipcode: destination.zipcode,
          street: destination.street,
          street_number: destination.street_number
        },
        items: items.map((item) => ({
          weight: item.weight,
          height: item.height,
          width: item.width,
          length: item.length,
          description: item.description,
          classification_id: item.classification_id,
          must_keep_vertical: item.must_keep_vertical
        })),
        type_packaging: "dynamic"
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[getShippingQuote] API error:",
        response.status,
        errorText
      );
      return null;
    }

    const data = await response.json();
    console.log("[getShippingQuote] Shipping options (all_results):", data.all_results?.length);
    console.log("[getShippingQuote] Shipping options (results):", Object.keys(data.results || {}).length);
    return data as ShippingQuoteResponse;
  } catch (error) {
    console.error("[getShippingQuote] Error:", error);
    return null;
  }
}

export interface AddressType {
  id: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
}

export async function quoteShippingToAddress(
  address: AddressType,
  items: ShippingQuoteItem[],
  declaredValue: number
): Promise<ShippingQuoteResponse | null> {
  return getShippingQuote(
    {
      city: address.city,
      state: address.state,
      zipcode: address.postalCode,
      street: address.street
    },
    items,
    declaredValue
  );
}
