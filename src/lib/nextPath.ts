/* "Where was the user trying to go before we asked them to log in?" — carried
   through the login page as ?next=. */

/* An open redirect is the whole risk here, and it is entirely a question of
   what this function lets through. Anything absolute — https://evil.example,
   //evil.example, or javascript:… — would let a crafted link bounce someone off
   our login page and onto a page an attacker controls, wearing our domain in
   the referrer.

   So the rule is: one leading slash, and nothing else. `//host` is
   protocol-relative and `/\host` is treated the same way by some URL parsers,
   which is why both are checked rather than just the obvious one. */
export const isSafeNextPath = (path: string): boolean =>
  path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\');

/* Falls back rather than throwing: a malformed ?next= means someone tampered
   with a URL, and the right response is to quietly ignore it and send them
   somewhere sensible, not to show an error about a parameter they never saw. */
export const safeNextPath = (
  next: string | null | undefined,
  fallback: string,
): string => (next && isSafeNextPath(next) ? next : fallback);
