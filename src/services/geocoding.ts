import { z } from 'zod';

/* Address lookup, via Photon — komoot's geocoder over OpenStreetMap data.

   Not routed through `services/api.ts`, and that's deliberate: this is a third
   party, so it must not receive our cookies, must not trigger a session refresh
   on a 401, and must not raise `ApiError` — a geocoder being down is a degraded
   input, not a failed request. Plain fetch, no credentials.

   Photon over Google Places or Mapbox because it needs no key. A key belongs on
   a server, and putting one in `NEXT_PUBLIC_*` publishes it to anyone who opens
   devtools; the alternative is a proxy route on the API, which is a backend
   change this phase doesn't want. Photon is also CORS-open and unmetered, at
   the price of coverage: it knows what OSM knows. */

const PHOTON_URL = 'https://photon.komoot.io/api/';

/* Below this the results are noise — two letters match half of Europe. */
export const MIN_QUERY_LENGTH = 3;

const RESULT_LIMIT = 8;

/* Only the properties we render. Photon returns a dozen more (osm_key, extent,
   district, county…) and `z.object` ignores them, so a change on their side
   doesn't break the list. Everything is optional because it genuinely is: a
   rural crossroads has no postcode, a POI has no housenumber. */
const featureSchema = z.object({
  properties: z.object({
    osm_id: z.number().optional(),
    osm_type: z.string().optional(),
    name: z.string().optional(),
    housenumber: z.string().optional(),
    street: z.string().optional(),
    postcode: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
  }),
  geometry: z.object({
    /* GeoJSON order: [longitude, latitude]. Leaflet takes [latitude, longitude].
       Swapping them doesn't throw — it silently drops a Nürnberg venue in the
       Indian Ocean — so the two are pulled apart by name here, once, and the
       array never travels any further than this file. */
    coordinates: z.tuple([z.number(), z.number()]),
  }),
});

const photonResponseSchema = z.object({ features: z.array(featureSchema) });

export type AddressSuggestion = {
  id: string;
  /* The line the venue reads and picks. */
  primary: string;
  secondary: string;
  /* What lands in the form field, and eventually in the database: the two lines
     joined. The list is allowed to be prettier than the record, but it isn't
     allowed to say something different. */
  formatted: string;
  lat: number;
  lng: number;
};

type Properties = z.infer<typeof featureSchema>['properties'];

/* OSM has no formatted-address field, so the line is assembled from parts, and
   which parts exist depends on what kind of thing was matched: a concert hall
   has a name and a street, a street has only a name, a house has a number and
   no name at all. Anything empty drops out, and anything already said in the
   first line doesn't get said again in the second. */
const toLines = (properties: Properties): { primary: string; secondary: string } => {
  const { name, housenumber, street, postcode, city, country } = properties;

  const streetLine = [street, housenumber].filter(Boolean).join(' ');
  const cityLine = [postcode, city].filter(Boolean).join(' ');

  /* `||`, not `??`: `streetLine` is an empty string rather than undefined when
     the feature has neither street nor number, and `??` would keep it. */
  const primary = name || streetLine || city || country || '';

  const secondary = [streetLine, cityLine, country]
    .filter((part): part is string => Boolean(part) && part !== primary)
    .join(', ');

  return { primary, secondary };
};

export const searchAddresses = async (
  query: string,
  signal: AbortSignal,
): Promise<AddressSuggestion[]> => {
  const params = new URLSearchParams({
    q: query,
    limit: String(RESULT_LIMIT),
    /* Names come back transliterated where OSM has an English exonym, so a
       venue in Köln reads as Cologne rather than in Cyrillic for a Bulgarian
       address. The coordinates are unaffected. */
    lang: 'en',
  });

  const response = await fetch(`${PHOTON_URL}?${params}`, { signal });

  if (!response.ok) {
    throw new Error(`Photon answered ${response.status}`);
  }

  const { features } = photonResponseSchema.parse(await response.json());

  const suggestions = features.map((feature, index) => {
    const { primary, secondary } = toLines(feature.properties);
    const [lng, lat] = feature.geometry.coordinates;
    const { osm_type: osmType, osm_id: osmId } = feature.properties;

    return {
      id: osmType && osmId ? `${osmType}${osmId}` : `feature-${index}`,
      primary,
      secondary,
      formatted: [primary, secondary].filter(Boolean).join(', '),
      lat,
      lng,
    };
  });

  /* OSM records a big building twice — once as the node someone dropped a pin
     on, once as the way tracing its outline — and both come back, character for
     character identical. Two rows that say the same thing look like a bug, and
     picking either gives the same address, so only the first survives. */
  const seen = new Set<string>();

  return suggestions.filter(({ formatted }) => {
    if (!formatted || seen.has(formatted)) return false;

    seen.add(formatted);

    return true;
  });
};
