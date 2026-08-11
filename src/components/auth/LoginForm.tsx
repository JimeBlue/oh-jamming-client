'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';

import PasswordInput from '@/components/ui/PasswordInput';
import { HOME_BY_ROLE } from '@/config/navigation';
import { useAuth } from '@/context/AuthContext';
import { safeNextPath } from '@/lib/nextPath';
import { loginSchema, type LoginInput } from '@/schemas/auth';
import { ApiError } from '@/services/api';

const loginErrorMessage = (error: unknown): string => {
  if (!(error instanceof ApiError)) {
    return 'Something went wrong. Please try again.';
  }

  /* The API answers "no such email" and "wrong password" with the same 401 on
     purpose — two different messages would turn this endpoint into a way to
     find out which addresses have accounts. Its own wording is "Incorrect
     credentials"; this says the same thing in plainer language, and keeps the
     ambiguity that makes it safe. */
  if (error.status === 401) return 'Email or password is incorrect';

  /* Everything else already explains itself — the rate limiter's "Too many
     attempts. Try again later." being the one that matters. */
  return error.message;
};

export default function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();

  /* Set by the role guard when it turns someone away from a protected page —
     they clicked something specific, and sending them to their role's home
     instead would quietly drop that. Absent on a plain visit to /login, which
     is why there's still a fallback below. */
  const next = useSearchParams().get('next');

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    /* Explicit empty strings rather than undefined, so the inputs are
       controlled from the first render and React doesn't warn about a field
       switching from uncontrolled to controlled on first keystroke. */
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const user = await login(values);

      /* The ?next= value came out of a URL, so it is checked before it is used
         — see lib/nextPath. Unchecked, an absolute URL here would turn the
         login page into an open redirect.

         replace, not push: the login page shouldn't sit in history for the
         back button to land on once the user is already signed in. */
      router.replace(safeNextPath(next, HOME_BY_ROLE[user.role]));
    } catch (error) {
      /* Every way the API can reject a login is about the attempt as a whole
         rather than one field, so it goes above the button rather than under an
         input — there's no single field to point at. */
      setError('root', { message: loginErrorMessage(error) });
    }
  });

  return (
    /* noValidate hands validation entirely to zod. Without it the browser's own
       bubbles fire first on type="email", and the user gets two different
       messages for the same mistake in two different styles. */
    <form onSubmit={onSubmit} noValidate>
      <h1 className="font-heading text-3xl">Welcome back!</h1>

      <p className="mt-2 text-sm">
        New to Oh Jamming?{' '}
        <Link href="/register" className="link link-primary font-medium">
          Register here
        </Link>
      </p>

      <fieldset className="fieldset mt-6">
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
        <legend className="fieldset-legend">Your password*</legend>
        <PasswordInput
          {...register('password')}
          /* current-password, not password: tells a password manager to offer
             a saved entry rather than to generate a new one. */
          autoComplete="current-password"
          aria-invalid={errors.password ? true : undefined}
          invalid={Boolean(errors.password)}
        />
        {errors.password && (
          <p role="alert" className="fieldset-label text-error">
            {errors.password.message}
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
        className="btn btn-secondary mt-6 w-full font-bold"
      >
        {isSubmitting && <span className="loading loading-spinner" />}
        {isSubmitting ? 'Logging in…' : 'Log in'}
      </button>
    </form>
  );
}
