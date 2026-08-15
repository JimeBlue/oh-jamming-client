import { FaChevronRight } from 'react-icons/fa6';

/* The design's pager, with nothing behind it.

   `GET /jam-sessions` hands back every matching session in one array — no
   `limit`, no `offset`, no total in the response — so there are no pages to move
   between and these numbers describe nothing. It is here because the design has
   it and the grid ends abruptly without it.

   Spans rather than buttons, and `aria-hidden` over the lot, for exactly that
   reason: a control that ignores clicks is worse than a picture of one, and a
   screen reader announcing "page 2, button" would promise something no amount of
   clicking delivers. The day the API grows paging these become real controls and
   this comment goes away — until then they are an illustration, and the markup
   says so. */
const PAGES = ['1', '2', '3', '…', '8'];

export default function JamPagination() {
  return (
    <div aria-hidden className="mt-14 flex items-center justify-center gap-2">
      {PAGES.map((page, index) => (
        <span
          key={page}
          /* The first is the current page in the design, so it takes the solid
             indigo. Everything else is an outlined tile on the page's own
             white. */
          className={`grid size-10 place-items-center rounded-field text-sm font-bold ${
            index === 0
              ? 'bg-primary text-primary-content'
              : 'border border-base-300 bg-base-100'
          }`}
        >
          {page}
        </span>
      ))}

      {/* Worded rather than a glyph, like the design — and unboxed, so it reads
          as the way onward rather than as a tenth page. */}
      <span className="ml-2 flex items-center gap-1.5 text-sm font-bold">
        Next
        <FaChevronRight className="size-3" />
      </span>
    </div>
  );
}
