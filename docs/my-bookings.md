# My bookings — decisions and plan

The musician's side of the booking. `/my-bookings`: the list of nights they are
playing, the QR they present at the door, and the two things they can do to a
booking — change it or drop it.

Written down for the same reason as `jam-session-creator.md`: the shape of this
was argued out in conversation, and the reasoning behind the edit flow in
particular is **not recoverable from the code**. What the code will show is a
cancel followed by a create. What it cannot show is that this is a deliberate
stand-in for an endpoint that doesn't exist yet, why the safer-looking order was
rejected, and what has to change to make it real.

**Nothing here is built yet.**

> ## Read this first if you are picking this up after demo day
>
> The edit flow below is **a simulation**. There is no edit endpoint on the API.
> "Save changes" cancels the whole booking and creates a new one, and the client
> hides the evidence. It is honest to the user about the outcome and dishonest
> about the mechanism.
>
> It is good enough to demo and it is not good enough to ship. The section
> [Making it real](#making-it-real) says exactly what to build to replace it,
> and it is roughly a day of API work that deletes more client code than it
> adds.

---

## The shape

`/my-bookings` is a route under `(site)`, wrapped in `RequireRole role="musician"`
— a venue reaching it gets the explanatory card, not a 404.

One `GET /bookings` with no query is the whole page's data. For a musician the
controller filters to `{ musicianId: userId }` and populates `jamSession` (five
fields) and `musician` (three), so a card can be drawn without touching
`/jam-sessions` at all. The session's slots are **not** in that projection —
which is why the edit modal fetches, and the list does not.

**Rows are spots; cards are bookings.** One submission writes one Booking
document per claimed spot, all sharing a `groupId`. The page groups by `groupId`
and draws one card per group: the instruments are the rows inside it.

Actions live on the card, and the card's own modal holds the QR. There is no
`/my-bookings/[id]` route — a booking has nothing to link to, share, or bookmark,
and skipping the route skips a layout, a loader and a not-found state.

---

## Decisions (locked)

| # | Decision | Notes |
|---|---|---|
| 1 | **Group by `groupId`, one card per group** | A band's four spots are one booking to the person who made it. Counting rows counts spots; counting distinct groupIds counts bookings |
| 2 | **Cancel is whole-group only** | `DELETE /bookings/group/:groupId`. Per-instrument removal was designed and dropped — see [Rejected](#rejected-on-the-way-here) |
| 3 | **Edit is cancel + rebook, presented as an edit** | The user is told their booking changed, not how. See [The edit flow](#the-edit-flow) |
| 4 | **Cancel first, then book** — never the reverse | Book-first looks safer and is broken. See the constraint table |
| 5 | **A cancelled group is hidden when a confirmed group exists for the same session** | One client-side filter. It is what keeps the edit's tombstone off the list, and it stands on its own merits besides |
| 6 | **Edit and Cancel are hidden on past and cancelled bookings** | The API has no date rule (see constraints), so this is the only thing stopping someone cancelling a night that already happened |
| 7 | **Edit stays inside one session** | `POST /bookings` takes one `jamSessionId` and one `slotId`. Playing a different night is a different booking by any reading |
| 8 | **`bandName` is not editable** | There is no PATCH, so it cannot be. Deliberately not worked around |
| 9 | **The QR lives in a modal, not on the card** | Four cards each showing a QR is four scannable codes on one screen and no way to tell which is which at the door |

---

## API constraints this page has to respect

Checked against `oh-jamming-api/src/controllers/bookings.ts`,
`src/schemas/bookingSchema.ts` and `src/models/Booking.ts`.

| Rule | Detail |
|---|---|
| **There is no `PATCH /bookings/:id`** | BK15, deferred. `bookingSchema.ts` says so in prose and gives the reasoning. This single absence is what produces everything odd below |
| **One Booking document is one spot** | So a per-instrument cancel already exists (`DELETE /bookings/:id`) and needs no new endpoint. It just isn't what we're using |
| **`POST` mints a new `groupId` *and* a new `qrCode`** | Generated per submission in the controller. `bookingInputSchema` is a `strictObject`, so a client that tries to supply either takes a 400. **Any create is a new QR code** |
| **A confirmed booking blocks its own spot** | Partial unique index on `{ spotId }` where `status: 'confirmed'`. Re-claiming a spot you already hold is a 409 *against yourself* — this is what rules out book-first-then-cancel |
| **Cancel is a soft delete** | BK11. Status goes to `cancelled`, the row stays, `releaseSpot` puts the spot back on the board. The row surviving is what makes the filter in decision 5 necessary |
| **Cancel is idempotent** | `cancelOne` returns early if already cancelled, so a double-click is not a 409 and the button needs no guard beyond a spinner |
| **Cancel has no date rule** | `cancelOne` checks status and nothing else. A booking for last month can be cancelled today. The client hiding the button is the only thing preventing it |
| **`GET /bookings` returns cancelled rows deliberately** | `bookingQuerySchema` has no `status` filter, and the comment explains why: they are the record of who dropped out. Splitting them is the client's job |
| **The claim is all-or-nothing** | BK07 — if any spot in a submission was taken meanwhile, none are claimed and the response is 409. Good for us: a failed rebook leaves no partial booking to clean up |
| **Ten spots per submission** | `MAX_SPOTS_PER_BOOKING`, mirrored client-side in `schemas/booking.ts` |
| **Cancel is musician-only, own-bookings-only** | BK12. A venue cannot remove one musician from a night it is still running |

---

## The edit flow

What the user sees: **Change booking** → a modal with the night's time slots and
instruments, their current choice pre-selected → they change something → **Save
changes** → the card updates.

What happens:

```
1. GET  /jam-sessions/:id           fresh slots — who else has booked since
2. DELETE /bookings/group/:groupId  the old booking, all rows, spots released
3. POST /bookings                   the new selection
4. refetch GET /bookings            redraw the list
```

### Why cancel first, when that is the order that can lose spots

Because the safe-looking order does not work at all.

Book-first-then-cancel is the standard shape for this — if the new claim fails
you still hold the old booking, nothing is lost. It breaks here on the partial
unique index. Keep Guitar at 20:00 and add Bass, and step 3 tries to claim the
Guitar spot **that your own confirmed booking is still holding**. 409, against
yourself, on the most ordinary edit there is. It only works when the new
selection shares no spot with the old one, which is a condition too subtle to
build a flow on.

So: cancel first, uniformly, one code path. The cost is a window — a few hundred
milliseconds where the old spots are free and someone else could take them —
and if that happens the musician has lost a booking while trying to change it.

### The rollback

Step 3 failing is therefore not "show an error". It is:

```
3.  POST new selection
3a.   on 409 → POST the *original* selection (just released by step 2)
3b.     succeeded → tell them nothing changed, those spots had gone
3c.     failed too → say plainly that the booking could not be restored,
                     and show what is still available
```

3c is the genuinely bad outcome and it needs two people racing the same spot
inside the same second. It has never been observed because nothing has been
demoed under load — which is not the same as it being impossible.

### What leaks

| Leak | Handling |
|---|---|
| The old booking is now a cancelled row and would appear in the list | The filter from decision 5 hides it |
| The QR token changes | Invisible in practice — the QR is only ever read from inside the app. **Do not add a "save this code" or "add to wallet" feature while this flow is a simulation** |
| `createdAt` resets | A booking made in March and edited in August reads as made in August. Nothing displays it today |
| Two writes where the user made one gesture | Only visible to whoever is reading the database |

### The pre-selection detail that will trip you up

`InstrumentPicker` renders any spot with a non-null `bookingId` as **Taken** and
disables it. In the edit modal, the spots the musician is editing *are* booked —
by them. So the modal needs the set of their own `spotId`s and has to treat those
as selected-and-selectable, not taken. It is the one behavioural difference
between the picker in the flow and the picker in the modal, and it is why the
modal cannot simply reuse the component untouched.

---

## The cancelled-shadow filter

```
Hide a cancelled group when the same jamSession.id also has a confirmed group.
```

Written as a rule about bookings rather than as a rule about edits, because it is
true either way: if you are still playing a night, the spots you dropped for it
are not news. A musician who cancels a booking outright still sees it — that is
the record of what they dropped, and it is the only place it exists.

It happens to also hide every tombstone the edit flow produces, which is the
reason it is being built now rather than later. When the real endpoint lands the
filter can stay: it will still be doing the honest half of its job.

---

## Rejected on the way here

**Per-instrument removal on the card.** Each spot gets an `×`, removing one fires
`DELETE /bookings/:id`, the spot goes back on the board, same group and same QR.
Genuinely simple, no race, nothing to roll back, and it maps exactly onto the
API's granularity.

Dropped because it is a band feature. A musician who booked one instrument for
themselves has one row, and removing it is indistinguishable from cancelling. It
also cannot express the most likely edit — *play at nine instead of eight* — and
adding an instrument through it produces a second group and a second QR code.

**A per-instrument swap** (drop Bass, take Drums, same group). Same objection,
worse: the add half mints a new group, so a swap leaves one night wearing two QR
codes.

**Sending the musician back through the booking flow.** No modal, no diff — just
a link to `/jams/[id]`. Rejected because nothing cancels the old booking, so the
musician ends up holding both, which is the one outcome an "edit" must not
produce.

**Diffing the selection and syncing spot by spot** — keep unchanged, `DELETE` the
dropped, `POST` the added. The order is safe and no spot is ever released
unnecessarily. Defeated by the same fact as everything else: the `POST` half
mints a new `groupId`, so any edit that adds an instrument splits the booking in
two.

Every rejected option dies on the same rock. **There is no way to change a
booking and keep its identity, because there is no endpoint that changes a
booking.**

---

## Making it real

One endpoint removes every compromise on this page.

### `PATCH /bookings/group/:groupId`

Body: `{ slotId, spotIds }` — the same vocabulary as `POST /bookings`, describing
the booking's new shape rather than a delta.

It must **keep the `groupId` and keep the `qrCode`.** That is the whole point:
the booking keeps its identity, so there is no tombstone, no new code, and
nothing for the client to hide.

Sketch, all of it inside the controller that already owns `claimSpot` and
`releaseSpot`:

1. Load the group, 404 if empty, 403 unless every row is the caller's (BK12).
2. Refuse if the session is cancelled or its date has passed — **the date rule
   `cancelOne` is also missing**, and it belongs here too.
3. Diff `spotIds` against the group's current spots.
   - unchanged → leave the document alone
   - removed → `releaseSpot` + mark the row cancelled
   - added → `claimSpot`, then write a new Booking row **carrying the existing
     `groupId` and `qrCode`**
4. Claim the additions **before** releasing the removals, and compensate on
   failure by releasing whatever was claimed. The self-conflict that forces
   cancel-first on the client does not exist here: the unchanged spots are never
   re-claimed, so nothing collides with itself.
5. A slot change is every spot removed and every spot added. It needs no special
   case, only the ordering in 4.

`bookingInputSchema`'s closing comment argues this endpoint shouldn't exist — that
an edit changing `slotId` is "a rebook wearing a different verb". That was right
about the *data* and wrong about the *user*, and it is the note to revisit first.
Rebooking is exactly what it does. The reason to give it a verb is that the
booking's identity — its group, its QR, the row in the musician's history —
survives the operation, and a cancel-plus-create cannot make that survive.

### What that deletes from the client

- The rollback path (steps 3a–3c) — one `PATCH`, one failure mode
- The cancel-first reasoning, and the comment explaining the self-conflict
- Any warning about the QR changing
- The tombstone half of the cancelled-shadow filter (the filter itself stays)

The edit modal keeps its shape entirely: same live fetch, same pre-selection,
same Save button. Only what Save calls changes.

### Smaller things worth fixing at the same time

- **A date rule on `cancelOne`.** Cancelling a booking for a night that already
  happened should be a 409, not a silent success. The client hiding the button is
  not enforcement.
- **Per-instrument removal**, once edit is real. `DELETE /bookings/:id` already
  does it correctly; it just needs somewhere to be clicked, and with a real PATCH
  it stops being the *only* way to change a booking and starts being a shortcut.
