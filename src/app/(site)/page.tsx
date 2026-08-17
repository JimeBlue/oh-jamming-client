import ApiStatus from '@/components/ApiStatus';
import Hero from '@/components/hero/Hero';
import HomeSearch from '@/components/home/HomeSearch';

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

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <ApiStatus />
      </section>
    </main>
  );
}
