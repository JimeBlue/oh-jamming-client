import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/* Not a house helper — this file exists because the vendored Animate UI icons
   import it, and it is what `shadcn add` would have written. The rest of this
   codebase builds class strings with template literals and should keep doing
   so; reaching for `cn` in new code would spread a second convention for the
   sake of one third-party component tree.

   The `twMerge` half is the part that isn't optional: the icons take a
   `className` and merge it over their own defaults, and without it a caller
   passing `size-4` would end up with two conflicting size utilities and
   whichever one Tailwind happened to emit last. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
