import type { Metadata } from 'next';
import { Changa_One, Manrope } from 'next/font/google';
import Header from '@/components/layout/Header';
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

export const metadata: Metadata = {
  title: 'Oh Jamming',
  description: 'Book a spot in a jam session',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      data-theme="ohjamming"
      className={`${manrope.variable} ${changaOne.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-base-200 text-base-content">
        {/* Fixed, so it sits outside the flow and overlays the hero video. */}
        <Header />
        {children}
      </body>
    </html>
  );
}
