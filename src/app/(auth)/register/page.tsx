import { redirect } from 'next/navigation';

/* Musician is the default tab, so /register is an alias for it rather than a
   third page. One canonical URL per role means the highlighted tab and the
   address bar can never disagree — and the guest menu's "Register" link can
   keep pointing at the short path. */
export default function RegisterIndexPage() {
  redirect('/register/musician');
}
