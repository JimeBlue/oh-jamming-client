import { z } from 'zod';

import { isTime, nowInAppTimezone, timeToMinutes } from '@/lib/time';

/* Three schemas live here, and it's worth being clear up front about why it
   isn't one:

   - `jamFormSchema`   what react-hook-form holds while the venue fills the
                       wizard in. Shaped for inputs, not for the API: the
                       overview is one markdown string, and an instrument
                       sitting at zero spots is a legal state rather than an
                       error, because that's what an untouched stepper is.
   - `jamSessionPayloadSchema`  what goes over the wire. Mirrors the API's
                       `jamSessionInputSchema` exactly.
   - `jamSessionSchema`  what comes back.

   The numeric limits and the vocabularies are shared between the first two, so
   there's one definition of "at most 20 spots" rather than three that drift.

   None of this is a security boundary — the API validates independently and
   stays the authority. It exists so the venue is told what's wrong while
   they're still looking at the field, instead of after a round-trip. */

// ---------------------------------------------------------------------------
// Vocabularies and limits — mirrors oh-jamming-api/src/schemas/jamSessionSchema
// ---------------------------------------------------------------------------

/* Copied rather than fetched. They're a fixed part of the API's contract, and a
   request to learn them would put a network round-trip in front of the first
   render of a step. If the API ever extends a list, this file is the one place
   that has to follow. */

export const ALL_GENRES = 'all-genres';
export const genres = [
  ALL_GENRES,
  'blues',
  'electronic',
  'experimental',
  'folk',
  'funk',
  'hip-hop',
  'jazz',
  'latin',
  'metal',
  'pop',
  'reggae',
  'rock',
  'soul',
] as const;

export const ALL_LEVELS = 'all-levels';
export const skillLevels = [
  ALL_LEVELS,
  'beginner',
  'intermediate',
  'advanced',
] as const;

export const jamSessionStatuses = ['active', 'cancelled'] as const;

export type Genre = (typeof genres)[number];
export type SkillLevel = (typeof skillLevels)[number];

export const MIN_SLOT_DURATION_MINUTES = 15;
export const MAX_SLOT_DURATION_MINUTES = 240;
export const MAX_SPOTS_PER_INSTRUMENT = 20;
export const MAX_INSTRUMENTS_PER_SESSION = 20;
export const MAX_SLOTS_PER_SESSION = 24;
export const MAX_SPOTS_PER_SESSION = 300;
export const MAX_OVERVIEW_CHARS = 2000;

// ---------------------------------------------------------------------------
// Field pieces shared by the form and the payload
// ---------------------------------------------------------------------------

/* Exactly "HH:mm" — `precision: -1` is what drops the seconds, so "19:00:00" is
   rejected alongside "7pm", same as on the API. */
const timeField = (message: string) =>
  z.iso.time({ precision: -1, error: message });

/* The wording is the one real difference from the API's copy of these rules.
   The API answers a machine, so "min length is 3 chars" is fine there; this is
   read by someone mid-sentence in a text box. */
const sharedFields = {
  title: z
    .string()
    .trim()
    .min(3, 'Please use at least 3 characters')
    .max(120, 'Please use 120 characters or fewer'),

  summary: z
    .string()
    .trim()
    .min(10, 'Please use at least 10 characters')
    .max(500, 'Please use 500 characters or fewer'),

  /* Kept as "YYYY-MM-DD" rather than a Date, matching the API: the past-date
     rule below is a string comparison against Berlin's calendar day, and
     `<input type="date">` speaks this shape natively. */
  date: z.iso.date('Please choose a date'),
  startTime: timeField('Please enter a start time'),
  endTime: timeField('Please enter an end time'),

  venueName: z
    .string()
    .trim()
    .min(2, 'Please use at least 2 characters')
    .max(255, 'Please use 255 characters or fewer'),

  slotDurationMinutes: z
    .int('Please choose a slot length')
    .min(MIN_SLOT_DURATION_MINUTES, `Slots must be at least ${MIN_SLOT_DURATION_MINUTES} minutes`)
    .max(MAX_SLOT_DURATION_MINUTES, `Slots can be at most ${MAX_SLOT_DURATION_MINUTES} minutes`),

  genres: z
    .array(z.enum(genres, 'Unknown genre'))
    .min(1, 'Please choose at least one genre'),

  skillLevel: z
    .array(z.enum(skillLevels, 'Unknown skill level'))
    .min(1, 'Please choose at least one skill level'),
};

/* Only `formatted` is required. Coordinates come from the address autocomplete
   in phase 4 and are used for exactly one thing — the map pin — so a venue whose
   room isn't in OpenStreetMap can still type the address and post the session.

   The pairing rule matters more than it looks: a latitude without a longitude
   isn't half a location, it's no location, and the API rejects it. */
const addressSchema = z
  .object({
    formatted: z
      .string()
      .trim()
      .min(5, 'Please enter the full address')
      .max(255, 'Please use 255 characters or fewer'),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  })
  .refine(({ lat, lng }) => (lat === undefined) === (lng === undefined), {
    error: 'The map location is incomplete — pick the address from the list again',
    path: ['lat'],
  });

// ---------------------------------------------------------------------------
// The form
// ---------------------------------------------------------------------------

/* The venue types one instrument name per row and sets a number beside it. Zero
   is allowed *here* and nowhere else: it's what a stepper reads before anyone
   touches it, and rejecting it would mean the step opens covered in errors. The
   zero rows are dropped on the way to the payload, and `jamFormRules` below is
   what makes sure at least one row survives that. */
const instrumentRowSchema = z.object({
  instrument: z
    .string()
    .trim()
    .min(1, 'Please name the instrument')
    .max(60, 'Please use 60 characters or fewer'),
  spotsTotal: z
    .int()
    .min(0)
    .max(MAX_SPOTS_PER_INSTRUMENT, `At most ${MAX_SPOTS_PER_INSTRUMENT} spots per instrument`),
});

const jamFormFields = z.object({
  ...sharedFields,
  address: addressSchema,

  /* One markdown string in the form, one text block on the wire. The API allows
     20 blocks of 2000 characters; the editor produces a single block, so the
     limit that applies here is one block's worth. */
  overview: z
    .string()
    .max(MAX_OVERVIEW_CHARS, `Please use ${MAX_OVERVIEW_CHARS} characters or fewer`),

  instrumentTemplate: z.array(instrumentRowSchema),
});

export type JamFormValues = z.infer<typeof jamFormFields>;

/* JS09 — "all genres" means all of them, so combining it with a specific genre
   is a contradiction rather than a wider net. The chip UI clears the others when
   the catch-all is tapped, which is where a user actually experiences this rule;
   this is the backstop that makes a bug there visible instead of a 400. */
const catchAllIsExclusive = (
  values: readonly string[],
  catchAll: string,
  field: 'genres' | 'skillLevel',
  label: string,
  ctx: z.RefinementCtx,
) => {
  if (new Set(values).size !== values.length) {
    ctx.addIssue({
      code: 'custom',
      path: [field],
      message: `The same ${label} is selected twice`,
    });
  }

  if (values.length > 1 && values.includes(catchAll)) {
    ctx.addIssue({
      code: 'custom',
      path: [field],
      message: `"${catchAll}" already covers everything — it can't be combined with a specific ${label}`,
    });
  }
};

/* The cross-field rules, mirroring the API's `jamSessionRules`.

   These run even while other fields are still empty — Zod 4 keeps going into
   object-level checks after a field-level one fails, which is what makes them
   usable for per-step validation. They do *not* run if a key is missing or holds
   the wrong type, so every field carries a real default (see
   `emptyJamForm`) rather than being left undefined. */
const jamFormRules = (values: JamFormValues, ctx: z.RefinementCtx) => {
  catchAllIsExclusive(values.genres, ALL_GENRES, 'genres', 'genre', ctx);
  catchAllIsExclusive(values.skillLevel, ALL_LEVELS, 'skillLevel', 'skill level', ctx);

  /* A row at zero spots isn't in the line-up — it's a stepper nobody touched. */
  const lineUp = values.instrumentTemplate.filter(({ spotsTotal }) => spotsTotal > 0);

  if (lineUp.length === 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['instrumentTemplate'],
      message: 'Add at least one instrument with a spot on it',
    });
  } else if (lineUp.length > MAX_INSTRUMENTS_PER_SESSION) {
    ctx.addIssue({
      code: 'custom',
      path: ['instrumentTemplate'],
      message: `At most ${MAX_INSTRUMENTS_PER_SESSION} instruments per session`,
    });
  }

  /* JS08 — two "Drums" rows would produce "First Drums" twice over, with no way
     for a musician to tell the two apart when booking. */
  const names = lineUp.map(({ instrument }) => instrument.trim().toLowerCase());

  if (new Set(names).size !== names.length) {
    ctx.addIssue({
      code: 'custom',
      path: ['instrumentTemplate'],
      message: 'Each instrument can only be listed once',
    });
  }

  /* JS05 — a session in the past can't be booked, so posting one only produces
     dead data. Compared against Berlin's clock, not the browser's, because
     that's the clock the API will use. */
  const now = nowInAppTimezone();

  if (values.date) {
    if (values.date < now.date) {
      ctx.addIssue({
        code: 'custom',
        path: ['date'],
        message: 'That date has already passed',
      });
    } else if (values.date === now.date && isTime(values.startTime) && values.startTime <= now.time) {
      ctx.addIssue({
        code: 'custom',
        path: ['startTime'],
        message: 'That time has already passed today',
      });
    }
  }

  const { startTime, endTime, slotDurationMinutes } = values;

  if (!isTime(startTime) || !isTime(endTime) || slotDurationMinutes <= 0) return;

  const windowMinutes = timeToMinutes(endTime) - timeToMinutes(startTime);

  /* Also rules out crossing midnight. A jam ending at 02:00 is a real thing, but
     it needs a second calendar date to be unambiguous and the API's model
     carries one — so 22:00–02:00 is rejected rather than stored as a riddle. */
  if (windowMinutes <= 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['endTime'],
      message: 'The end time has to be after the start time, and a session can’t run past midnight',
    });
    return;
  }

  /* JS06 — 19:00–21:30 in 45-minute slots leaves a 15-minute stub, and the API
     rejects the whole request rather than trimming it. The step disables the
     lengths that don't fit, so reaching this message means something in that UI
     is wrong. */
  if (windowMinutes % slotDurationMinutes !== 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['slotDurationMinutes'],
      message: `${windowMinutes} minutes doesn’t divide evenly into ${slotDurationMinutes}-minute slots`,
    });
    return;
  }

  const slotCount = windowMinutes / slotDurationMinutes;

  if (slotCount > MAX_SLOTS_PER_SESSION) {
    ctx.addIssue({
      code: 'custom',
      path: ['slotDurationMinutes'],
      message: `That makes ${slotCount} slots, and the most a session can have is ${MAX_SLOTS_PER_SESSION}. Try longer slots.`,
    });
    return;
  }

  const spotsPerSlot = lineUp.reduce((total, { spotsTotal }) => total + spotsTotal, 0);
  const totalSpots = slotCount * spotsPerSlot;

  if (totalSpots > MAX_SPOTS_PER_SESSION) {
    ctx.addIssue({
      code: 'custom',
      path: ['instrumentTemplate'],
      message: `That makes ${totalSpots} spots across ${slotCount} slots, and the most a session can have is ${MAX_SPOTS_PER_SESSION}.`,
    });
  }
};

export const jamFormSchema = jamFormFields.superRefine(jamFormRules);

/* The rows the instruments step opens with. Names match the ones the API's seed
   data uses, so a browse filtered by instrument doesn't end up with "Keys" and
   "Keyboard" as two different things. Venues can rename a row or add their own. */
export const DEFAULT_INSTRUMENT_ROWS: readonly { instrument: string; spotsTotal: number }[] = [
  { instrument: 'Guitar', spotsTotal: 0 },
  { instrument: 'Bass', spotsTotal: 0 },
  { instrument: 'Keyboard', spotsTotal: 0 },
  { instrument: 'Drums', spotsTotal: 0 },
  { instrument: 'Voice', spotsTotal: 0 },
  { instrument: 'Saxophone', spotsTotal: 0 },
];

/* Every field present and of the right type, which is a requirement rather than
   tidiness: the cross-field rules above are skipped for a missing key, and an
   input that starts undefined and later holds a string makes React switch it
   from uncontrolled to controlled mid-typing. */
export const emptyJamForm = (): JamFormValues => ({
  title: '',
  summary: '',
  date: '',
  startTime: '',
  endTime: '',
  venueName: '',
  address: { formatted: '' },
  overview: '',
  slotDurationMinutes: 30,
  instrumentTemplate: DEFAULT_INSTRUMENT_ROWS.map((row) => ({ ...row })),
  genres: [],
  skillLevel: [],
});

// ---------------------------------------------------------------------------
// The payload
// ---------------------------------------------------------------------------

const overviewBlockSchema = z.object({
  type: z.literal('text'),
  content: z.string().trim().min(1).max(MAX_OVERVIEW_CHARS),
});

/* Mirrors the API's input schema. The API's is a `strictObject`, so an unknown
   key isn't ignored — it's a 400 for the whole request, and `slots`, `venueId`
   and `status` are all server-generated keys that would trip it.

   Plain `z.object` here for exactly that reason: it *strips* what it doesn't
   know about, so building the payload by spreading the form values can't
   accidentally smuggle a form-only field onto the wire. Same trick as
   `registerPayloadSchema` in schemas/auth. */
const jamSessionPayloadSchema = z.object({
  ...sharedFields,
  address: addressSchema,
  overview: z.array(overviewBlockSchema).optional(),
  instrumentTemplate: z
    .array(
      z.object({
        instrument: instrumentRowSchema.shape.instrument,
        spotsTotal: z.int().min(1).max(MAX_SPOTS_PER_INSTRUMENT),
      }),
    )
    .min(1)
    .max(MAX_INSTRUMENTS_PER_SESSION),
});

export type JamSessionPayload = z.infer<typeof jamSessionPayloadSchema>;

/* Form shape -> wire shape. Three fields change on the way through, and each
   one is a place the API would otherwise answer 400:

   - untouched instrument rows are dropped, because the API's minimum is 1 spot
   - the markdown overview becomes a text block, and disappears entirely when
     it's blank (the field is optional, but an empty block is not)
   - coordinates go as a pair or not at all

   Parsed rather than cast, following `toRegisterPayload`: the trims run, the
   unknown keys are stripped, and a mistake here throws in our own code instead
   of coming back as a rejected request. */
export const toJamSessionPayload = (values: JamFormValues): JamSessionPayload => {
  const { lat, lng, formatted } = values.address;
  const overview = values.overview.trim();

  return jamSessionPayloadSchema.parse({
    ...values,
    address:
      lat === undefined || lng === undefined ? { formatted } : { formatted, lat, lng },
    overview: overview ? [{ type: 'text', content: overview }] : undefined,
    instrumentTemplate: values.instrumentTemplate.filter(({ spotsTotal }) => spotsTotal > 0),
  });
};

// ---------------------------------------------------------------------------
// The response
// ---------------------------------------------------------------------------

/* `z.object`, not `z.strictObject` — the same call as schemas/user. Strict on
   the way out would mean the day the API adds a field, every response fails to
   parse and the client breaks on a change that should have been harmless. */

const spotSchema = z.object({
  spotId: z.string(),
  instrument: z.string(),
  label: z.string(),
  /* null is available. There's no separate counter anywhere — this is the whole
     availability model. */
  bookingId: z.string().nullable(),
});

const slotSchema = z.object({
  slotId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  spots: z.array(spotSchema),
});

export const jamSessionSchema = z.object({
  id: z.string(),
  venueId: z.string(),

  title: z.string(),
  summary: z.string(),

  /* The API types these as Date, but JSON has no date type — they arrive as ISO
     strings and need coercing back. `date` is a calendar day pinned to midnight
     UTC, so read it in UTC, not with local getters. */
  date: z.coerce.date(),
  startTime: z.string(),
  endTime: z.string(),

  venueName: z.string(),
  address: z.object({
    formatted: z.string(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),

  overview: z.array(overviewBlockSchema),
  slotDurationMinutes: z.number(),
  instrumentTemplate: z.array(
    z.object({ instrument: z.string(), spotsTotal: z.number() }),
  ),

  genres: z.array(z.enum(genres)),
  skillLevel: z.array(z.enum(skillLevels)),
  status: z.enum(jamSessionStatuses),

  slots: z.array(slotSchema),

  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type JamSession = z.infer<typeof jamSessionSchema>;
