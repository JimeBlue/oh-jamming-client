# Jam session creator — decisions and plan

The venue-only wizard at `/jams/new` that produces one `POST /jam-sessions`.

Written down because these decisions were made in conversation and aren't
recoverable from the code: the *what* is in `src/`, but the *why*, the phase
order, and the things deliberately left out are only here.

Branch: `feature/jam-session-creator`.

---

## Decisions (locked)

| # | Decision | Notes |
|---|---|---|
| 1 | **8 steps**, single route, client state | Not a route per step: there is no draft endpoint, nothing is stored until the final POST, so `/jams/new/step-5` would advertise resumability the API can't back |
| 2 | Step 1 (image) ships with **placeholder copy** | The API has no image field yet. Real upload is phase 7 |
| 3 | AI generation is **deferred**; manual text entry works from the start | Needs a backend endpoint — the key can't live in the browser. Phase 8 |
| 4 | Overview stored as **markdown** inside `content` | No backend change, real formatting, no HTML sanitisation. TipTap + `tiptap-markdown` chosen in phase 5 — the editor is WYSIWYG, the stored value is still markdown |
| 5 | Genres and skill levels use **the API's lists**, not the mockup's | See the constraint table below |
| 6 | Image storage decided **later**, at phase 7 | The user has requirements to bring to that conversation |
| 7 | Submit lands on **`/my-backstage`** | Built as a placeholder in phase 1 so the address is already correct |
| 8 | Signed-out on a protected page → **`/login?next=…`**, returning to the page they wanted | Role home stays the fallback when there's no `next` |
| 9 | Wrong role → **explanatory message**, never a 404 | They aren't lost, they hold the other kind of account |
| 10 | Header CTAs stay **visible to everyone** | They're how a first-time visitor learns the product has two sides; the click teaches |

### The eight steps

1. Image · 2. Title & description · 3. Date, time & location · 4. Overview
5. Time slots · 6. Instruments · 7. Genres & skill levels · 8. Preview

Genres and skill levels share a step — same chip interaction, both
catch-all-exclusive. That's what makes the count 8.

Defined in `src/config/jamSteps.ts`, which is the single source for the bar
and the card headings.

---

## API constraints the form has to respect

Checked against `oh-jamming-api/src/schemas/jamSessionSchema.ts`. Each of these
is a 400 if the client gets it wrong, and several contradict the original
design sketches — which is why they're written down rather than rediscovered.

| Rule | Detail |
|---|---|
| **Genres** | `all-genres, blues, electronic, experimental, folk, funk, hip-hop, jazz, latin, metal, pop, reggae, rock, soul`. The mockup's *Bossa Nova, Fusion, Classical* do not exist |
| **Skill levels** | `all-levels, beginner, intermediate, advanced`. There is no *Expert* |
| **Catch-alls are exclusive** | `all-genres` / `all-levels` cannot be combined with a specific value, and duplicates are rejected. Tapping ✦ must clear the rest, and vice versa |
| **Times are `HH:mm`, max `23:59`** | `24:00` is invalid. Sessions **cannot cross midnight** — the model carries one calendar date, so 22:00–02:00 has no unambiguous meaning |
| **Slots must divide evenly** | A leftover remainder is rejected outright (JS06), not truncated. The form must **disable** durations that don't divide, not warn about them |
| **Slot duration** | 15–240 minutes, whole numbers |
| **Caps** | ≤24 slots, ≤20 instruments, ≤20 spots per instrument, ≤300 spots total |
| **At least one instrument** | `instrumentTemplate` has `min(1)`, so an all-zero form is a 400. Filter zeros, then block Next if nothing is left |
| **Date** | `YYYY-MM-DD`, not in the past; if today, `startTime` must still be ahead |
| **Address** | Only `formatted` is required. `lat`/`lng` come **as a pair or not at all** |
| **Overview** | `[{ type: 'text', content }]`, ≤2000 chars per block, ≤20 blocks |
| **Server-generated** | `slots`, `spotId`, `label`, `bookingId`, `venueId`, `status`. The input schema is a `strictObject`, so sending any of them is a 400 rather than being ignored |

Endpoint: `POST /jam-sessions`, `authenticate` then `requireRole('venue')` — so
anonymous is a 401 and a musician is a 403. Two different messages.

---

## Phases

### Phase 1 — Route, shell, guard ✅ done

`(site)` / `(builder)` route groups, `JamBuilderHeader`, `RequireRole`,
`lib/nextPath.ts`, `JamStepBar`, `JamWizard` shell, `/my-backstage` placeholder,
venue account-menu links, `?next=` on login.

### Phase 2 — Schema, state, service ✅ done

- `src/schemas/jamSession.ts` — three schemas, not one: `jamFormSchema` (what
  react-hook-form holds), `jamSessionPayloadSchema` (what goes on the wire, a
  mirror of the API's input schema), and `jamSessionSchema` (what comes back).
  `toJamSessionPayload` maps between the first two.
- `src/lib/time.ts` mirrors the API's `utils/time` — the past-date rule has to be
  checked against Berlin's clock, not the browser's, or the client and the API
  disagree about what "today" is.
- One RHF form across all steps in `JamWizard`, shared through `FormProvider`;
  Next validates only its own step via `trigger(JAM_STEP_FIELDS[id])`.
- `src/lib/jamDraft.ts` — sessionStorage mirror, written through `subscribe`
  rather than `watch` so keystrokes don't re-render the wizard.
- `src/services/jamSessions.ts` → `createJamSession`.

Two things learned here that the code depends on:

- **Zod 4 runs object-level checks even after a field-level one fails.** That is
  what makes per-step validation possible at all: "the end time is before the
  start time" surfaces on step 3 while the genre chips on step 7 are still empty.
  It does *not* run them when a key is missing or holds the wrong type, which is
  why `emptyJamForm()` gives every field a real value rather than `undefined`.
- **A stepper sitting at zero is a legal form state and an illegal payload.** The
  form allows `spotsTotal: 0`, `toJamSessionPayload` drops those rows, and a
  cross-field rule makes sure at least one row survives the drop.

Verified by running `toJamSessionPayload`'s output through the API's own
`jamSessionInputSchema` — the real oracle, not a second reading of it.

### Phase 3 — The required steps, end to end ✅ done

One component per step under `src/components/jams/steps/`, wired to the wizard
through `STEP_FIELDS` in `JamWizard.tsx`. The placeholder machinery is gone and
the wizard publishes for real.

- `JamField` carries the label / control / message stack the auth forms inline
- The **slots step** greys out lengths that don't divide the session and shows
  the boundaries it would produce; `src/lib/slotPlan.ts` does that arithmetic and
  the instruments and preview steps read it too
- The **instruments step** shows spots-per-slot × slots, because the 300 cap is
  a product of two numbers entered three steps apart
- The **overview step** is a plain textarea; the value is already markdown, so
  phase 5 adds a toolbar rather than a migration
- The **preview step** was a recap, not the musician-facing listing — replaced
  in phase 6

Decisions taken while building:

- **`mode: 'onTouched'`.** Next validates with `trigger`, which never sets
  `isSubmitted`, so RHF's automatic re-validation never switches on and an error
  would sit there while the venue types the fix. Controls that are clicked rather
  than typed in — steppers, chips — never blur, so they call `trigger` themselves.
- **Enter means "next", not "publish".** On steps 1–7 the form's submit handler
  advances instead of submitting; only step 8 publishes.
- **Failed publish walks to the problem.** `onInvalid` finds the first step
  owning a broken field and goes there. The path that reaches it is a draft that
  went stale overnight — a date that was in the future when it was saved.
- The **spot stepper reads `getValues`**, not the rendered count, so two taps
  inside one frame don't both start from the same number.

Verified end to end against the local API: `POST /jam-sessions` → 201, six slots
of five spots, labels generated (`First Guitar`, `Second Guitar`, …), zero-spot
rows dropped, overview stored as one text block, address stored without
coordinates. A test session (**Thursday Night Jam, 2026-09-17**) is sitting in
the local dev database as a result — re-seed to clear it.

**Verification owed here:** real expired-token recovery. The single-flight
refresh in `src/services/api.ts` is proven against a stubbed fetch (5
simultaneous expiries → 1 refresh) but never against a real 15-minute expiry.
Needs `ACCESS_TOKEN_TTL` in `oh-jamming-api/src/utils/jwt.ts` temporarily
lowered. It matters because the API deletes **every** session for a user if it
sees a rotated refresh token reused — and a twenty-minute form is exactly where
an access token dies mid-session.

### Phase 4 — Address autocomplete + map ✅ done

Photon (`photon.komoot.io`) for the suggestions, Leaflet + OSM raster tiles for
the pin. Both free and keyless, which is the whole reason for them over Google
Places or Mapbox: a key would have to sit in `NEXT_PUBLIC_*` — published to
anyone who opens devtools — or behind a proxy route on the API, and this phase
wanted no backend change. The price is coverage: Photon knows what OSM knows.

- `src/services/geocoding.ts` — the query, and OSM's parts assembled into two
  lines. Deliberately **not** routed through `services/api.ts`: a third party
  must not receive our cookies, must not trigger a session refresh on a 401, and
  a geocoder being down is a degraded input rather than a failed request
- `src/hooks/useAddressSearch.ts` — 300ms debounce, one in-flight request,
  aborted on the next keystroke
- `src/components/jams/steps/AddressField.tsx` — the combobox, and the whole
  `address` object rather than `address.formatted` alone
- `src/components/jams/steps/VenueMap.tsx` — loaded through `next/dynamic` with
  `ssr: false`, because Leaflet reads `window` at import time

Decisions and traps, in the order they bite:

- **Photon returns GeoJSON `coordinates: [lng, lat]`; Leaflet takes
  `[lat, lng]`.** Swapping them puts a Nürnberg venue in the Indian Ocean
  without erroring. The pair is split into named numbers in the service and the
  array never leaves that file.
- **The map is on screen from the first paint**, Germany at country scale, with
  no pin. Rendering it only once coordinates exist would hide it at exactly the
  moment it earns its keep: an empty map is what tells the venue that picking a
  suggestion buys them something. One map instance is built and kept — the pin
  and the view move, nothing is torn down — because rebuilding would re-request
  every tile in view from a volunteer-funded server, and for the same reason the
  zoom-in is `setView` rather than the prettier `flyTo`, which would drag a
  corridor of tiles across half of Germany on the way.
- **Typing after picking drops the coordinates.** The text and the pin are one
  fact; a stale pin pointing at the last place chosen is worse than no pin. This
  is why the field controls the whole `address` object.
- **Free text stays submittable.** The API asks only for `formatted`, and plenty
  of real rooms aren't in OSM — `Alte Werkstatt` in the seed data has no
  coordinates on purpose. No match, a failed lookup and a typed-out address all
  end the same way: it posts, without a pin.
- **The search query is state of its own, not the field's value.** Deriving it
  from the form would fire a lookup and drop a list over the page the moment a
  saved draft was restored.
- **Enter belongs to the list while the list is open.** The wizard turns Enter
  into "next step", which would otherwise skip past a half-finished address
  behind a panel the venue was still reading.
- **daisyUI's `.input` is `position: relative` with an opaque background**, so
  the search icon inside it needs `z-10` — without it the icon is present,
  correctly positioned, and completely invisible. Found by looking, not by
  reading: every DOM measurement said it was fine.
- OSM's tile attribution is a licence condition, and Leaflet renders it itself.

Verified against Photon and the local API: 17 keystrokes produced exactly one
request; duplicate OSM entries for one building collapse to a single row;
arrow-keys and Enter pick a suggestion; a restored draft comes back with its pin
and fires no lookup; and a session published with coordinates round-tripped
`lat`/`lng` through the API's `strictObject` intact (**Phase 4 map test,
2026-10-15** — another one for the re-seed).

### Phase 5 — Overview ✅ done

TipTap 3 (`StarterKit` + `tiptap-markdown`) in `steps/MarkdownEditor.tsx`,
replacing the plain textarea. Five buttons — bold, italic, link, bulleted list,
numbered list — and nothing else. The stored value didn't change: markdown in a
single text block before and after, so nothing typed under the textarea needed
migrating.

**TipTap and Quill are HTML editors; this field is markdown.** That mismatch is
the whole reason `tiptap-markdown` is here — TipTap's own document is
ProseMirror JSON, markdown goes in at mount and the serialiser produces it again
on every change. It also means the value is *re-derived* rather than typed, so
the round-trip was tested rather than assumed: parse a stored draft, type one
word, and confirm the serialised markdown differs by exactly that word.

The `.rich-text` class in `globals.css` is the other half. Tailwind's preflight
strips list markers, bold weights and italics from everything, so markdown
rendered anywhere on this site looks like unformatted text until something
puts them back. The editor and the rendered listing wear the same class, so they
can't drift into showing one string two ways.

Decisions and traps from the build:

- **`StarterKit` ships more than five buttons' worth.** Headings, quotes, code
  blocks, strikethrough, underline and horizontal rules are switched off rather
  than left enabled and unlabelled — an editor that accepts a `# heading` from a
  paste but has no button for it is a surface with no edge.
- **`useEditorState` caches the snapshot it took while the editor was still
  null**, and only refreshes it on the first transaction. Gate a render on it
  — `if (!state) return skeleton` — and the toolbar never appears at all. The
  selector returns defaults instead, and only `editor` itself gates.
- **`immediatelyRender: false`.** TipTap builds real DOM. The builder is
  client-only today because the role guard renders a spinner until `/auth/me`
  answers, but relying on that would break this component anywhere else.
- **`editor.storage.markdown` is untyped** — tiptap-markdown never tells TipTap
  it added anything. Declared in `src/types/tiptap-markdown.d.ts` rather than
  cast at the call site, so removing the extension is a compile error rather
  than `getMarkdown is not a function` in the browser.
- `openOnClick: false` on links: a click inside the editor would otherwise
  navigate away from a wizard holding twenty minutes of unsaved typing.
- The link button opens a **native `<dialog>`** (`steps/LinkDialog.tsx`) wearing
  daisyUI's `modal` classes. `showModal()` brings the focus trap, the Escape key,
  the backdrop and the inert page behind it; a positioned div would mean writing
  all four by hand. Three things it has to get right:
  - **It sits inside the wizard's `<form>`**, so nothing in it is a form of its
    own and every button says `type="button"`. Enter in the field is intercepted
    and means Save — unintercepted it submits the wizard, which on the last step
    publishes the session.
  - **React's `autoFocus` can't focus it.** React focuses at mount, while the
    dialog is still `display:none`, and sets no `autofocus` attribute for
    `showModal` to find afterwards — so the dialog opened with the caret on the
    close button. Focused by hand in the effect instead.
  - **Escape closes the dialog without telling React**, which would leave the
    editor thinking it was still open and its link button dead. `onClose` syncs
    the state back, and it fires however the dialog was dismissed.
- The address is normalised before it is stored: a bare `ohjamming.com` becomes
  `https://ohjamming.com`, and anything carrying a scheme that isn't http(s) is
  refused rather than repaired — `javascript:alert(1)` is a valid URL.

`react-markdown` arrived here rather than in phase 6 — the preview step was
showing raw `**asterisks**` the moment the editor could produce them. No
sanitiser needed: it builds React elements, never an HTML string, so raw HTML in
the source is escaped and `javascript:` hrefs are dropped.

### Phase 6 — Preview step ✅ done

The recap is gone. Step 8 now renders `JamListing` — the same component the
musician's page will render — with a strip above it carrying the one thing a
listing can't say: what publishing will *create*.

- `src/lib/jamListing.ts` — `JamListingView`, and both adapters that fill it
- `src/components/jams/listing/JamListing.tsx` — the listing itself
- `src/components/jams/listing/JamSlotList.tsx` — the bookable slots
- `VenueMap` moved up to `src/components/jams/` — it is no longer a step's

The layout follows the wireframe: what the session **is** on the left (image,
pitch, overview, where), what a musician has to **decide** on the right (genre,
level, which slot). Three columns to two rather than the sketch's even split —
the right side is chips and a list of times, and given half a desktop page it
reads as mostly empty.

Decisions and traps:

- **A view model in the middle, not two components.** The builder's form and the
  API's response have almost nothing in common — markdown against text blocks, a
  slot *length* against generated slots, instrument rows sitting at zero against
  spots with bookings on them. Without something between them, "the same
  listing" quietly becomes two, and the layout a venue approved is not the one
  that ships.
- **Both adapters were written now**, though only `jamFormToListing` has a caller
  yet. A shape only one source has ever been fitted to is a promise nobody has
  checked; `jamSessionToListing` typechecks against `jamSessionSchema`'s output,
  so a field the response can't supply is a build error today rather than a
  redesign when the musician's page is built.
- **Availability is counted, never stored** — the API's model has no counter,
  only spots carrying a `bookingId` or not. In the preview every spot is free,
  which is exactly what a session nobody has posted has.
- **The slot list is interactive only when handed an `onSelect`.** That isn't a
  flag, it's the difference between the two places it renders: there is nothing
  to book on a session that doesn't exist yet, and rows that highlight under the
  pointer would promise the venue an action leading nowhere. Without a handler
  they are list items rather than disabled buttons — the same distinction said
  to a screen reader.
- **The map only mounts with coordinates.** The opposite call to the address
  field, where an empty country-scale map is what explains the autocomplete;
  here it would be a picture of Germany under someone's address.
- `useWatch({ control, compute })` rather than watching the whole form: the
  result is deep-compared, so a keystroke that doesn't change the listing doesn't
  re-render it, and unlike the bare `useWatch({ control })` it hands over fully
  typed values instead of a deep-partial defaulted field by field.

**Fixed here, but dating from phase 3:** clicking "Go to the next step" on step 7
published the session. React saw one `<button>` in one place across the step
change and reused the DOM node, so the click's own handler flipped that node's
`type` from `"button"` to `"submit"` — and the browser then ran the click's
default action on it. The preview appeared for a single frame on the way to
`/my-backstage`. The two buttons now carry `key="next"` and `key="publish"`,
which is the truth about them: different buttons that share a corner. React
unmounts one and mounts the other, and a click landing on a node no longer in the
document submits nothing. Confirmed against `e1a4d31` — the bug reproduces
there too, so nothing in phase 6 caused it; a complete form reaching step 7 is
simply what it takes to see it (an incomplete one is sent back by `onInvalid`
before anything is posted).

Verified in the browser against a restored draft: 4 slots × 8 spots read back as
"32 bookable spots", the markdown overview renders with its lists and link, the
pin lands on the address, zero-spot instrument rows are absent from the line-up,
and an empty draft degrades to "Untitled session" / "Date to be confirmed" /
"Not chosen yet" with no map. The interactive slot branch was exercised by
temporarily passing a handler — buttons, `aria-pressed`, indigo selection, no
form submit — and then reverted; nothing ships wired to it.

### Phase 7 — Image *(backend first)*

Add the field to the API, then step 1. Storage approach to be decided at the
time; the repo already talks to Cloudinary for the hero video
(`src/lib/cloudinary.ts`), so an unsigned browser-direct upload storing only the
returned URL is the cheap path.

### Phase 8 — AI description *(backend first)*

`POST /ai/…`, venue-only, rate-limited, key server-side only. A plain
completion — **not** tool calling: this is text→text, bullets in, prose out.

---

## Deferred, deliberately

- **Musician-side routes.** `My spots` and `Book a spot` are still `href="#"` in `AccountMenu.tsx`; those pages don't exist and a link to a 404 is worse than one that visibly does nothing
- **Guest-only guard** on `/login` and `/register`. Nothing is at risk — a logged-in user just sees a form they don't need
- **`?next=` through registration.** It survives login but not register. A signed-out visitor who registers lands on `/my-backstage`, which has its own way through to the builder, so the path works with one extra click
- **Render auto-deploy.** Reads "On Commit" but has never fired — pushes aren't reaching Render. Deploys are manual until this is looked at. Suspects, cheapest first: Build Filters with a non-empty *Included Paths*; the Render GitHub App not having access to this repo; or the repo connected as a plain Git URL, which has no webhook at all
