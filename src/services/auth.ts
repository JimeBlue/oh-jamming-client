import type { LoginInput, RegisterPayload } from '@/schemas/auth';
import { userSchema, type User } from '@/schemas/user';
import { api } from '@/services/api';

/* The four auth endpoints, named after what they do rather than the routes they
   hit. Components and the auth context call these — nothing outside this file
   should need to know that registering is a POST to /users.

   None of them take or return a token: the session is set and cleared by the
   API as httpOnly cookies, which this side can't read and doesn't need to. */

export const login = (credentials: LoginInput): Promise<User> =>
  api.post('/auth/login', credentials, userSchema);

/* POST /users *is* registration, and it issues a session on the way out — so a
   successful register leaves the user logged in, same as login. */
export const register = (payload: RegisterPayload): Promise<User> =>
  api.post('/users', payload, userSchema);

/* Who am I? Called once on load to find out whether the cookies the browser is
   holding are still good. A 401 here is the normal answer for a logged-out
   visitor, not an error worth reporting. */
export const getCurrentUser = (): Promise<User> =>
  api.get('/auth/me', userSchema);

/* Succeeds even with no session — the API treats logging out twice as fine, so
   there's no failure case to handle here. */
export const logout = (): Promise<void> => api.del('/auth/logout');
