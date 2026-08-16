import { redirect } from 'next/navigation';

import { withNext } from '@/lib/nextPath';

/* Musician is the default tab, so /register is an alias for it rather than a
   third page. One canonical URL per role means the highlighted tab and the
   address bar can never disagree — and the guest menu's "Register" link can
   keep pointing at the short path.

   The alias has to forward `?next=`, though. A redirect that drops it is the
   same lost destination as a link that never carried it, and this one sits in
   the middle of the flow: slot -> login -> "Register here" -> here. */
export default async function RegisterIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  redirect(withNext('/register/musician', next));
}
