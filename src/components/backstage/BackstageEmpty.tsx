import Link from 'next/link';
import { FaPlugCirclePlus } from 'react-icons/fa6';

/* The board before there is a board.

   It carries the only "Insert your Jam" on the page — the header's copy is
   hidden while this is showing. Two buttons with the same words, six inches
   apart, both going to the same place, is a moment of "is one of these
   different?" for no gain. Once there are sessions the header's takes over,
   because by then the list is what the page is for and the button is a tool
   rather than the point. */
export default function BackstageEmpty() {
  return (
    <div className="mt-8 grid place-items-center rounded-box border border-dashed border-base-300 bg-base-100 p-10 text-center">
      <p className="font-heading text-xl">No jam session published yet</p>

      <p className="mt-2 text-sm text-base-content/80">
        Insert your first jam session to get started.
      </p>

      {/* A link styled as a button rather than a <button>: it navigates, and
          anything that navigates should be middle-clickable and openable in a
          new tab like every other link on the site. */}
      <Link
        href="/jams/new"
        className="btn mt-6 gap-2 border-dark-teal bg-dark-teal font-bold text-white shadow-none transition-colors hover:bg-transparent hover:text-dark-teal"
      >
        <FaPlugCirclePlus className="size-5" />
        Insert your Jam
      </Link>
    </div>
  );
}
