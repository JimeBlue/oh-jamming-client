import type { Metadata } from 'next';
import { Changa_One, Manrope, Space_Grotesk } from 'next/font/google';
import AuthProvider from '@/context/AuthContext';
import './globals.css';

// Changa One is a static font — Next requires an explicit weight (400 is all it has).
const changaOne = Changa_One({
  variable: '--font-changa-one',
  weight: '400',
  subsets: ['latin'],
});

// Manrope is variable (200–800), so no weight is needed.
const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
});

// Also variable (300–700). Loaded at the root like the other two even though only
// the browse uses it — next/font hashes and self-hosts at build time, so a font
// nothing on the page references costs a `@font-face` rule and no download.
const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Oh Jamming',
  description: 'Book a spot in a jam session',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      data-theme="ohjamming"
      className={`${manrope.variable} ${changaOne.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-base-200 text-base-content">
        {/* Every route reads the session — the site header, the jam builder's
            guard — so the provider is the one thing that belongs at the root.
            children stays server-rendered: passing it through a Client
            Component doesn't pull it into the client bundle.

            The header deliberately isn't here. It differs by section — the
            public site gets the full nav, the jam builder gets a stripped bar
            with an exit link — so each route group renders its own. */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
