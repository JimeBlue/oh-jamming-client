'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';

import PasswordInput from '@/components/ui/PasswordInput';
import { useAuth } from '@/context/AuthContext';
import { safeNextPath, withNext } from '@/lib/nextPath';
import {
  registerSchema,
  toRegisterPayload,
  type RegisterInput,
} from '@/schemas/auth';
import type { UserRole } from '@/schemas/user';
import { ApiError } from '@/services/api';

/* Pink for musicians, indigo for venues — the only way the two forms differ
   visually, so which account you're creating is readable at a glance.

   One record rather than three keyed the same way: the word in the heading, the
   colour it's tinted and the fill on the button have to agree to say anything at
   all. Split across separate maps, adding a role means remembering all three. */
const byRole: Record<
  UserRole,
  { noun: string; highlight: string; ink: string; submit: string }
> = {
  /* The two blocks don't take the same lettering, because the two colours
     aren't equally dark. White on the pink is thin — the app gets away with it
     on a button, but a word this size wants the page's ink behind it, which
     also ties the highlight to the rest of the heading. The indigo is dark
     enough that white is the legible half of the pair. */
  musician: {
    noun: 'musician',
    highlight: 'bg-secondary',
    ink: 'text-base-content',
    submit: 'btn-secondary',
  },
  venue: {
    noun: 'venue',
    highlight: 'bg-primary',
    ink: 'text-white',
    submit: 'btn-primary',
  },
};

/* The hand-painted look: a block whose edges wander, the way a brush leaves
   them. Every point is a percentage, so it holds its shape whichever word is
   inside it — "musician" is half again as wide as "venue".

   A polygon rather than a border-radius, which can only ever draw a smooth
   ellipse; the wobble along each side is the whole effect. The trade is that a
   clip cuts rather than draws, so the padding below has to keep the letters
   clear of the ragged edge — the widest excursion is 4% of the width and 10%
   of the height. */
const brushedHighlight = {
  clipPath: `polygon(
    2% 10%, 10% 2%, 28% 7%, 46% 1%, 66% 7%, 84% 2%, 97% 9%,
    99% 32%, 96% 56%, 100% 80%,
    94% 95%, 74% 99%, 52% 93%, 30% 100%, 11% 95%, 3% 89%,
    1% 62%, 0% 34%
  )`,
};

export default function RegisterForm({ role }: { role: UserRole }) {
  const { noun, highlight, ink, submit } = byRole[role];
  const { register: createAccount } = useAuth();
  const router = useRouter();

  /* Carried here from /login, which was itself sent by the role guard. Most
     people who reach this form did so from a page they were trying to use — the
     slot picker especially, where a musician has already chosen a time. */
  const next = useSearchParams().get('next');

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      /* Not a field anyone can edit — it comes from the route. It lives in the
         form's values only so the schema can validate it alongside the rest. */
      role,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      /* toRegisterPayload strips confirmPassword: the API validates this
         endpoint strictly, so an extra key is a 400 for the whole request, not
         a field it quietly ignores. */
      await createAccount(toRegisterPayload(values));

      /* Registering signs you in — the API issues the same session cookies as
         login — so this goes straight to the app, not to the login page.

         Home for both roles, matching login rather than dropping a new venue
         onto their empty backstage board. The argument for the board was
         onboarding, and it isn't wrong; it just isn't worth the two doors into
         the app landing in two different places, which is the thing people
         actually notice.

         `next` came out of a URL, so it is re-checked here rather than trusted
         from the link that carried it; unchecked, an absolute value would make
         this an open redirect exactly as it would on the login page.

         A venue whose `next` points at a musician-only page lands on the role
         guard's explanation instead, which is the right answer and the same one
         login gives — they can't be sent somewhere their account can't go. */
      router.replace(safeNextPath(next, '/'));
    } catch (error) {
      /* 409 is the one failure that belongs to a specific field: the unique
         index on email fired, so the address is already taken. Everything else
         is about the request as a whole. */
      if (error instanceof ApiError && error.status === 409) {
        setError('email', { message: 'That email is already registered' });
        return;
      }

      setError('root', {
        message:
          error instanceof ApiError
            ? error.message
            : 'Something went wrong. Please try again.',
      });
    }
  });

  return (
    /* noValidate hands validation entirely to zod, so the browser's own bubbles
       don't fire first with different wording in a different style. */
    <form onSubmit={onSubmit} noValidate>
      {/* The role in the heading rather than only in the tab above it. Someone
          who arrives on this page from a link — the login card's "Register
          here", the role guard's button — never chose a tab, so the tab is
          reporting a decision they didn't watch being made. The word is tinted
          painted in the colour of the button they'll press, which is the same
          pairing the tabs and the submit already use.

          inline-block so the vertical padding actually pushes the block out
          past the text rather than letting it overlap the line above. */}
      <h1 className="font-heading text-3xl leading-snug">
        Get started with a free{' '}
        <span
          style={brushedHighlight}
          className={`${highlight} ${ink} inline-block px-4 py-1`}
        >
          {noun}
        </span>{' '}
        account
      </h1>

      <p className="mt-2 text-sm">
        You already have an Oh Jamming account?{' '}
        {/* Back the way they came, destination intact — the round trip has to
            work in both directions or it only half works. */}
        <Link href={withNext('/login', next)} className="link link-primary font-medium">
          Log in here
        </Link>
      </p>

      {/* The role can never be changed after signup — it decides whether you
          book spots or offer them, and it's the one thing on this form that
          can't be fixed later by editing a profile.

          No longer names the role: the heading does that now, in colour, one
          line up. Saying it twice in three lines made the warning read as
          filler rather than as the one irreversible thing on the page. */}
      <p className="mt-3 text-xs opacity-70">
        The account type can&rsquo;t be changed later.
      </p>

      <fieldset className="fieldset mt-4">
        <legend className="fieldset-legend">Your first name*</legend>
        <input
          {...register('firstName')}
          type="text"
          autoComplete="given-name"
          aria-invalid={errors.firstName ? true : undefined}
          className={`input w-full ${errors.firstName ? 'input-error' : ''}`}
        />
        {errors.firstName && (
          <p role="alert" className="fieldset-label text-error">
            {errors.firstName.message}
          </p>
        )}
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Your last name*</legend>
        <input
          {...register('lastName')}
          type="text"
          autoComplete="family-name"
          aria-invalid={errors.lastName ? true : undefined}
          className={`input w-full ${errors.lastName ? 'input-error' : ''}`}
        />
        {errors.lastName && (
          <p role="alert" className="fieldset-label text-error">
            {errors.lastName.message}
          </p>
        )}
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Your email address*</legend>
        <input
          {...register('email')}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={errors.email ? true : undefined}
          className={`input w-full ${errors.email ? 'input-error' : ''}`}
        />
        {errors.email && (
          <p role="alert" className="fieldset-label text-error">
            {errors.email.message}
          </p>
        )}
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Choose a password*</legend>
        <PasswordInput
          {...register('password')}
          /* new-password on both: it's what tells a password manager to offer
             to generate and then save one, rather than autofilling an existing
             entry into a signup form. */
          autoComplete="new-password"
          aria-invalid={errors.password ? true : undefined}
          invalid={Boolean(errors.password)}
        />
        {errors.password && (
          <p role="alert" className="fieldset-label text-error">
            {errors.password.message}
          </p>
        )}
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Confirm your password*</legend>
        <PasswordInput
          {...register('confirmPassword')}
          autoComplete="new-password"
          aria-invalid={errors.confirmPassword ? true : undefined}
          invalid={Boolean(errors.confirmPassword)}
        />
        {errors.confirmPassword && (
          <p role="alert" className="fieldset-label text-error">
            {errors.confirmPassword.message}
          </p>
        )}
      </fieldset>

      {errors.root && (
        <div role="alert" className="alert alert-error mt-4">
          <span>{errors.root.message}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className={`btn ${submit} mt-6 w-full font-bold`}
      >
        {isSubmitting && <span className="loading loading-spinner" />}
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
