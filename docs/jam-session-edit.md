# Editing a published jam session — decisions and plan

The page a venue reaches from the pencil on `/my-backstage`, at
`/my-backstage/[id]/edit`. It produces one `PATCH /jam-sessions/:id` per saved
section — never one big save.

Written down for the same reason as `jam-session-creator.md`: the shape of this
was argued out in conversation, and the three flows that were rejected are worth
more than the one that was chosen. Nothing in `src/` will ever say why the
wizard wasn't reused.

**Nothing here is built yet.** Branch: `feature/edit-jam-session`.

Wireframe: [`jam-session-edit-wireframe.html`](./jam-session-edit-wireframe.html)
— open it in a browser. Four screens: default, a section open, the locked state
once musicians have booked, and narrow-screen stacking.

---

## The shape

`/my-backstage/[id]/edit` is a fourth child route under the existing detail
layout, so it gets the session and its bookings from `JamDetailContext` for free.
Two columns:

- **Left, an edit rail.** One row per editable section, each with a pencil.
  Clicking one opens a modal.
- **Right, `JamListing`, read-only and unmodified.** It redraws after each save.
  That redraw is the confirmation — there is no toast.

Each modal holds **the wizard step component that already owns those fields**,
unchanged, inside its own `FormProvider`. Save closes the modal and sends a
`PATCH` carrying only the dirty fields.

---

## Decisions (locked)

| # | Decision | Notes |
|---|---|---|
| 1 | **One section, one modal, one PATCH** | Not a single save at the end. This is forced by the API, not chosen for taste — see the constraint table |
| 2 | The modal's body is **the existing wizard step**, not a new form | Every step is a prop-less `React.ComponentType` reading `useFormContext`, so it drops into a modal as-is. See `STEP_FIELDS` in `JamWizard.tsx` |
| 3 | Each modal's form is seeded with the **whole session**, but renders one step | A form holding only `endTime` can't run the cross-field rules. Same merge-then-revalidate the controller does server-side |
| 4 | The PATCH body is **`dirtyFields`**, never the whole form | Two reasons, both hard: a full body always trips the frozen-field check (below), and `jamSessionFields` is a `strictObject` that 400s on `summaryNotes` / `overviewNotes` |
| 5 | `JamListing` is **not modified** | Its whole premise is that it doesn't know where it's rendering. Edit affordances live in the rail beside it, not threaded into its sections |
| 6 | Frozen sections are **disabled rows with a sentence**, not hidden | A venue whose date won't open needs to know it's because someone booked, not that the app is broken |
| 7 | The frozen set is **conditional on bookings**, not fixed | Date, times, slot length and line-up are freely editable while nothing is booked. Locking them permanently would mean cancelling and rebuilding a session to fix a typo'd start time |
| 8 | **Edit is a fourth item in `JamDetailNav`** | It's somewhere you go and come back from, so it gets a URL. A button on the header card was the alternative and is less discoverable |
| 9 | **No "Cancel this jam" on this page** | It lives on the board. A destructive action at the bottom of an edit rail is one that gets clicked by accident |
| 10 | The pencil on `BackstageRow` links **straight here** | It currently goes nowhere. Its disabled states — past, cancelled — already match what the API refuses |

---

## API constraints this page has to respect

Checked against `oh-jamming-api/src/controllers/jamSessions.ts` and
`src/schemas/jamSessionSchema.ts`.

| Rule | Detail |
|---|---|
| **Partial bodies only** | `updateJamSessionSchema` is `jamSessionFields.partial()` with "at least one field required". One field per request is exactly the shape it expects |
| **Frozen once booked (JS10)** | `date`, `startTime`, `endTime`, `slotDurationMinutes`, `instrumentTemplate` are refused with a **409** as soon as any spot has a `bookingId` |
| **…and "touched" means present** | The check is `update[field] !== undefined`. So a full-body PATCH always counts as shape-changing and 409s on any booked session, whatever actually changed. **This is what rules out every save-it-all-at-once flow** |
| **Cancelled sessions are a 409** | `PATCH` refuses them outright — editing a tombstone has no meaning, and allowing it would be the one route that looked like un-cancelling |
| **Shape edits regenerate the slots** | Changing `startTime` / `endTime` / `slotDurationMinutes` / `instrumentTemplate` throws the old slots away and rebuilds them. Safe only because JS10 has already established nothing is booked |
| **Cross-field rules re-run on the merged document** | The controller merges the update over the stored session and revalidates the whole shape — but **only when a shape field changed**, so a title edit doesn't re-run the past-date rule and reject a session happening tonight |
| **`image` cannot be cleared** | It is `.optional()` and pinned to `res.cloudinary.com`, so in a partial body `undefined` means "leave it alone" and `""` / `null` fail the URL check. Replace works today; remove does not. See open questions |
| **Ownership is the API's job** | `findOwnedJamSession` answers 403. The client check in `JamDetailShell` is a courtesy, not a guard |

`PATCH` returns the full updated session, which is what the page re-renders from.

---

## What gets edited, and by which step

| Rail row | Fields | Component | Always editable? |
|---|---|---|---|
| Photo | `image` | `ImageStep` (adapted — see below) | yes |
| Title & pitch | `title`, `summary` | `BasicsStep` | yes |
| Overview | `overview` | `OverviewStep` | yes |
| Where | `venueName`, `address` | `AddressField` + the venue name input from `WhenStep` | yes |
| Genres | `genres` | `TagsStep`, split | yes |
| Skill level | `skillLevel` | `TagsStep`, split | yes |
| Date & time | `date`, `startTime`, `endTime` | `WhenStep` | **only while nothing is booked** |
| Slot length | `slotDurationMinutes` | `SlotsStep` | **only while nothing is booked** |
| Line-up | `instrumentTemplate` | `InstrumentsStep` | **only while nothing is booked** |

`TagsStep` and `WhenStep` each cover two rail rows, so both need splitting or a
prop saying which half to render. The listing shows genres and skill level as two
separate panels, so two rows is the honest count.

---

## Rejected flows

Kept because each one looks cheaper than it is.

**Pencils on the listing itself.** The obvious reading of the wireframe, and
wrong: `JamListing` is deliberately a component that can't tell whether it's
drawing the builder's preview or a live session, and threading edit controls into
its sections is exactly what its own header comment warns against. The rail gives
the same affordance without touching it.

**Reuse `/jams/new` with a mode flag.** Costs more than it saves. The draft key in
`lib/jamDraft.ts` is global, so editing a session would overwrite a half-finished
new jam — and an existing draft would seed the edit form with the wrong session's
values. `jamFormSchema` validates the whole form on submit, so the past-date rule
would block editing tonight's session's description, which is precisely the case
the API goes out of its way to allow. And the frozen fields still have to be
locked, now as steps in a stepper that has to explain why step 5 won't open.

**A second, parallel edit wizard.** Fixes the draft collision and nothing else.
Still needs the form adapter, the dirty-field PATCH, the frozen-field locking and
the image handling — and adds a wizard shell that will drift from the real one.
It also loses the thing worth having: in a stepper you edit a field on a blank
card with no idea what it does to the page.

---

## Phases

### Phase 1 — Route and rail

`/my-backstage/[id]/edit` as a fourth child route, `Edit` added to
`JamDetailNav`, the two-column layout, and the rail rendering its rows from the
session. Pencils are inert. `BackstageRow`'s pencil becomes a `Link` here.

The locked group reads its answer from `lib/jamReport.ts`, which already counts
booked spots — no second implementation of "is anything booked".

### Phase 2 — The form adapter

`jamSessionToForm` in `src/schemas/jamSession.ts`, beside `toJamSessionPayload`
and inverse to it: a stored `JamSession` back into `JamFormValues`. The overview
blocks join into one markdown string, the date becomes `YYYY-MM-DD`, and the
notes fields start empty.

It belongs next to its inverse for the same reason both `jamListing` adapters
live in one file — the two have to agree, and they only stay agreed if they're
read side by side.

### Phase 3 — Modal shell and the first section

A `JamEditDialog` — native `<dialog>` + daisyUI `modal`, following
`steps/LinkDialog.tsx`, which already solved the focus and Escape handling.

It owns the `useForm` seeded from phase 2, renders whatever step it's given, and
on submit sends only `dirtyFields` through a new `updateJamSession` in
`services/jamSessions.ts`. **Title & pitch** first, as the simplest real case.

`JamDetailContext` gains a way to replace the session with the PATCH response —
the shell fetches once in an effect keyed on `id`, so without this the listing
beside the modal stays stale.

### Phase 4 — The remaining text sections

Overview, Where, Genres, Skill level. `TagsStep` and `WhenStep` split.

### Phase 5 — Photo

The one section that isn't a plain PATCH: upload to `POST /uploads/image` first,
then `PATCH { image }`. Two requests that fail differently and need saying so
separately — a successful upload followed by a failed patch has left an orphan in
Cloudinary and changed nothing.

`JamImageContext` is **not** used here. It exists because publishing was deferred
to the end of the wizard; this modal has no draft to survive, so the file goes up
when the venue saves.

### Phase 6 — The locked sections

Date & time, Slot length, Line-up, live only on a session with nothing booked.
Last because they're the rarest case and the one that regenerates slots.

---

## Open questions

1. **Removing a photo needs an API change.** Widen `image` to accept a clear
   signal and `$unset` it in the controller, or make the Photo modal
   replace-only. Not decided.
2. **Scope.** The six sections in the original ask were photo, pitch, overview,
   address, genres and skill level. Date, slot length and line-up are in the plan
   because the API allows them while nothing is booked — cut phase 6 if that
   isn't wanted, and the locked group becomes a permanent one.
3. **Concurrency is ignored.** Two tabs editing one session, last write wins.
   There is no `updatedAt` check and the API has no `If-Match`. Fine at this
   size; worth naming so it isn't mistaken for an oversight.
4. **No unsaved-changes guard.** Closing a modal with edits in it discards them
   silently. Cheap to add later if it turns out to bite.
