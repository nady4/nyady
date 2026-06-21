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

const CABIFY_API_URL = "https://logistics.api.cabify.com";
const CABIFY_AUTH_URL = "https://cabify.com/auth/api/authorization";

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

function getCabifyConfig() {
  const apiKey = process.env.CABIFY_API_KEY;
  const oauthId = process.env.CABIFY_OAUTH_ID;
  const oauthSecret = process.env.CABIFY_OAUTH_SECRET;
  
  if (!apiKey || !oauthId || !oauthSecret) {
    console.error("[Cabify] Missing OAuth credentials");
    return null;
  }
  
  return { apiKey, oauthId, oauthSecret };
}

async function getCabifyAccessToken(): Promise<string | null> {
  const config = getCabifyConfig();
  if (!config) return null;
  
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  
  const { oauthId, oauthSecret } = config;
  
  try {
    const response = await fetch(CABIFY_AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: oauthId,
        client_secret: oauthSecret
      }).toString()
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Cabify Auth] Error:", response.status, errorText);
      return null;
    }
    
    const data = await response.json();
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    
    return cachedToken;
  } catch (error) {
    console.error("[Cabify Auth] Error:", error);
    return null;
  }
}

function getCabifyOrigin() {
  return {
    street: process.env.CABIFY_ORIGIN_STREET || "",
    city: process.env.CABIFY_ORIGIN_CITY || "Buenos Aires",
    state: process.env.CABIFY_ORIGIN_STATE || "CABA",
    zipcode: process.env.CABIFY_ORIGIN_ZIPCODE || "",
    lat: parseFloat(process.env.CABIFY_ORIGIN_LAT || "-34.6037"),
    lon: parseFloat(process.env.CABIFY_ORIGIN_LON || "-58.3816")
  };
}

export interface CabifyQuoteResult {
  id: string;
  status: string;
  price: number;
  currency: string;
  estimated_pickup: string;
  estimated_delivery: string;
}

export interface CabifyQuoteRequest {
  origin: {
    lat: number;
    lon: number;
    address: string;
    city: string;
    state: string;
    zipcode: string;
  };
  destination: {
    lat?: number;
    lon?: number;
    address: string;
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
  declaredValue: number;
}

export async function getCabifyQuote(
  request: CabifyQuoteRequest
): Promise<CabifyQuoteResult | null> {
  const config = getCabifyConfig();
  if (!config) return null;
  
  const { apiKey } = config;
  const accessToken = await getCabifyAccessToken();
  if (!accessToken) return null;
  
  try {
    const requestBody = {
        parcels: [
          {
            pickup_info: {
              addr: request.origin.address,
              city: request.origin.city,
              state: request.origin.state,
              zipcode: request.origin.zipcode
            },
            pickup_contact: {
              name: "NYADY",
              phone: "+5491159894488"
            },
            dropoff_info: {
              addr: request.destination.address,
              city: request.destination.city,
              state: request.destination.state,
              zipcode: request.destination.zipcode
            },
            dropoff_contact: {
              name: "Cliente",
              phone: "+5491100000000"
            },
            weight: { value: request.packages[0]?.weight || 200, unit: "g" },
            height: { value: request.packages[0]?.height || 10, unit: "cm" },
            width: { value: request.packages[0]?.width || 10, unit: "cm" },
            length: { value: request.packages[0]?.length || 10, unit: "cm" },
            declared_value: request.declaredValue
          }
        ]
      };

    const response = await fetch(`${CABIFY_API_URL}/v1/parcels`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        parcels: [
          {
            pickup_info: {
              addr: request.origin.address,
              city: request.origin.city,
              state: request.origin.state,
              zipcode: request.origin.zipcode
            },
            pickup_contact: {
              name: "NYADY",
              phone: "+5491159894488"
            },
            dropoff_info: {
              addr: request.destination.address,
              city: request.destination.city,
              state: request.destination.state,
              zipcode: request.destination.zipcode
            },
            dropoff_contact: {
              name: "Cliente",
              phone: "+5491100000000"
            },
            weight: { value: request.packages[0]?.weight || 200, unit: "g" },
            height: { value: request.packages[0]?.height || 10, unit: "cm" },
            width: { value: request.packages[0]?.width || 10, unit: "cm" },
            length: { value: request.packages[0]?.length || 10, unit: "cm" },
            declared_value: request.declaredValue
          }
        ]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[CabifyQuote] API error:", response.status, errorText);
      return null;
    }
    
    const data = await response.json();
    if (data.parcels && data.parcels.length > 0) {
      const parcel = data.parcels[0];
      return {
        id: parcel.id,
        status: parcel.status,
        price: parcel.price?.amount || 0,
        currency: parcel.price?.currency || "ARS",
        estimated_pickup: parcel.estimated_pickup || new Date().toISOString(),
        estimated_delivery: parcel.estimated_delivery || new Date().toISOString()
      };
    }
    return null;
  } catch (error) {
    console.error("[CabifyQuote] Error:", error);
    return null;
  }
}

export async function getCabifyQuoteForAddress(
  address: AddressType,
  items: ShippingQuoteItem[],
  declaredValue: number
): Promise<CabifyQuoteResult | null> {
  const origin = getCabifyOrigin();
  
  return getCabifyQuote({
    origin: {
      lat: origin.lat,
      lon: origin.lon,
      address: origin.street,
      city: origin.city,
      state: origin.state,
      zipcode: origin.zipcode
    },
    destination: {
      address: address.street,
      city: address.city,
      state: address.state,
      zipcode: address.postalCode
    },
    packages: items.map((item) => ({
      weight: item.weight,
      height: item.height,
      width: item.width,
      length: item.length
    })),
    declaredValue
  });
}

const PEDIDOSYA_API_URL = process.env.PEDIDOSYA_API_URL || "https://courier-api.pedidosya.com";

function getPedidosYaConfig() {
  const authToken = process.env.PEDIDOSYA_AUTH_TOKEN;
  if (!authToken) {
    console.error("[PedidosYa] Missing auth token");
    return null;
  }
  return { authToken };
}

function getPedidosYaOrigin() {
  return {
    street: process.env.PEDIDOSYA_ORIGIN_STREET || "",
    city: process.env.PEDIDOSYA_ORIGIN_CITY || "Longchamps",
    lat: parseFloat(process.env.PEDIDOSYA_ORIGIN_LAT || "-34.85"),
    lon: parseFloat(process.env.PEDIDOSYA_ORIGIN_LON || "-58.39"),
    phone: process.env.PEDIDOSYA_ORIGIN_PHONE || "+5491159894488",
    name: process.env.PEDIDOSYA_ORIGIN_NAME || "NYADY"
  };
}

export interface PedidosYaQuoteResult {
  deliveryOfferId: string;
  deliveryMode: "EXPRESS" | "SCHEDULE" | "CROSS_DOCKING";
  deliveryTimeFrom: string;
  deliveryTimeTo: string;
  price: number;
  currency: string;
}

export interface PedidosYaQuoteResponse {
  estimateId: string;
  deliveryOffers: PedidosYaQuoteResult[];
}

export async function getPedidosYaQuote(
  referenceId: string,
  destination: { lat: number; lon: number; city: string; phone: string; name: string },
  items: Array<{ weight: number; height: number; width: number; length: number; description: string }>
): Promise<PedidosYaQuoteResponse | null> {
  const config = getPedidosYaConfig();
  if (!config) return null;

  const origin = getPedidosYaOrigin();

  try {
    const response = await fetch(`${PEDIDOSYA_API_URL}/v3/shippings/estimates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": config.authToken
      },
      body: JSON.stringify({
        referenceId,
        isTest: process.env.NODE_ENV === "development",
        items: items.map((item) => ({
          type: "STANDARD",
          value: 0,
          description: item.description,
          quantity: 1,
          volume: (item.height * item.width * item.length) / 1000000,
          weight: item.weight / 1000
        })),
        waypoints: [
          {
            type: "PICK_UP",
            addressStreet: origin.street,
            city: origin.city,
            latitude: origin.lat,
            longitude: origin.lon,
            phone: origin.phone,
            name: origin.name
          },
          {
            type: "DROP_OFF",
            latitude: destination.lat,
            longitude: destination.lon,
            city: destination.city,
            phone: destination.phone,
            name: destination.name
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[PedidosYaQuote] API error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    return data as PedidosYaQuoteResponse;
  } catch (error) {
    console.error("[PedidosYaQuote] Error:", error);
    return null;
  }
}

export async function getPedidosYaQuoteForAddress(
  address: AddressType,
  items: ShippingQuoteItem[]
): Promise<{ express: PedidosYaQuoteResult | null; schedule: PedidosYaQuoteResult | null }> {
  const result = await getPedidosYaQuote(
    `nyady-${Date.now()}`,
    { lat: -34.86, lon: -58.39, city: address.city, phone: "+5491100000000", name: "Cliente" },
    items.map((item) => ({
      weight: item.weight,
      height: item.height,
      width: item.width,
      length: item.length,
      description: item.description || "Producto"
    }))
  );

  if (!result || !result.deliveryOffers) {
    return { express: null, schedule: null };
  }

  const express = result.deliveryOffers.find((o) => o.deliveryMode === "EXPRESS") || null;
  const schedule = result.deliveryOffers.find((o) => o.deliveryMode === "SCHEDULE") || null;

  return { express, schedule };
}
