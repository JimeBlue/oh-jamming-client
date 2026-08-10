import { z, type ZodType } from 'zod';

/* One place that knows how to talk to the API: base URL, cookies, error shape,
   and silent session renewal. Everything else in the app calls through here. */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

/* A real class rather than tacking `.status` onto an Error, so callers can
   narrow with `instanceof` and branch on the code — 401 means bad credentials,
   409 means the email is taken, 429 means rate limited. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  /* Cleared on the one retry after a refresh, so a session that's genuinely
     dead can't bounce between here and /auth/refresh forever. */
  allowRefresh?: boolean;
};

/* The API answers every error with { message }, so there's one shape to read.
   Falls back to the status for the cases that have no body at all — a proxy
   error, or the dev server being down. */
const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const data: unknown = await response.json();

    if (
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof data.message === 'string'
    ) {
      return data.message;
    }
  } catch {
    /* no JSON body — fall through */
  }

  return `Request failed (${response.status})`;
};

/* THE SINGLE-FLIGHT REFRESH. Every caller that hits an expired token awaits
   this same promise instead of starting its own request.

   That isn't an optimisation, it's a correctness requirement. The API rotates
   refresh tokens and treats a second use of an already-rotated one as a stolen
   token: it deletes every session for that user. So two requests expiring at
   the same moment — which is the normal case, since they were all issued
   together 15 minutes ago — would log the user out of everything. */
let refreshInFlight: Promise<boolean> | null = null;

const refreshSession = (): Promise<boolean> => {
  refreshInFlight ??= fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then((response) => response.ok)
    /* A network failure here is not worth surfacing on its own — the caller is
       about to report the original 401, which is the more useful error. */
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
};

const request = async (
  path: string,
  { method = 'GET', body, allowRefresh = true }: RequestOptions = {},
): Promise<unknown> => {
  if (!BASE_URL) {
    throw new ApiError('NEXT_PUBLIC_API_URL is not set', 0);
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    /* The session lives in httpOnly cookies on the API's domain. Cross-origin
       requests don't send those unless asked, and this is the asking — without
       it every authenticated call quietly comes back 401. */
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  /* Expired is not the same as logged out. The 15-minute access token running
     out is routine and the session behind it is probably still good, so it's
     renewed and the original request replayed. A 401 *without* this header is a
     real rejection and falls through to the throw below. */
  if (
    response.status === 401 &&
    allowRefresh &&
    response.headers.get('WWW-Authenticate') === 'token_expired'
  ) {
    const refreshed = await refreshSession();

    if (refreshed) {
      return request(path, { method, body, allowRefresh: false });
    }
  }

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  /* 204 has no body, and calling .json() on it throws. */
  if (response.status === 204) return null;

  return response.json();
};

/* Where the response stops being `unknown` and starts being a real type.

   The tempting shortcut is a generic like api.get<User>(path), but that's a
   cast wearing a nicer hat: it asserts a shape nobody checked. Taking the
   schema instead means the claim is verified against the actual bytes, and the
   type comes from the same schema — so the two can't drift apart. */
const parse = <T>(schema: ZodType<T>, data: unknown, path: string): T => {
  const result = schema.safeParse(data);

  if (result.success) return result.data;

  /* The request succeeded, so this isn't the user's problem and there's nothing
     they can do about it — the API is sending something we weren't compiled
     against. The detail goes to the console for whoever is debugging; the
     thrown message is the one safe to show. */
  console.error(
    `Unexpected response from ${path}:\n${z.prettifyError(result.error)}`,
  );

  throw new ApiError('The server sent an unexpected response', 500);
};

export const api = {
  get: <T>(path: string, schema: ZodType<T>): Promise<T> =>
    request(path).then((data) => parse(schema, data, path)),

  post: <T>(path: string, body: unknown, schema: ZodType<T>): Promise<T> =>
    request(path, { method: 'POST', body }).then((data) => parse(schema, data, path)),

  patch: <T>(path: string, body: unknown, schema: ZodType<T>): Promise<T> =>
    request(path, { method: 'PATCH', body }).then((data) => parse(schema, data, path)),

  /* No schema: nothing in the app reads a delete response, so there's no shape
     worth checking. */
  del: async (path: string): Promise<void> => {
    await request(path, { method: 'DELETE' });
  },
};
