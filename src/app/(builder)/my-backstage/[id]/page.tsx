import CockpitPanel from '@/components/backstage/detail/CockpitPanel';

/* The rail's first item, and the index route rather than `/cockpit` — clicking
   View from the board lands here, and a section nobody chose shouldn't need a
   segment in the URL to name it. */
export default function JamCockpitPage() {
  return <CockpitPanel />;
}
