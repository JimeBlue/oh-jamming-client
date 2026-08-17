import Hero from '@/components/hero/Hero';
import HomeHosts from '@/components/home/HomeHosts';
import HomeSearch from '@/components/home/HomeSearch';
import HomeSteps from '@/components/home/HomeSteps';
import HomeTonight from '@/components/home/HomeTonight';

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />

      {/* Directly under the hero, which has no CTA of its own — the headline
          names what the site is for and this is the first thing that acts on
          it. It carries its own ground and padding rather than taking a
          container from here, so the pale band runs edge to edge under the
          video the way the hero does. */}
      <HomeSearch />

      {/* Every number in it is counted from the live board, so it takes itself
          off the page when there is nothing on the board or the request fails —
          which is why it is rendered unconditionally here. */}
      <HomeTonight />

      {/* After the band rather than before it: the numbers are the reason to
          care how it works, and this answers the question they raise. */}
      <HomeSteps />

      {/* Last, and only after the musician's three steps have been made: the
          venue's reason to publish a night is that there is somebody to play
          it, so the pitch to hosts reads as a conclusion rather than as a
          second product. */}
      <HomeHosts />
    </main>
  );
}
