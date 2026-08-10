import Image from 'next/image';

import authBackground from '@/assets/login-register-bg.jpg';

/* Shared shell for /login and /register — a route group, so (auth) shapes the
   layout without appearing in any URL. The background lives here rather than in
   each page so the two can't drift, and so navigating between them doesn't
   re-mount the photo. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /* pt-28 clears the fixed header, which overlays this page like every other. */
    <main className="relative flex min-h-screen items-center justify-center px-4 pb-12 pt-28">
      {/* alt="" marks it decorative, so a screen reader skips it instead of
          announcing a filename. sizes="100vw" tells next/image this is
          full-bleed, so it picks a sensible srcset entry rather than assuming
          the layout default. */}
      <Image
        src={authBackground}
        alt=""
        fill
        priority
        placeholder="blur"
        sizes="100vw"
        className="object-cover"
      />

      {/* The card is white and the photo is busy — without a scrim the card's
          edge dissolves into whatever happens to be behind it. */}
      <div className="absolute inset-0 bg-black/40" />

      {children}
    </main>
  );
}
