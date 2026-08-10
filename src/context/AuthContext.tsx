'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { LoginInput, RegisterPayload } from '@/schemas/auth';
import type { User } from '@/schemas/user';
import { ApiError } from '@/services/api';
import * as authService from '@/services/auth';

/* Three states, not two.

   The obvious shape is `user: User | null`, but null then means both "nobody is
   logged in" and "we haven't asked yet" — and on first paint it's always the
   second one. Collapsing them is what makes a header flash the logged-out icon
   for a moment on every reload before the avatar appears.

   Because the session lives in httpOnly cookies on the API's domain, there is
   no token this side can read to shortcut the question: finding out costs a
   round-trip to /auth/me, so `loading` is a real state with real duration and
   the UI has to have something to show during it. */
type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'authenticated'; user: User }
  | { status: 'anonymous'; user: null };

/* `user` is carried as null on the two logged-out states rather than left off,
   so that `const { status, user } = useAuth()` destructures cleanly. It's typed
   `User | null` until you check `status`, at which point TypeScript narrows it
   to `User` — the guard can't be forgotten, but it also isn't in the way. */
type AuthContextValue = AuthState & {
  login: (credentials: LoginInput) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
};

/* Typed `| null` and defaulted to null on purpose. A {} default would let a
   component outside the provider read undefined values and fail somewhere far
   from the cause; this way useAuth throws immediately and says where to look. */
const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }

  return context;
};

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    status: 'loading',
    user: null,
  });

  /* Ask the API who the browser's cookies belong to. Runs once on mount, which
     is the only way to answer the question — there's nothing readable in
     document.cookie to check first. */
  useEffect(() => {
    let active = true;

    const loadCurrentUser = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (active) setState({ status: 'authenticated', user });
      } catch (error) {
        /* A 401 is the expected answer for a visitor who isn't logged in — not
           a failure, just the other outcome. Anything else (API down, 500, a
           response that didn't match the schema) still lands the user in the
           logged-out UI, since that's the only sane thing to render, but it
           gets logged so it isn't mistaken for a normal empty session. */
        if (!(error instanceof ApiError && error.status === 401)) {
          console.error('Could not load the current user:', error);
        }

        if (active) setState({ status: 'anonymous', user: null });
      }
    };

    loadCurrentUser();

    /* Guards against a state update after unmount — in dev, StrictMode mounts
       twice, so without this the first run's response arrives to a dead
       component. */
    return () => {
      active = false;
    };
  }, []);

  /* login, register and logout deliberately don't swallow errors: the form that
     called them is what knows how to display "incorrect credentials" next to
     the right field. All three just own the state change that follows. */

  const login = useCallback(async (credentials: LoginInput) => {
    const user = await authService.login(credentials);
    setState({ status: 'authenticated', user });
    return user;
  }, []);

  /* Registering logs you in — POST /users issues the same session cookies that
     login does, so there's no second step and no trip to the login page. */
  const register = useCallback(async (payload: RegisterPayload) => {
    const user = await authService.register(payload);
    setState({ status: 'authenticated', user });
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      /* Cleared even if the request failed. The cookies might still be set, in
         which case the next reload will pick the session back up — but showing
         someone as logged in right after they asked to leave is the worse of
         the two wrong answers. */
      setState({ status: 'anonymous', user: null });
    }
  }, []);

  const value = useMemo(
    (): AuthContextValue => ({ ...state, login, register, logout }),
    [state, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
