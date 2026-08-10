import { z } from 'zod';

/* Mirrors the API's userOutputSchema — the shape every auth endpoint answers
   with. Kept as a schema rather than a hand-written `type` so it does two jobs:
   `User` below is derived from it, and services/api.ts checks real responses
   against it at runtime. A `type` alone would only ever be a promise the
   compiler takes on faith. */

export const userRoles = ['venue', 'musician'] as const;

export const userSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  role: z.enum(userRoles),
  instrumentsPlayed: z.array(z.string()),

  /* The API types these as Date, but JSON has no date type — they arrive as ISO
     strings, so they need coercing back on this side. */
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/* Deliberately z.object and not z.strictObject, unlike the API's own schemas.
   Strict rejects unknown keys, which would mean the day the backend adds a
   field, every response fails to parse and the client breaks on a change that
   should have been harmless. Plain object ignores what it doesn't know about.
   Strict belongs on data we *send*, where the receiver is entitled to be picky. */

export type User = z.infer<typeof userSchema>;
export type UserRole = User['role'];
