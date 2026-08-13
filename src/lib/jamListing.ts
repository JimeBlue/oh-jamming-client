import { buildSlotPlan } from '@/lib/slotPlan';
import { utcMidnightToDateString } from '@/lib/time';
import type {
  Genre,
  JamFormValues,
  JamSession,
  SkillLevel,
} from '@/schemas/jamSession';

/* One shape for the musician-facing listing, and the two ways of filling it in.

   The listing exists twice over: as the last step of the builder, where it is
   drawn from a form nobody has posted yet, and as the page a musician opens,
   where it is drawn from a session the API has stored. Those two sources have
   almost nothing in common — the form holds markdown, a slot length and
   instrument rows sitting at zero; the response holds text blocks, generated
   slots and spots with bookings on them — so without something in the middle,
   "the same listing" becomes two components that gradually stop agreeing about
   what a session looks like.

   This is that middle. Both adapters are here rather than beside their callers
   so the differences between the two sources are visible side by side, in one
   screenful, instead of being rediscovered later. */

export type JamListingSlot = {
  id: string;
  /* "HH:mm", already wall-clock in the venue's city — see lib/time. */
  startTime: string;
  endTime: string;
  /* Availability is counted, never stored: the API's model has no counter, only
     spots with a booking on them or without one. */
  spotsFree: number;
  spotsTotal: number;
};

export type JamListingLine = {
  instrument: string;
  spotsTotal: number;
};

export type JamListingView = {
  title: string;
  summary: string;
  /* A Cloudinary delivery URL, a blob: URL, or "" for a session with no photo.
     The blob: case is the builder's: the photo is still a File in the tab until
     the venue publishes, so the preview step draws it straight from disk and
     supplies it here itself. Anything rendering this has to cope with all three,
     which in practice means not assuming there is a server behind the URL. */
  image: string;
  /* "YYYY-MM-DD" — a calendar day, not an instant. Kept as the string both
     sides speak so that formatting it is one job done in one place. Empty only
     while the builder is still being filled in. */
  date: string;
  startTime: string;
  endTime: string;
  venueName: string;
  address: { formatted: string; lat?: number; lng?: number };
  /* Markdown. Rendered inside `.rich-text`, same as the editor. */
  overview: string;
  genres: Genre[];
  skillLevel: SkillLevel[];
  /* What every slot offers. The template repeats identically across all of
     them, which is why it is stated once rather than per slot. */
  lineUp: JamListingLine[];
  slotDurationMinutes: number;
  slots: JamListingSlot[];
};

/* The builder's form -> the listing.

   Two things the form is missing have to be worked out here. The slots don't
   exist yet — `buildSlotPlan` runs the same arithmetic the API will run, purely
   so the venue can see the result before committing to it — and neither does
   availability, because a session nobody has posted has nothing booked on it.
   Every spot is free, which is exactly what the venue is about to publish. */
export const jamFormToListing = (values: JamFormValues): JamListingView => {
  /* A row at zero is an untouched stepper, not an instrument on offer. The
     payload drops these too, so the preview shows what will actually be sent. */
  const lineUp = values.instrumentTemplate.filter(({ spotsTotal }) => spotsTotal > 0);
  const spotsPerSlot = lineUp.reduce((total, { spotsTotal }) => total + spotsTotal, 0);

  const plan = buildSlotPlan(values.startTime, values.endTime, values.slotDurationMinutes);

  return {
    title: values.title,
    summary: values.summary,
    /* Empty, always: the photo isn't in the form. It's a File held in
       `JamImageContext` until publishing, and `PreviewStep` — which is the only
       caller of this adapter, and the only place with access to that context —
       fills it in. Reaching for the context here would make this function
       depend on React, and it is a pure mapping used inside `useWatch`. */
    image: '',
    date: values.date,
    startTime: values.startTime,
    endTime: values.endTime,
    venueName: values.venueName,
    address: values.address,
    overview: values.overview,
    genres: values.genres,
    skillLevel: values.skillLevel,
    lineUp,
    slotDurationMinutes: values.slotDurationMinutes,
    slots:
      plan?.slots.map(({ startTime, endTime }) => ({
        /* The boundary itself, because the API's `slotId` doesn't exist until
           the session is posted. Stable across keystrokes, and unique — no two
           slots in one session can start at the same minute. */
        id: `${startTime}-${endTime}`,
        startTime,
        endTime,
        spotsFree: spotsPerSlot,
        spotsTotal: spotsPerSlot,
      })) ?? [],
  };
};

/* The API's session -> the listing.

   Written alongside its twin rather than when the musician's page is built, and
   deliberately so: the whole point of the shape above is that both sources can
   fill it, and a shape only one of them has ever been fitted to is a promise
   nobody has checked. This one typechecks against `jamSessionSchema`'s output
   today, so a field the response can't supply is a build error now instead of a
   redesign later. */
export const jamSessionToListing = (session: JamSession): JamListingView => ({
  title: session.title,
  summary: session.summary,
  /* Optional on the wire, "" in the view model — one of the two adapters' jobs
     is exactly this, so the component never has to ask which source it is
     drawing from. */
  image: session.image ?? '',
  date: utcMidnightToDateString(session.date),
  startTime: session.startTime,
  endTime: session.endTime,
  venueName: session.venueName,
  address: session.address,
  /* The API stores the overview as blocks; the editor only ever produces one.
     Joined with a blank line so a session written by some future multi-block
     editor still reads as separate paragraphs rather than one run-on. */
  overview: session.overview.map(({ content }) => content).join('\n\n'),
  genres: [...session.genres],
  skillLevel: [...session.skillLevel],
  lineUp: session.instrumentTemplate.map(({ instrument, spotsTotal }) => ({
    instrument,
    spotsTotal,
  })),
  slotDurationMinutes: session.slotDurationMinutes,
  slots: session.slots.map(({ slotId, startTime, endTime, spots }) => ({
    id: slotId,
    startTime,
    endTime,
    spotsFree: spots.filter(({ bookingId }) => bookingId === null).length,
    spotsTotal: spots.length,
  })),
});

/* "Wednesday, 16 September 2026".

   Built once at module load, and pinned to UTC because the value it formats is
   a calendar day rather than a moment — the same reason it is a string in the
   view model at all. */
const listingDateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export const formatListingDate = (date: string): string | null => {
  if (!date) return null;

  const parsed = new Date(`${date}T00:00:00Z`);

  /* A draft written by an older build could carry anything. An unreadable date
     is shown as no date rather than as "Invalid Date". */
  return Number.isNaN(parsed.getTime()) ? null : listingDateFormatter.format(parsed);
};
