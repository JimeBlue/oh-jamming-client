import RequireRole from '@/components/auth/RequireRole';
import JamBuilderHeader from '@/components/layout/JamBuilderHeader';

/* The venue's side of the app — the jam session creator, and the backstage board
   it publishes into. Its own route group so it can carry its own header, which
   is the whole reason `(site)` exists next to it.

   The name has outlived its scope slightly: not everything here is a builder any
   more. It stays because renaming a route group renames nothing a user sees and
   invalidates every generated route type — worth doing when something else in
   `src/app/` moves, not on its own.

   The guard sits here rather than on the page so it covers every route that
   lands under this layout, and so the header stays up while /auth/me is still
   answering — a spinner on a blank screen is worse than a spinner under a
   header that already looks like the app. */
export default function BuilderLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <JamBuilderHeader />
      <main className="flex-1">
        <RequireRole role="venue">{children}</RequireRole>
      </main>
    </>
  );
}
