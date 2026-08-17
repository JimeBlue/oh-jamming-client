/* How it works: the three things that happen between arriving and playing.

   A server component, and deliberately so — it is the one section on this page
   with nothing to fetch and nothing to click. Everything above it is either the
   video, a form, or numbers counted from the live board; this is prose about
   the flow those numbers belong to, so it ships as HTML.

   The three steps are the app's actual route — search, book, turn up with the
   QR — in the order a musician meets them. Keeping the wording aligned with
   what the pages are called ("My Bookings", the QR, the slot) is the point: it
   is a map, and a map that renames the streets is worse than none. */

/* Blue, cyan, green in the order the steps run. The colours aren't decoration —
   they are the same three the rest of the app uses for its own things (royal
   blue for the site's actions, cyan for the AI search, green for a confirmed
   booking), so the badge for "show the QR" is already the colour that state
   wears on the ticket. */
const STEPS = [
  {
    badge: 'bg-royal-blue text-white',
    title: 'Say what you play',
    body: 'Ask in plain words — "bass slot in Munich on a Friday" — or filter by city, genre and instrument yourself.',
  },
  {
    badge: 'bg-cyan-blue text-white',
    title: 'Claim your slot',
    body: 'Pick a time slot and the instruments you want. Book for yourself or for the whole band in one go.',
  },
  {
    badge: 'bg-emerald-green text-dark-teal',
    title: 'Show the QR, plug in',
    body: 'Your ticket lives in My Bookings with a QR code, the address and a map. Reschedule or cancel any time.',
  },
];

export default function HomeSteps() {
  return (
    <section
      aria-labelledby="home-steps-heading"
      className="bg-pale-blue px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="mx-auto w-full max-w-7xl">
        <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-cyan-blue">
          How it works
        </p>

        {/* Capped short so the line breaks after "you" on a wide screen rather
            than running the full 80rem — a heading this size across the whole
            container is a line the eye has to track back along. */}
        <h2
          id="home-steps-heading"
          className="mt-3 max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight text-dark-teal sm:text-4xl lg:text-5xl"
        >
          Three steps between you and a stage
        </h2>

        {/* An ordered list, because the order is the content — these are not
            three features to pick from. `list-none` because the numbers are
            drawn as badges; the semantics stay, the markers go. */}
        <ol className="mt-10 grid list-none gap-6 lg:mt-12 lg:grid-cols-3">
          {STEPS.map(({ badge, title, body }, index) => (
            <li
              key={title}
              className="rounded-2xl bg-base-100 p-6 shadow-sm sm:p-8"
            >
              {/* aria-hidden: the number is already carried by the list, and a
                  screen reader announcing "01" before "item 1 of 3" is the same
                  fact twice. */}
              <span
                aria-hidden
                className={`grid size-9 place-items-center rounded-full font-display text-sm font-bold ${badge}`}
              >
                {String(index + 1).padStart(2, '0')}
              </span>

              <h3 className="mt-6 font-display text-xl font-bold text-dark-teal">
                {title}
              </h3>

              <p className="mt-3 text-dark-teal/70">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
