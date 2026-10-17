import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface AddressSuggestion {
  label: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
}

const ARCGIS_URL =
  "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates";
const GEOREF_URL = "https://apis.datos.gob.ar/georef/api/direcciones";

// House-level match types; discards POIs, localities and postal codes.
const ACCEPTED_TYPES = [
  "PointAddress",
  "StreetAddress",
  "StreetAddressExt",
  "StreetName"
];

const CACHE_TTL = 60 * 60 * 1000;
const CACHE_MAX = 200;

const cache = new Map<string, { data: AddressSuggestion[]; expires: number }>();

function getCached(key: string): AddressSuggestion[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key: string, data: AddressSuggestion[]) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

interface ArcGisAttributes {
  Match_addr?: string;
  StAddr?: string;
  StName?: string;
  AddNum?: string;
  District?: string;
  City?: string;
  Region?: string;
  Postal?: string;
  Addr_type?: string;
}

function fromArcGis(attributes: ArcGisAttributes): AddressSuggestion | null {
  const street =
    attributes.StAddr ||
    [attributes.StName, attributes.AddNum].filter(Boolean).join(" ").trim();
  if (!street) return null;

  const region = attributes.Region || "";
  const district = attributes.District || "";
  // In CABA the "city" carriers expect is Buenos Aires, not the barrio or
  // comuna ArcGIS reports as District. Elsewhere the district is the locality
  // ("Longchamps") while City is the partido ("Almirante Brown"), and the
  // locality is the better match for shipping.
  const isCaba = /ciudad aut[oó]noma/i.test(region);
  const city = isCaba
    ? attributes.City || "Buenos Aires"
    : !district || /^comuna /i.test(district)
      ? attributes.City || ""
      : district;

  return {
    label: attributes.Match_addr || [street, city, region].filter(Boolean).join(", "),
    street,
    city,
    state: region.replace(/^provincia de\s+/i, ""),
    postalCode: attributes.Postal || ""
  };
}

async function searchArcGis(query: string): Promise<AddressSuggestion[]> {
  const params = new URLSearchParams({
    f: "json",
    countryCode: "ARG",
    singleLine: query,
    maxLocations: "5",
    outFields: "Match_addr,StAddr,StName,AddNum,District,City,Region,Postal,Addr_type",
    outSR: "4326"
  });

  const response = await fetch(`${ARCGIS_URL}?${params}`, {
    signal: AbortSignal.timeout(6000)
  });
  if (!response.ok) return [];

  const data = await response.json();
  const candidates: Array<{ attributes?: ArcGisAttributes }> = Array.isArray(
    data?.candidates
  )
    ? data.candidates
    : [];

  const seen = new Set<string>();
  const suggestions: AddressSuggestion[] = [];
  for (const candidate of candidates) {
    const attributes = candidate?.attributes;
    if (!attributes || !ACCEPTED_TYPES.includes(attributes.Addr_type || "")) {
      continue;
    }
    const suggestion = fromArcGis(attributes);
    if (suggestion && !seen.has(suggestion.label)) {
      seen.add(suggestion.label);
      suggestions.push(suggestion);
    }
  }
  return suggestions;
}

interface GeorefDireccion {
  nomenclatura?: string;
  calle?: { nombre?: string };
  altura?: { valor?: number | string };
  localidad_censal?: { nombre?: string };
  departamento?: { nombre?: string };
  provincia?: { nombre?: string };
}

// Official Argentine georeferencing API, no key required. It covers fewer
// house numbers than ArcGIS and does not return postal codes, so it is only
// used when ArcGIS fails or finds nothing.
async function searchGeoref(query: string): Promise<AddressSuggestion[]> {
  const params = new URLSearchParams({ direccion: query, max: "5" });

  const response = await fetch(`${GEOREF_URL}?${params}`, {
    signal: AbortSignal.timeout(6000)
  });
  if (!response.ok) return [];

  const data = await response.json();
  const direcciones: GeorefDireccion[] = Array.isArray(data?.direcciones)
    ? data.direcciones
    : [];

  return direcciones
    .map((direccion) => {
      const street = [direccion.calle?.nombre, direccion.altura?.valor]
        .filter((part) => part !== undefined && part !== null && part !== "")
        .join(" ");
      if (!street) return null;
      return {
        label:
          direccion.nomenclatura ||
          [street, direccion.localidad_censal?.nombre, direccion.provincia?.nombre]
            .filter(Boolean)
            .join(", "),
        street,
        city: direccion.localidad_censal?.nombre || direccion.departamento?.nombre || "",
        state: direccion.provincia?.nombre || "",
        postalCode: ""
      };
    })
    .filter((suggestion): suggestion is AddressSuggestion => suggestion !== null);
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ suggestions: [] }, { status: 401 });
  }

  const query = (new URL(request.url).searchParams.get("q") || "")
    .trim()
    .slice(0, 120);
  if (query.length < 4) {
    return NextResponse.json({ suggestions: [] });
  }

  const cacheKey = query.toLowerCase();
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ suggestions: cached });
  }

  let suggestions: AddressSuggestion[] = [];
  try {
    suggestions = await searchArcGis(query);
  } catch {
    suggestions = [];
  }
  if (suggestions.length === 0) {
    try {
      suggestions = await searchGeoref(query);
    } catch {
      suggestions = [];
    }
  }

  setCached(cacheKey, suggestions);
  return NextResponse.json({ suggestions });
}
