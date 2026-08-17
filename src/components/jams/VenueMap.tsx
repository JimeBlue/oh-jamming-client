'use client';

import L from 'leaflet';
import { useEffect, useRef } from 'react';

import 'leaflet/dist/leaflet.css';

/* The map: under the address field while a session is being written, and in the
   listing a musician reads.

   Under the address field it is on screen before there is anything to point at —
   no pin, the country in view — because an empty map is what tells the venue
   that picking an address from the list does something. Rendering it only once
   coordinates exist means the one moment it would explain itself is the one
   moment it isn't there. The listing is the opposite case and mounts it only
   with coordinates in hand; there, an empty map explains nothing.

   Leaflet reads `window` and `document` the moment it is imported, so this file
   must never be evaluated on the server — every caller pulls it in through
   next/dynamic with `ssr: false`, which is what keeps the build from crashing on
   `window is not defined`.

   Leaflet is imperative and owns its own DOM, so this is one of the few places
   in the app where an effect reaches for a ref and builds nodes by hand: React
   renders an empty div, Leaflet fills it, and the cleanup hands it back. */

type VenueMapProps = {
  /* Both or neither — a latitude without a longitude is no location. Absent
     while the venue is still typing, or when the room isn't in OpenStreetMap. */
  lat?: number;
  lng?: number;
  /* The address itself, for anyone who can't see the pin. */
  label?: string;
  /* Height only, and as a class rather than a number, because Leaflet measures
     the container it is handed — a map sized by its content would come out at
     zero. The detail page wants a shorter map on a phone than on a desktop, and
     everywhere else the default is the right answer. */
  heightClass?: string;
};

/* Germany at country scale. Not a guess at where the venue is — a frame that
   makes the zoom to a street read as an answer to what they just picked. */
const DEFAULT_CENTER: L.LatLngTuple = [51.1657, 10.4515];
const DEFAULT_ZOOM = 5;
const PIN_ZOOM = 16;

/* Leaflet's own marker is a PNG whose URL it assembles at runtime from the path
   it thinks its stylesheet is at — which under a bundler is nowhere, and the
   marker silently comes out as a broken image. A divIcon sidesteps the whole
   mechanism, and as a bonus the pin can wear the theme's colours instead of
   Leaflet's blue. Anchored at the tip, not the middle: a pin points at a place. */
const pinIcon = () =>
  L.divIcon({
    html: `
      <svg viewBox="0 0 24 32" width="28" height="37" aria-hidden="true">
        <path
          d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20C24 5.373 18.627 0 12 0z"
          style="fill: var(--color-primary); stroke: white; stroke-width: 1.5"
        />
        <circle cx="12" cy="12" r="4.5" style="fill: white" />
      </svg>
    `,
    className: '',
    iconSize: [28, 37],
    iconAnchor: [14, 37],
  });

export default function VenueMap({
  lat,
  lng,
  label,
  heightClass = 'h-64',
}: VenueMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  /* Built once and kept. Tearing the map down whenever the pin moves would
     re-request every tile in view, and this is a volunteer-funded tile server. */
  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const map = L.map(container, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      /* A map that swallows the wheel traps the page: the venue scrolls towards
         the Next button and instead zooms out to Europe. Dragging and the +/−
         buttons still work, which is all this map is for. */
      scrollWheelZoom: false,
    });

    /* Attribution is a condition of using OSM's tiles, not decoration — Leaflet
       renders it in the corner and it stays there. */
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  /* The pin, and where the map is looking. Separate from the effect above so
     that picking a second address moves one marker rather than rebuilding
     everything around it. */
  useEffect(() => {
    const map = mapRef.current;

    if (!map) return;

    if (lat === undefined || lng === undefined) {
      markerRef.current?.remove();
      markerRef.current = null;
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);

      return;
    }

    /* [lat, lng] — the opposite order to the [lng, lat] Photon sends, which is
       why the two arrive here as named numbers rather than as an array. */
    const position: L.LatLngTuple = [lat, lng];

    /* setView rather than flyTo: the animated version is prettier and drags a
       corridor of tiles across half of Germany out of OSM's servers on the way. */
    map.setView(position, PIN_ZOOM);

    if (markerRef.current) {
      markerRef.current.setLatLng(position);
      markerRef.current.options.title = label;

      return;
    }

    markerRef.current = L.marker(position, {
      icon: pinIcon(),
      alt: label,
      title: label,
      /* Nothing happens when it's activated, so it shouldn't be a tab stop. */
      keyboard: false,
    }).addTo(map);
  }, [lat, lng, label]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label={label ? `Map showing ${label}` : 'Map — no address picked yet'}
      /* `isolate` matters: Leaflet gives its internal panes z-indexes up to 800,
         and without a stacking context of its own the map would paint straight
         over the suggestion list hanging down from the input above it. */
      className={`isolate w-full overflow-hidden rounded-box border border-base-300 ${heightClass}`}
    />
  );
}
