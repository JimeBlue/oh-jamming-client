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
  /* The frame — corners and edge. A prop because the builder squares the bottom
     two corners to sit a note flush underneath, and everywhere else the map is
     a rounded box on its own. */
  frameClass?: string;
  /* Given only by the builder: the pin becomes draggable and reports where it
     was let go. The listing passes nothing, and a musician reading a published
     session can't move the venue's door. */
  onPinMove?: (lat: number, lng: number) => void;
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
/* Exact equality, not a distance: these are the same float64s that went out of
   `getLatLng` and came back through the form untouched. Anything the venue
   picked from the address list is a different number entirely. */
const isOwnDrag = (
  dragged: L.LatLngTuple | null,
  position: L.LatLngTuple,
): boolean =>
  dragged !== null && dragged[0] === position[0] && dragged[1] === position[1];

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
  frameClass = 'rounded-box border border-base-300',
  onPinMove,
}: VenueMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  /* In a ref so the dragend handler below can be attached once, at the moment
     the marker is created, and still call the latest callback. Listing it in the
     effect's deps instead would tear the marker down and rebuild it every time
     the parent re-renders with a new closure — which is every keystroke in the
     address field. */
  const onPinMoveRef = useRef(onPinMove);

  /* In an effect rather than straight in the body: a ref written during render
     is a side effect in a phase React is allowed to run twice and throw away.
     Seeded by the useRef above, so the marker created on mount already sees it. */
  useEffect(() => {
    onPinMoveRef.current = onPinMove;
  }, [onPinMove]);

  /* Where this map last put the pin itself. The coordinates come back down as
     props a moment later, and the effect below needs to tell "the venue picked
     a new address" from "the venue dragged the pin I already have". */
  const draggedToRef = useRef<L.LatLngTuple | null>(null);

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
       corridor of tiles across half of Germany out of OSM's servers on the way.

       Skipped when these coordinates are the ones this map just reported from a
       drag. Recentring then would yank the view out from under the hand that
       moved the pin, and re-zoom to 16 if they had zoomed out to find the
       street. */
    if (!isOwnDrag(draggedToRef.current, position)) {
      map.setView(position, PIN_ZOOM);
    }

    if (markerRef.current) {
      markerRef.current.setLatLng(position);
      markerRef.current.options.title = label;

      return;
    }

    const marker = L.marker(position, {
      icon: pinIcon(),
      alt: label,
      title: label,
      /* Nothing happens when it's activated, so it shouldn't be a tab stop. */
      keyboard: false,
      draggable: onPinMoveRef.current !== undefined,
    }).addTo(map);

    /* On dragend rather than on drag: the form would otherwise take a new value
       for every frame of the gesture, each one written to the draft in
       sessionStorage. Where it was let go is the only position anyone meant. */
    marker.on('dragend', () => {
      const { lat: movedLat, lng: movedLng } = marker.getLatLng();

      draggedToRef.current = [movedLat, movedLng];
      onPinMoveRef.current?.(movedLat, movedLng);
    });

    markerRef.current = marker;
  }, [lat, lng, label]);

  return (
    /* Two divs, and the split is load-bearing. Leaflet writes its own classes
       onto the element it is handed — `leaflet-container`, `leaflet-grab`, the
       touch ones — and React sets `className` wholesale, so any re-render that
       changes the class string wipes them.

       That is not hypothetical: `frameClass` squares the bottom corners the
       moment an address is picked, which is exactly when the map went blank.
       Tiles lose `.leaflet-container .leaflet-tile { max-width: none !important }`
       and inherit Tailwind preflight's `max-width: 100%` instead, so the map
       collapses while the marker and the controls — styled by rules that aren't
       scoped to the container — stay on screen and make it look like only the
       tiles failed. Dragging goes with `leaflet-grab`.

       So the styling lives out here, where React is free to change it, and the
       inner div is Leaflet's alone with a class string that never varies.

       `isolate` matters: Leaflet gives its internal panes z-indexes up to 800,
       and without a stacking context of its own the map would paint straight
       over the suggestion list hanging down from the input above it. */
    <div
      role="application"
      aria-label={label ? `Map showing ${label}` : 'Map — no address picked yet'}
      className={`isolate w-full overflow-hidden ${frameClass} ${heightClass}`}
    >
      <div ref={containerRef} className="size-full" />
    </div>
  );
}
