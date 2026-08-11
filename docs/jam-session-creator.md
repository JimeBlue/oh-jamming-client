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
| 4 | Overview stored as **markdown** inside `content` | No backend change, real formatting, no HTML sanitisation. Editor library chosen in phase 5 |
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

### Phase 3 — The required steps, end to end

Title/summary, date + times, venue name, **address as plain text**, slot
duration with the live preview, instrument steppers, genre and level chips,
submit with pending state and API error mapping.

After this the form produces a valid session. Everything later is enrichment.

Each step's real fields replace its entry in `PLACEHOLDER_STEPS` at the bottom of
`JamWizard.tsx`. A step still in that set skips validation on Next, and while the
set has anything in it the publish button stays disabled — so emptying it is what
turns the wizard on.

**Verification owed here:** real expired-token recovery. The single-flight
refresh in `src/services/api.ts` is proven against a stubbed fetch (5
simultaneous expiries → 1 refresh) but never against a real 15-minute expiry.
Needs `ACCESS_TOKEN_TTL` in `oh-jamming-api/src/utils/jwt.ts` temporarily
lowered. It matters because the API deletes **every** session for a user if it
sees a rotated refresh token reused — and a twenty-minute form is exactly where
an access token dies mid-session.

### Phase 4 — Address autocomplete + map

Photon (`photon.komoot.io`) debounced ~300ms — free, no key, CORS-open. Leaflet
+ OSM tiles for the pin.

Photon returns GeoJSON `coordinates: [lng, lat]`; **Leaflet takes `[lat, lng]`**.
Swapping them puts a Nürnberg venue in the Indian Ocean without erroring.

Free text must stay submittable when nothing is picked — the map simply doesn't
render. `Alte Werkstatt` in the seed data deliberately has no coordinates so
that path can be built against real data.

### Phase 5 — Overview

Markdown editor, bold/italic/link/lists. Library chosen here.

### Phase 6 — Preview step

Renders the assembled session as a musician will see it.

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
