import { z } from 'zod';
import { userRoles } from '@/schemas/user';

/* Form input, as opposed to schemas/user.ts which describes what comes back.
   These rules mirror the API's so the user is told what's wrong before a
   request goes out — but the API validates independently and stays the
   authority. Nothing here is a security boundary. */

/* Trimmed and lowercased for the same reason the API does it: the model
   lowercases on save, so "Ana@Example.com" would never match a stored
   "ana@example.com" on login. Normalising on both ends keeps one canonical
   form. Trim runs before the email check, so trailing whitespace is cleaned up
   rather than reported as an invalid address. */
const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Please enter a valid email address'));

export const loginSchema = z.object({
  email: emailField,
  /* No length rule here, matching the API: login isn't where a password policy
     belongs. Whether the password is right is bcrypt's answer, and it's always
     the same 401. */
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/* role isn't a field on the register form — it comes from the route
   (/register/musician or /register/venue) so it can't be changed by mistake.
   It's in the schema because it's part of what gets sent. */
const registerFields = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, 'Please enter at least 2 characters')
    .max(255, 'Please use 255 characters or fewer'),
  lastName: z
    .string()
    .trim()
    .min(2, 'Please enter at least 2 characters')
    .max(255, 'Please use 255 characters or fewer'),
  email: emailField,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  role: z.enum(userRoles),
  instrumentsPlayed: z.array(z.string().min(1)).optional(),
});

export const registerSchema = registerFields
  /* path puts the message on the confirm field rather than the form as a whole,
     so it appears under the input the user needs to fix. */
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine(
    (values) => !(values.role === 'venue' && values.instrumentsPlayed?.length),
    {
      message: 'Only musicians can list instruments',
      path: ['instrumentsPlayed'],
    },
  );

export type RegisterInput = z.infer<typeof registerSchema>;

/* What actually goes over the wire. The API validates POST /users with a strict
   schema, so an unknown key isn't ignored — it's a 400 for the whole request.
   confirmPassword only ever existed on this side, so it has to come off first.

   Done by parsing through the same fields minus that one, rather than by hand:
   z.object drops keys it doesn't know about, so this can't fall out of step
   with the form the way a hand-written pick would. */
const registerPayloadSchema = registerFields.omit({ confirmPassword: true });

export type RegisterPayload = z.infer<typeof registerPayloadSchema>;

export const toRegisterPayload = (values: RegisterInput): RegisterPayload =>
  registerPayloadSchema.parse(values);
