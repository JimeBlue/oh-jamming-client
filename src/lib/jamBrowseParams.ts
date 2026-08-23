import { genres, skillLevels, type Genre, type SkillLevel } from '@/schemas/jamSession';
import type { JamSessionQuery } from '@/services/jamSessions';

/* The browse's URL, in both directions.
 *
 * `/jams?city=Berlin&genre=jazz&page=2` is the whole state of that page: which
 * filters are in force and which slice of the results is on screen. That is the
 * point of putting it there rather than in React state — the back button steps
 * through pages the way a reader expects, and the link a musician sends someone
 * opens on the night they were looking at rather than on page one of everything.
 *
 * It also removes a question the component would otherwise have to answer twice.
 * With the URL as the single source of truth there is no filter state to keep in
 * step with it, so "the list re-runs when the URL changes" is the only rule, and
 * a filter change and a back-button press take the same path through the code.
 *
 * Everything here treats the query string as hostile, because it is editable by
 * hand and arrives from other people's links. An unknown genre is dropped rather
 * than passed on: the API's query schema is a `strictObject` over enums, so
 * `?genre=banana` is a 400 for the whole request — a shared link with a typo in
 * it would render the error card instead of the board. Dropping what can't be
 * honoured shows a wider list than asked for, which is recoverable and visibly
 * wrong in the controls; forwarding it is a dead page.
 */

/* The params this page owns. `q` is the AI sentence arriving from the home
   page's search box, which has the same box and no list to put results in. */
export const PAGE_PARAM = 'page';
export const QUERY_PARAM = 'q';

/* Exactly "YYYY-MM-DD", which is what the API's `z.iso.date()` accepts. A looser
   check would pass "2026-8-1" to an endpoint that 400s on it. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const readDate = (value: string | null): string | undefined =>
  value && ISO_DATE.test(value) ? value : undefined;

/* A page number, or 1 for anything that isn't one. `?page=0`, `?page=-3`,
   `?page=1.5` and `?page=banana` are all the first page rather than a 400: a
   number in a URL is the part people edit by hand, and there is a sensible
   answer to all of them. Contrast the filters above, where the sensible answer
   is to drop the filter — here dropping it *is* page one. */
export const readPage = (searchParams: URLSearchParams): number => {
  const raw = Number(searchParams.get(PAGE_PARAM));

  return Number.isInteger(raw) && raw >= 1 ? raw : 1;
};

/* The filters, sanitised. Absent and unrecognised are the same outcome — the
   filter is simply not applied — which is why every branch here ends in
   `undefined` rather than throwing. */
export const readFilters = (searchParams: URLSearchParams): JamSessionQuery => {
  const genre = searchParams.get('genre');
  const skillLevel = searchParams.get('skillLevel');
  const city = searchParams.get('city')?.trim();

  const filters: JamSessionQuery = {};

  if (genre && (genres as readonly string[]).includes(genre)) {
    filters.genre = genre as Genre;
  }

  if (skillLevel && (skillLevels as readonly string[]).includes(skillLevel)) {
    filters.skillLevel = skillLevel as SkillLevel;
  }

  /* Bounded at 60 like the API's own cap, and for the same reason: it becomes a
     regex over the address line on the server. A longer one is a 400, so the
     cap here is what keeps a hand-edited URL rendering a board. */
  if (city && city.length >= 2 && city.length <= 60) filters.city = city;

  const from = readDate(searchParams.get('from'));
  const to = readDate(searchParams.get('to'));

  if (from) filters.from = from;

  /* A range that ends before it starts is a 400 from the API, which refines the
     pair. Dropping `to` widens the search rather than inverting it — the same
     call the API's AI controller makes on the model's output, and for the same
     reason: a widened search shows its own working. */
  if (to && (!from || to >= from)) filters.to = to;

  return filters;
};

/* Back the other way: the query string for a given set of filters and a page.
 *
 * `page` is omitted when it is 1, so the first page's URL is `/jams` rather than
 * `/jams?page=1`. Two URLs for one view is a worse default than it looks — it is
 * two entries in the browser's history, two things to share, and two cache keys
 * for the same request.
 *
 * `q` is deliberately not carried. It is consumed once, on arrival: the sentence
 * is read into filters and those go in the URL in its place, so a reload doesn't
 * spend another AI call re-deriving an answer already written down beside it.
 */
export const browseSearch = (filters: JamSessionQuery, page: number): string => {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }

  if (page > 1) params.set(PAGE_PARAM, String(page));

  return params.toString();
};
