"use server";

import type { ShippingQuoteResult } from "@/types";

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

// ShippingQuoteResult is defined once in @/types (with the `selectable` field)
// and imported above. Callers import it directly from @/types; it is not
// re-exported here to avoid a runtime reference in this "use server" module.

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

// --- Shipment creation + tracking -------------------------------------------

/**
 * Snapshot of the quote option chosen at checkout, persisted on the Order so
 * the webhook can create the Zipnova shipment after payment is approved (by
 * then the cart has been cleared, so the data can't be re-derived).
 *
 * Dimensions in `items` are in **cm** (matching the quote endpoint) and are
 * converted to **mm** (×10) when the shipment is created — the create endpoint
 * expects millimetres.
 */
export interface ShippingSelection {
  serviceType: string;
  logisticType: string;
  carrierId: number;
  pickupPointId?: number | null;
  declaredValue: number;
  shippingCost: number;
  items: ShippingQuoteItem[];
}

export interface ShipmentRecipient {
  name: string;
  document: string;
  email: string;
  phone: string;
}

export interface CreatedShipment {
  id: number;
  carrier_tracking_id: string | null;
  tracking: string | null;
  tracking_external: string | null;
  status: string;
  status_name: string;
}

/**
 * Parse a trailing street number out of a free-form street string
 * ("Av. Corrientes 1234" → { street: "Av. Corrientes", number: "1234" }).
 * Zipnova's create-shipment endpoint wants street and street_number split.
 */
function splitStreetNumber(street: string): { street: string; number: string } {
  const match = street.match(/^(.*?)\s+(\d+)\s*$/);
  if (match) {
    return { street: match[1].trim(), number: match[2] };
  }
  return { street: street.trim(), number: "" };
}

/**
 * Create a shipment in Zipnova. Returns null on any failure so callers
 * (the webhook) can treat it as best-effort without throwing.
 */
export async function createShipment(
  orderId: string,
  recipient: ShipmentRecipient,
  address: AddressType,
  selection: ShippingSelection
): Promise<CreatedShipment | null> {
  const config = getZipnovaConfig();
  if (!config) return null;

  const { key, secret, accountId } = config;
  const isPickupPoint = selection.serviceType === "pickup_point";
  const { street, number } = splitStreetNumber(address.street);

  const destination: Record<string, unknown> = {
    name: recipient.name,
    document: recipient.document,
    email: recipient.email,
    phone: recipient.phone
  };

  if (isPickupPoint && selection.pickupPointId) {
    destination.point_id = selection.pickupPointId;
  } else {
    destination.street = street;
    destination.street_number = number;
    destination.city = address.city;
    destination.state = address.state;
    destination.zipcode = address.postalCode;
  }

  try {
    const response = await fetch(`${ZIPNOVA_API_URL}/shipments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`
      },
      body: JSON.stringify({
        account_id: accountId,
        // external_id is capped at 30 alphanumeric/hyphen chars; the order
        // id is a 36-char UUID, so prefix + truncate.
        external_id: `nyady-${orderId.slice(0, 23)}`,
        source: "nyady",
        service_type: selection.serviceType,
        logistic_type: selection.logisticType,
        carrier_id: selection.carrierId,
        origin_id: "auto",
        declared_value: selection.declaredValue,
        destination,
        // Convert cm → mm for the create endpoint (quote uses cm).
        items: selection.items.map((item) => ({
          weight: item.weight,
          height: item.height * 10,
          width: item.width * 10,
          length: item.length * 10,
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
        "[createShipment] API error:",
        response.status,
        errorText
      );
      return null;
    }

    const data = await response.json();
    return {
      id: data.id,
      carrier_tracking_id: data.carrier_tracking_id ?? null,
      tracking: data.tracking ?? null,
      tracking_external: data.tracking_external ?? null,
      status: data.status,
      status_name: data.status_name
    };
  } catch (error) {
    console.error("[createShipment] Error:", error);
    return null;
  }
}

export interface ShipmentStatus {
  id: number;
  status: string;
  status_name: string;
  tracking: string | null;
  tracking_external: string | null;
  carrier_tracking_id: string | null;
}

export async function getShipmentStatus(
  shipmentId: string
): Promise<ShipmentStatus | null> {
  const config = getZipnovaConfig();
  if (!config) return null;

  try {
    const response = await fetch(
      `${ZIPNOVA_API_URL}/shipments/${shipmentId}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${Buffer.from(`${config.key}:${config.secret}`).toString("base64")}`
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[getShipmentStatus] API error:",
        response.status,
        errorText
      );
      return null;
    }

    const data = await response.json();
    return {
      id: data.id,
      status: data.status,
      status_name: data.status_name,
      tracking: data.tracking ?? null,
      tracking_external: data.tracking_external ?? null,
      carrier_tracking_id: data.carrier_tracking_id ?? null
    };
  } catch (error) {
    console.error("[getShipmentStatus] Error:", error);
    return null;
  }
}

export interface ShipmentTrackingEvent {
  occurred_at: string;
  created_at: string;
  status: {
    code: string;
    name: string;
    visible_name: string;
    substatus: string | null;
  };
}

export interface ShipmentTrackingHistory {
  data: ShipmentTrackingEvent[];
}

export async function getShipmentTracking(
  shipmentId: string
): Promise<ShipmentTrackingHistory | null> {
  const config = getZipnovaConfig();
  if (!config) return null;

  try {
    const response = await fetch(
      `${ZIPNOVA_API_URL}/shipments/${shipmentId}/tracking?sort=newest`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${Buffer.from(`${config.key}:${config.secret}`).toString("base64")}`
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[getShipmentTracking] API error:",
        response.status,
        errorText
      );
      return null;
    }

    return (await response.json()) as ShipmentTrackingHistory;
  } catch (error) {
    console.error("[getShipmentTracking] Error:", error);
    return null;
  }
}
