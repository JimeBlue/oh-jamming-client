import type { Metadata } from 'next';

import JamDetailShell from '@/components/backstage/detail/JamDetailShell';

/* Fixed rather than the session's own title, which would take a second fetch —
   a server one, since `generateMetadata` runs before the browser has anything.
   `GET /jam-sessions/:id` is public so it *could* be done, but it would double
   every load of this page to improve a tab label on a screen behind a login. */
export const metadata: Metadata = {
  title: 'Jam session · Oh Jamming',
};

/* A server component wrapping a client one, the same arrangement as
   `my-backstage/page.tsx`: `metadata` is a server export and the shell can't be
   anything but client, since the session cookie lives on the API's domain.

   The id is read here and passed down rather than pulled from `useParams` in the
   shell — it is already in this component's props, and a prop is checkable where
   a hook's `string | string[]` is not. */
export default async function JamDetailLayout({
  children,
  params,
}: LayoutProps<'/my-backstage/[id]'>) {
  const { id } = await params;

  return <JamDetailShell id={id}>{children}</JamDetailShell>;
}
