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
| 2 | ~~Step 1 (image) ships with **placeholder copy**~~ | Superseded in phase 7 — the step uploads for real |
| 3 | AI generation is **deferred**; manual text entry works from the start | Needs a backend endpoint — the key can't live in the browser. Phase 8 |
| 4 | Overview stored as **markdown** inside `content` | No backend change, real formatting, no HTML sanitisation. TipTap + `tiptap-markdown` chosen in phase 5 — the editor is WYSIWYG, the stored value is still markdown |
| 5 | Genres and skill levels use **the API's lists**, not the mockup's | See the constraint table below |
| 6 | Image goes **browser → API → Cloudinary** | Decided at phase 7. Not an unsigned browser-direct preset: that name ships in the bundle. See the phase for the full reasoning |
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
| **Image** | Optional, and an https URL on `res.cloudinary.com` — anything else is a 400. It only ever comes from `POST /uploads/image` |
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

### Phase 7 — Image ✅ done *(backend first)*

API, on branch `feature/jam-session-image`: `middleware/parseImageUpload.ts`
(formidable), `middleware/uploadLimiter.ts`, `utils/cloudinary.ts`,
`controllers/uploads.ts`, `routes/uploadRoutes.ts`, `image` on
`jamSessionFields` / `JamSessionSchema` / `jamSessionOutputSchema`, three
optional `CLOUDINARY_*` variables in `config.ts`.

Client: `services/uploads.ts`, `api.upload` in `services/api.ts`, a real
`ImageStep`, `image` through `jamFormSchema` → payload → response →
`jamDraftSchema` → `JamListingView` and both adapters, `remotePatterns` in
`next.config.ts`.

Decisions, and the one that everything else follows from:

- **The file goes to the API, not straight to Cloudinary.** The alternative — an
  unsigned upload preset called from the browser — is fewer moving parts, but the
  preset name ships in the JS bundle and anyone who reads it can upload to the
  account. Going through the API keeps the secret server-side and makes the
  upload venue-only and rate-limited like every other write.
- **It is its own endpoint, not multipart on `POST /jam-sessions`.** This is
  where the class exercise doesn't transfer: there the target was four flat
  scalar fields, here the body is an address object, two arrays of objects and
  numbers with cross-field rules. Formidable flattens all of it to strings, so
  accepting the file on the create route would mean the client JSON-encoding four
  fields and `jamSessionInputSchema` decoding them back — on `PATCH` too. Bytes
  in, URL out; the session itself stays JSON.
- **The upload happens on publish, not when the file is picked.** This was built
  the other way first, and changed: uploading on pick meant every photo a venue
  tried and rejected stayed in Cloudinary forever, because nothing ever goes back
  to delete them. Now a venue who tries four images sends one, and an abandoned
  wizard sends none.
  What that costs is the reason it was built the other way to begin with: the
  draft is JSON in sessionStorage and a `File` isn't JSON — writing one produces
  `{}`, which the draft schema rejects, which would throw away the *whole* draft
  on reload rather than just the photo. So the file lives outside the form, in
  `JamImageContext`, and a reload loses the photo while keeping the other twelve
  fields. That asymmetry is the deliberate trade, not an oversight. (IndexedDB
  stores Blobs as themselves and would get reload-survival back, at the cost of a
  storage lifetime that isn't the tab's and would need its own cleanup.)
- **Both the step and the preview draw the pending photo from a `blob:` URL** —
  the browser reading the file off the disk it came from. No network, and the same
  bytes the API will get, which is what makes it a preview rather than a stand-in.
  `jamFormToListing` therefore leaves `image` empty and `PreviewStep` supplies it,
  since the adapter is a pure function inside `useWatch` and can't reach a React
  context. `JamListing` passes `unoptimized` for `blob:` sources, keyed off the
  scheme rather than off which caller it is: a file with no server behind it has
  nothing for next/image's optimiser to fetch.
- **A failed upload stops the publish.** The image goes up before
  `POST /jam-sessions`, and if it fails the session is not created — a night that
  quietly went live without the photo the venue chose is worse than one that
  didn't go live at all. The message says so, and points at step 1.
- **The stored URL's host is pinned** to `res.cloudinary.com` by the input
  schema. A listing is public, and an `<img>` pointed anywhere is a tracking
  pixel or an image whose contents can be swapped after the night was posted. The
  *output* schema is a plain optional string — re-running the rule on read would
  turn a session stored before it existed into a 500.
- **The `CLOUDINARY_*` variables are optional**, unlike every other one in
  `config.ts`. A deploy that forgets them loses image upload — a 503 on that one
  route — rather than refusing to boot.
- **A 1600px incoming transformation**, so the 6000px original a phone produced
  is never stored. Narrower crops stay available on delivery by editing the URL.
- The temp file is deleted in a `finally`. Render's disk is ephemeral but not
  infinite, and a temp file per upload with nothing removing them is a leak that
  only shows up weeks later.
- **The drop zone is the control**, and there is no visible file input. The zone
  is a `<label>` wrapping a visually hidden `<input type="file">`, so clicking it
  opens the picker the way a label always has — no click handler — and the input
  keeps its place in the tab order and its "Session photo" name for a screen
  reader. A styled `<div>` calling `input.click()` looks identical and is
  reachable by mouse only. Drag-and-drop can be neither tabbed to nor announced,
  so it rides on top of a control that can be both.
  Two details that are easy to get wrong: `dragenter`/`dragleave` fire again for
  every child element crossed, so the highlight needs a depth counter rather than
  a boolean, and a `preventDefault` on `dragover` specifically is what makes the
  drop fire at all. A window-level guard swallows drops that miss the zone, which
  would otherwise replace the wizard with the raw image file.
- **Once there's a photo, the frame shows the photo and nothing else.** A first
  pass faded a "drop another photo" panel in on hover; it covers the one thing
  the venue came to this step to look at, and it covers it exactly when they lean
  in to check it. Replacing is *Remove photo, then choose another* — two steps
  that never hide anything. Dropping straight onto an existing photo still works,
  since the handlers are on the frame rather than on the prompt, it just isn't
  advertised.
- **The frame is only `aspect-video` once there is a photo in it.** The first
  pass fixed the ratio either way, on the reasoning that the venue should see the
  shape the listing crops to — but an empty aspect-video box on a desktop card is
  600px of dashed nothing, and the shape it previews is one nobody can judge
  while it is empty.

**One bug found in verification, worth keeping:** formidable's `maxTotalFileSize`
defaults to `maxFileSize` and is checked against a running total as the bytes
arrive, so a single oversized file trips `biggerThanTotalMaxFileSize` and never
reaches the per-file `biggerThanMaxFileSize`. Matching only the latter gave the
case that actually happens the generic message. Both codes now map to "larger
than the 5MB limit".

Verified against the local API: anonymous 401, musician 403, venue-without-
credentials 503, a real PNG 201, a PDF 400, a 7MB JPEG 413 with the size message,
a file sent under the wrong field name 400, and no temp files left behind.
`image` on a Cloudinary URL is stored and echoed, on another host 400, over http
400, omitted 201.

End to end in the browser, counting requests: three photos picked and changed on
step 1 produce **zero** upload requests; the preview step draws the third from its
`blob:` URL; clicking Publish produces exactly **one**, and the created session
carries a URL that resolves 200. A 2400px source comes back stored at 1600×900
(the incoming transformation) and is served through `/_next/image` at 560px for
the viewport. Reloading mid-wizard keeps all twelve form fields and drops only the
photo, with the step back to its empty prompt and no error. A PDF and a 7MB file
are both refused in the picker without a request. Before the credentials were set,
the 503 arrived as its own sentence.

### Phase 8 — AI overview *(backend first)*

`POST /ai/…`, venue-only, rate-limited, key server-side only — the same shape as
the upload endpoint, and for the same reasons. Bullets in, markdown out.

**Provider: Gemini, on the free tier.** No card on the project, so the failure
mode when the quota runs out is a 429 rather than an invoice. The trade is that
free-tier prompts and responses are used to improve Google's products, which is
survivable here only because of what gets sent: the venue's own typed bullets
and their own form fields, never anything read back out of the database. No
emails, no names, no other user's data. Worth a sentence in the README.

**Model: `gemini-3.5-flash-lite`** — Lite specifically, and this is the decision
worth writing down, because the obvious choice is wrong. Checked against this
project's own limits in AI Studio:

| Model | RPM | RPD |
|---|---|---|
| Gemini 3.6 / 3.5 / 3 Flash | 5 | **20** |
| Gemini 2.5 Flash Lite | 10 | 20 |
| **Gemini 3.5 / 3.1 Flash Lite** | **15** | **500** |
| Gemini 3.1 Pro, 2.5 Pro | — | **0** (no free tier) |

Full Flash is capped at 20 requests a day, which is not a demo-day problem so
much as a *development* problem: writing a prompt that produces a decent
overview takes twenty-plus iterations, and the cap would be gone before lunch.
Lite is 25× the daily quota and 3× the per-minute headroom for a task that
doesn't use what Flash costs more to have — this is bullets to ~150 words of
markdown in a fixed voice, a short constrained rewrite with a fixed output
schema. No reasoning, no long context, no code. The 20/day of full Flash is
still there, and is enough to A/B the same prompt against both during
development rather than guessing.

Google no longer publishes free-tier numbers in the docs; they are per-project
at `aistudio.google.com/rate-limit`. Check there rather than anywhere else. The
key lives in its own `oh-jamming` Google Cloud project rather than sharing one,
so its quota, its usage figures and its revocation are all isolated.

**Not tool calling**, and not an agent loop. Tool calling exists so a model can
fetch something it doesn't have or decide between actions; here the backend
already holds every input and there is exactly one thing to produce, so a tool
round-trip buys a second API call, more latency and a new failure mode (model
calls nothing, or calls with junk) to arrive at the same string.

**But structured output, yes** — `responseMimeType: 'application/json'` plus a
`responseSchema`, the technique from the class `gemini-sdk.ts` demo. Three
concrete reasons, none of them decorative: the editor round-trips markdown and
`MAX_OVERVIEW_CHARS` counts the asterisks, so the shape has to be stated rather
than hoped for; it kills the *"Here's a great overview for your session:"*
preamble that free text generation prepends, which is otherwise regexed off; and
the response Zod-parses on the way out like every other response in the API.

**Two steps get two tabs** — *Enter manually* and *Generate with AI* — over one
form field each: the **overview** on step 4 and the **short description** on step
2. Each field stays a single value with two ways of filling it, for the same
reason `JamListing` has one component and two adapters: the moment there are two
overviews, they disagree.

Both are the same component, `AiAssistedField`. The two differ in almost
everything visible — a markdown editor against a textarea, six paragraphs against
one line — and in nothing about how the tabs behave, and it is the behaviour that
would go subtly wrong if written twice: what happens to the notes on success,
which tab an error leaves you on, whether the button comes back.

**Both tabs go `text-primary` when active**, like the rest of the builder — a
pink active *Enter manually* was tried against its indigo pair and rejected;
which tab is which is carried by the label and the badge, not by colour.
Inactive is filled (`bg-base-200`) rather than transparent, so it reads as
"there is another one of these" instead of as empty space, and it takes the
active colour on hover, which answers "what happens if I click this" before the
click.

**Filling the inactive tab is what forced `[--tabcontent-radius-ss:0]`** on both
panels. daisyUI rounds the panel's top-left whenever the active tab is not the
first one, so selecting the second tab curves the panel away underneath the
first — which reads fine when the tabs float above a transparent panel, and does
not once the inactive tab is filled: the fill stays square while the panel
beneath it curves, leaving a notch at the card's left edge. Pinned square, so
the panel's left edge and the tab list's line up whichever tab is selected.

The label is **"Generate with"** followed by an `AI` badge carrying
`HiOutlineSparkles`. The badge keeps its colour when the tab is inactive, unlike
the rest of the tab, because it is finishing the label rather than decorating it
— and for the same reason the button carries an explicit
`aria-label="Generate with AI"`: the accessible name computed from the contents
comes back as the fragment *"Generate with"*.

**The summary is a different job, not a shorter overview**, which is why it is a
separate endpoint with its own brief rather than a length parameter. The overview
is what the night *is*, in full, with the backline laid out; the summary is the
one thing that would make someone stop scrolling, and it is told to pick one or
two things and leave the rest out — a night whose notes list five pieces of
backline is better sold by "full backline provided" than by the inventory. The
two sit next to each other on the listing, so an overview restated in miniature
above itself is wasted space. It is also **plain text**, because the summary is a
plain textarea and the listing renders it as a bare paragraph: markdown there
would show its own asterisks to every musician who saw the session.

Both routes share `aiLimiter`, which is the honest arrangement — the quota is one
quota, so ten summaries are ten fewer overviews.

**The generated summary is length-checked against the jam session's own
`min(10)`**, not just its maximum. That bound is reachable in a way the
overview's isn't: "Open jazz jam." is nine characters and a perfectly sensible
answer to a thin note, and it is one `POST /jam-sessions` refuses.

The flow, modelled on Eventfrog's: Generate is disabled while the notes are
empty. Clicking it keeps the venue on the AI tab with the button in a loading
state; on success the step switches to the manual tab with the generated
markdown in the editor. The notes stay on the AI tab, so re-generating is
*switch back, tweak, click again*. That is also what settles the "what if there
is already text there" question — a second generation overwrites, and that is
fine, because it took a deliberate trip to the other tab. The case worth
protecting against was silently clobbering hand-typed prose, and this flow
cannot do it.

Both the overview and the notes go in the sessionStorage draft. Eventfrog loses
the description on going back, which is a flaw and not a feature: this wizard's
whole premise is that walking back to step 3 leaves step 6 as you left it, and
the overview is the longest thing anyone types.

**The backend is done** — `POST /ai/overview` on `feature/ai-overview`:
`aiLimiter` → `authenticate` → `requireRole('venue')` →
`validateBody(overviewPromptSchema)`. `notes` in (≤1000 chars), `{ overview }`
out. `MAX_OVERVIEW_BLOCK_CHARS` is now exported from `jamSessionSchema` and used
by both the prompt and the validation of what came back, so an over-long
generation fails on step 4 rather than as a 400 at the end of the wizard.
`temperature: 0.9`, because a second click is a request for a different take.

**What prompt tuning actually found**, since none of it is recoverable from the
final string:

- **Structured output flattens newlines.** The first version produced
  `**What is provided:** * Backline including...` on one line — valid JSON,
  unrenderable markdown. The model needed telling that line breaks are real
  newline characters in the JSON string, with the blank line, the newline after
  the bold label and the `- ` prefix all spelled out.
- **A "no lists of one item" rule causes fabrication.** Told never to write a
  one-item list, the model invented a second line — "Drumsticks if you prefer
  your own", twice, from notes that never mentioned them. The rule was removed
  and replaced with the opposite: a one-line list is fine.
- **"At most one list" makes labels dishonest instead.** Constrained to a single
  list, it filed *bring your own guitar* under **Provided on stage** rather than
  splitting. Allowing a second labelled list fixed both the accuracy and the
  scannability.
- **A word count fights the no-invention rule, and wins.** "jazz jam" as the
  entire notes produced a listing with an upright bass, a piano, a sign-up board
  and two house rules, none of which exist — because 120 words cannot be written
  from two without inventing. Making the length follow the notes dropped that
  from every generation to roughly one in two.
- **And that fix then caused the opposite bug.** *"Write what the notes support
  and stop"* reads, to the model, as *a fluent paragraph is already finished* —
  so a venue who pasted prose instead of bullets got their own text back with the
  line breaks tidied. Bullets worked; paragraphs were a no-op, which is exactly
  the case that looks like a broken button rather than a bad result.
  The two rules had been conflated. Separating them fixed it: **rewriting is
  unconditional** (the notes are raw material, "a fluent paragraph is still a
  note"), and **length follows how much the notes *say*, not how long they are or
  how well they are written**.
- **The residual invention closed on a worked example, not another rule.**
  Restating "do not invent" a fourth time did nothing; naming the actual case did
  — *given only "jazz jam", the entire correct answer is a sentence or two … no
  backline, no house band, no sign-up procedure, no start time*. Three of three
  runs clean afterwards, with paragraphs and bullets unaffected.

**Flash vs Lite, same notes, one sample each:** Flash structured the backline as
a bullet list where Lite wrote prose — but Flash also opened with "Our *weekly*
blues and soul night", inventing a frequency the notes never gave. The structure
gap closed with the prompt change above; the fabrication was the same class of
error in the more expensive model. Nothing found here argues for spending 25× the
daily quota.

Verified against the local API: anonymous 401, musician 403, venue 200 in ~1.4s,
empty notes 400, missing `notes` 400, an unknown key 400, 1001 characters 400,
1000 characters 200, and a key-less instance 503. Generated markdown renders
inside the editor's five supported marks with no headings.

**The front end**, and the two things in it worth knowing:

`overviewNotes` is a field on the form rather than component state, so it rides
the existing `subscribe` → sessionStorage mirror and survives a reload and a walk
back to step 4 for free. It is dropped in `toJamSessionPayload` the way
`toRegisterPayload` drops `confirmPassword` — the payload schema doesn't declare
it and `z.object` strips what it doesn't declare. Which is the reason these
adapters parse rather than cast: the API's schema *is* strict, so a client-only
field reaching the wire would be a 400 for the whole request.

The editor is keyed on a generation counter. `MarkdownEditor` seeds from
`defaultValue` once at mount and never re-reads it — right for typing, and the
reason text arriving from outside would otherwise never appear. Both tab panels
stay mounted (daisyUI hides with CSS), so switching tabs leaves the editor and
the caret alone; only a generation remounts it.

**A second bug, found by the API rather than by me:** `summaryNotes` was first
declared next to `summary` in `sharedFields` — which is spread into the *payload*
schema as well as the form's. A client-only field added there is declared on the
wire shape, survives the parse that was supposed to strip it, and comes back as
`Unrecognized key: "summaryNotes"` — a 400 for the whole publish, at the last
step of the wizard. Both notes fields belong in `jamFormFields` and nowhere else.
Worth keeping because the earlier note in `toJamSessionPayload` says the stripping
is automatic, and it is — but only for fields the payload schema doesn't declare,
which is a condition that file's spread makes very easy to break.

**A bug found in verification:** at 375px the two tab labels don't fit on one
line, and a wrapped `tabs-lift` list puts the lifted tab on one row and the panel
it is drawn as attached to under another — a broken border rather than two tabs.
`flex-nowrap` is not the fix and is worse: daisyUI lays the panel out as a flex
sibling that wraps onto its own row, so forbidding the wrap keeps the panel on
the tabs' line and the whole card scrolls sideways. The fix is to make the labels
fit — `tabs-sm` below `sm`, and the decorative **AI** badge hidden with it.

Verified in the browser: Generate disabled while the notes are empty and enabled
once they aren't; mid-flight the button reads "Writing…", the textarea is locked
and the venue stays on the AI tab; on success it switches to the manual tab with
the markdown in the editor, bold labels and bullets intact, while the notes stay
on the AI tab with the button live. A second generation returns different text.
A reload keeps the step, the overview and the notes. Publishing answers 201,
which is itself the proof that `overviewNotes` never left — the API's input
schema is strict. Signing out mid-step and generating shows the expired-session
message, keeps the notes and stays on the tab. No console errors on a clean run;
375px has no horizontal overflow and both tabs share a row.

---

## Deferred, deliberately

- **Musician-side routes.** `My spots` and `Book a spot` are still `href="#"` in `AccountMenu.tsx`; those pages don't exist and a link to a 404 is worse than one that visibly does nothing
- **Guest-only guard** on `/login` and `/register`. Nothing is at risk — a logged-in user just sees a form they don't need
- **`?next=` through registration.** It survives login but not register. A signed-out visitor who registers lands on `/my-backstage`, which has its own way through to the builder, so the path works with one extra click
- **Render auto-deploy.** Reads "On Commit" but has never fired — pushes aren't reaching Render. Deploys are manual until this is looked at. Suspects, cheapest first: Build Filters with a non-empty *Included Paths*; the Render GitHub App not having access to this repo; or the repo connected as a plain Git URL, which has no webhook at all
