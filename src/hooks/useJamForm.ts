'use client';

import { useFormContext } from 'react-hook-form';

import type { JamFormValues } from '@/schemas/jamSession';

/* `useFormContext<JamFormValues>()` with the generic already filled in.

   Eight step components reach for the same form, and without this each one
   repeats the type argument — which is the kind of thing that gets copy-pasted
   right up until the one place it doesn't, where it silently degrades to
   FieldValues and every field name becomes `string`. */
export const useJamForm = () => useFormContext<JamFormValues>();
