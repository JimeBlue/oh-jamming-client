import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

/* The browse's pager.

   It used to be five spans under `aria-hidden` — a picture of a pager, because
   `GET /jam-sessions` handed back every match in one array and there were no
   pages to move between. The API takes `page` and `limit` now and returns a
   `total` alongside the items, so these are real controls and the markup says so:
   buttons, a `<nav>` that announces itself, and the current page marked with
   `aria-current` rather than only with a colour. */

type JamPaginationProps = {
  /* 1-based, and the server's own number rather than the one that was asked
     for — see `JamBrowse`. */
  page: number;
  /* Every session matching the filters, not the ones on screen. The only thing
     that can say how many pages there are. */
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
};

/* How many numbered buttons to draw around the current one before falling back
   to an ellipsis. Odd, so the current page sits in the middle of them. */
const WINDOW = 5;

/* The numbers to draw, with `null` standing for a gap.
 *
 * Always first and last, always a window around the current page, and an
 * ellipsis wherever that leaves a jump. The rule that keeps the row from
 * changing width as you page through it: the window is grown at the near end
 * when it runs off either edge, so page 1 and page 7 of 20 draw the same number
 * of buttons.
 */
export const pageItems = (page: number, pageCount: number): (number | null)[] => {
  /* Few enough to draw them all, which is the case this app is actually in.
     Everything below only starts mattering at nine pages — a hundred sessions —
     and is written because a pager that breaks at scale is a pager that gets
     rewritten at the worst possible moment. */
  if (pageCount <= WINDOW + 2) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const half = Math.floor(WINDOW / 2);

  /* Clamped at both ends so the window keeps its width: near page 1 it extends
     right, near the last page it extends left. */
  let start = Math.max(2, page - half);
  let end = Math.min(pageCount - 1, page + half);

  if (page - half < 2) end = Math.min(pageCount - 1, WINDOW);
  if (page + half > pageCount - 1) start = Math.max(2, pageCount - WINDOW + 1);

  const items: (number | null)[] = [1];

  /* A gap of exactly one page gets the number rather than an ellipsis — "…"
     standing in for a single button is longer than the button. */
  if (start > 2) items.push(null);
  else if (start === 3) items.push(2);

  for (let index = start; index <= end; index += 1) items.push(index);

  if (end < pageCount - 1) items.push(null);
  else if (end === pageCount - 2) items.push(pageCount - 1);

  items.push(pageCount);

  return items;
};

export default function JamPagination({ page, total, limit, onPageChange }: JamPaginationProps) {
  const pageCount = Math.ceil(total / limit);

  /* Nothing to navigate. Drawn only when it does something — a single dead "1"
     under a short list is a control that asks to be clicked and then doesn't
     move, which reads as broken rather than as complete. */
  if (pageCount <= 1) return null;

  const items = pageItems(page, pageCount);

  /* The shared shape of every tile in the row, so the numbers, the arrows and
     the ellipsis all sit on the same grid. */
  const tile = 'grid size-10 place-items-center rounded-field text-sm font-bold';

  return (
    <nav aria-label="Jam session pages" className="mt-14 flex items-center justify-center gap-2">
      {/* Disabled rather than hidden at the ends. The row keeps its width and the
          numbers keep their position, so paging doesn't shift the thing you are
          aiming at out from under the cursor. */}
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className={`${tile} bg-base-100 text-dark-teal ring-1 ring-dark-teal/10 transition-colors hover:text-royal-blue hover:ring-royal-blue disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-dark-teal disabled:hover:ring-dark-teal/10`}
      >
        <FaChevronLeft className="size-3" />
      </button>

      {items.map((item, index) =>
        item === null ? (
          /* The gap. `aria-hidden` because it names nothing a reader can go to —
             the buttons either side already say where the jump lands. */
          <span
            /* Keyed by position, which is the exception the rule about index
               keys allows for: an ellipsis has no identity of its own, and its
               place in the row is the only thing telling the leading one from
               the trailing one. */
            key={`gap-${index}`}
            aria-hidden
            className={`${tile} text-dark-teal/40`}
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            /* What tells a screen reader which page it is on. The solid blue
               below says the same thing to everyone else, and a colour alone
               would say it to nobody using one. */
            aria-current={item === page ? 'page' : undefined}
            aria-label={`Page ${item}`}
            className={`${tile} transition-colors ${
              item === page
                ? 'bg-royal-blue text-white'
                : 'bg-base-100 text-dark-teal ring-1 ring-dark-teal/10 hover:text-royal-blue hover:ring-royal-blue'
            }`}
          >
            {item}
          </button>
        ),
      )}

      {/* Worded rather than a glyph, like the design — and unboxed, so it reads
          as the way onward rather than as one more page. */}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page === pageCount}
        className="ml-2 flex items-center gap-1.5 text-sm font-bold text-dark-teal transition-colors hover:text-royal-blue disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-dark-teal"
      >
        Next
        <FaChevronRight className="size-3" />
      </button>
    </nav>
  );
}
