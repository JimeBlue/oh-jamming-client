# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev     # dev server on :3000 (Turbopack)
npm run build   # production build — also regenerates .next/types, see below
npm run lint    # the script is bare `eslint`; `npx next lint` does NOT work here
```

There is **no test suite**. Verification is `npm run build && npm run lint` plus
exercising the change in the browser against a running API.

After moving or renaming anything under `src/app/`, run `npm run build` — Next's
typegen writes `.next/types/validator.ts` with hard paths to every route file,
and a stale copy fails typecheck with an error that points at the old path.

`.claude/launch.json` defines the preview server; start it with the preview
tools rather than running `next dev` from Bash.

## The API is a separate repo

Backend: `../oh-jamming-api` (Express 5 + Mongoose + Zod), a sibling of this
directory. It is the authority on every rule this client enforces — read its
`src/schemas/` before writing a form, rather than inferring shapes from the UI.

**The session lives in httpOnly cookies on the API's domain.** Nothing here can
read it: not `document.cookie`, not Server Components, not Server Actions. Every
authenticated call is a client-side `fetch` with `credentials: 'include'`, and
"am I logged in?" costs a round-trip to `/auth/me`. This single fact explains
the auth architecture below — don't try to move auth to the server.

## Architecture

### `src/services/api.ts` — the only place that talks to the API

Every request goes through it. Two things it does that callers depend on:

- **Methods take a Zod schema, not a type parameter.** `api.get(path, userSchema)`
  parses the response; `api.get<User>(path)` would only assert. Keep it that way —
  add a schema in `src/schemas/` rather than a generic.
- **Single-flight refresh.** A 401 carrying `WWW-Authenticate: token_expired`
  triggers one shared `/auth/refresh` and one replay. This is a correctness
  requirement, not an optimisation: the API rotates refresh tokens and treats
  reuse of a rotated one as theft by **deleting every session for that user**.
  Anything that fires a second concurrent refresh logs the user out everywhere.

Failures throw `ApiError` with `.status`; callers branch on the code (401 bad
credentials, 409 email taken, 429 rate limited).

### `src/context/AuthContext.tsx` — three states, not two

`loading | authenticated | anonymous`, as a discriminated union. `loading` is a
real state with real duration (the `/auth/me` round-trip), and collapsing it
into "logged out" is what bounces a legitimately signed-in user to `/login` on
every hard refresh. Never treat a falsy user as anonymous without checking
`status` first.

### Route groups: `(site)` vs `(builder)`

A child layout cannot suppress a header its parent rendered, so `<Header />`
lives in `app/(site)/layout.tsx` rather than the root layout. `(builder)` renders
`JamBuilderHeader` instead and wraps its children in `RequireRole role="venue"`.
Put a new page in the group whose header it should wear.

`RequireRole` is **UX, not security** — the API enforces role on every write.
Signed-out sends them to `/login?next=…` (validated by `src/lib/nextPath.ts`;
unvalidated it is an open redirect). Wrong role gets an explanatory card, never
a 404.

Root `app/layout.tsx` holds only `<AuthProvider>` and the fonts.

### Schema conventions (`src/schemas/`)

- **Responses use `z.object`** — permissive, so a new backend field doesn't break
  the client.
- **Payloads mirror the API's `strictObject`** — an unknown key is a 400 for the
  whole request, so strip client-only fields (see `toRegisterPayload`) instead of
  hoping they're ignored.
- Dates arrive as ISO strings; coerce with `z.coerce.date()`.

### Theme

daisyUI 5 with a custom `ohjamming` theme in `globals.css`, forced via
`<html data-theme="ohjamming">` — there is no dark mode. `--font-heading` is
Changa One, applied as `font-heading`. Note `--color-info` is the brand indigo,
which makes `alert-info` a solid loud block; for soft notices use a tinted panel
(`border-secondary/40 bg-secondary/10`).

## Current work

`docs/jam-session-creator.md` holds the locked decisions, the API constraint
table, and the phase plan for the venue-only wizard at `/jams/new`. Read it
before touching anything under `src/components/jams/`. Update it when a decision
changes — it exists because those decisions aren't recoverable from the code.

## Conventions

Comments in this codebase explain **why**, not what: the trade-off considered,
the bug the line prevents, the API behaviour being accommodated. Match that
density and register in new code. Restating the code in prose is worse than no
comment.

`NEXT_PUBLIC_*` env vars are inlined at **build** time, so changing one on Render
requires a redeploy, not a restart.
