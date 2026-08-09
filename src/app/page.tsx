import ApiStatus from '@/components/ApiStatus';
import Hero from '@/components/hero/Hero';

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <ApiStatus />
      </section>
    </main>
  );
}
