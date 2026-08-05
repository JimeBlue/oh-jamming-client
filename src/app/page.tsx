import ApiStatus from '@/components/ApiStatus';

export default function Home() {
  return (
    <main className="hero flex-1">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-5xl font-bold">Oh Jamming</h1>
          <p className="py-6">Book a spot in a jam session.</p>
          <button className="btn btn-primary">Browse sessions</button>
          <div className="mt-8">
            <ApiStatus />
          </div>
        </div>
      </div>
    </main>
  );
}
