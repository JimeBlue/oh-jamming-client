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

/* Pink for musicians, indigo for venues — the one place the two forms differ
   visually, so which account you're creating is readable at a glance. */
const submitButtonClass: Record<UserRole, string> = {
  musician: 'btn-secondary',
  venue: 'btn-primary',
};

const roleNoun: Record<UserRole, string> = {
  musician: 'musician',
  venue: 'venue',
};

export default function RegisterForm({ role }: { role: UserRole }) {
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
      <h1 className="font-heading text-3xl">Get started with a free account</h1>

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
          can't be fixed later by editing a profile. */}
      <p className="mt-3 text-xs opacity-70">
        You&rsquo;re creating a {roleNoun[role]} account. This can&rsquo;t be
        changed later.
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
        className={`btn ${submitButtonClass[role]} mt-6 w-full font-bold`}
      >
        {isSubmitting && <span className="loading loading-spinner" />}
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
