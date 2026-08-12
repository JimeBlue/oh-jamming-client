import type { Metadata } from 'next';

import JamWizard from '@/components/jams/JamWizard';

export const metadata: Metadata = {
  title: 'Insert your Jam · Oh Jamming',
};

export default function NewJamSessionPage() {
  return <JamWizard />;
}
