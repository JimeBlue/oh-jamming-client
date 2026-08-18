import Image from 'next/image';
import { FaRegImage } from 'react-icons/fa6';

/* The session photo at list size, or a stand-in when there isn't one. `image` is
   optional on the API's output and absent on everything posted before uploads
   existed, so no photo is an ordinary state rather than a fault.

   Tinted rather than grey, which is the one place this parts company with the
   listing's own placeholder. A flat grey square is what a *broken* image looks
   like; at 80px there is no room for the listing's "No photo for this session"
   to say otherwise, so the square has to look deliberate on its own. Same icon
   as the listing, though — "no photo" means one thing across the app. */
/* No `title` prop, because there is no alt to put it in — see below. */

/* Two sizes rather than a number, because the classes have to be written out for
   Tailwind to emit them — a `size-${n}` built at runtime is a class that exists
   in the markup and nowhere in the stylesheet. `width`/`height` are the intrinsic
   request to next/image and are kept in step with the largest rendered box, so
   the served file is never smaller than the space it fills. */
const SIZES = {
  row: { box: 'size-20', px: 80 },
  header: { box: 'size-24 sm:size-32', px: 128 },
} as const;

export default function JamThumbnail({
  image,
  size = 'row',
}: {
  image?: string;
  size?: keyof typeof SIZES;
}) {
  const { box, px } = SIZES[size];

  if (!image) {
    return (
      <div
        /* Decorative: the row already says the title, in words, an inch away. */
        aria-hidden
        className={`grid ${box} shrink-0 place-items-center rounded-box bg-royal-blue/10`}
      >
        <FaRegImage className="size-7 text-royal-blue/30" />
      </div>
    );
  }

  return (
    <Image
      src={image}
      /* Empty on purpose. The alt of a thumbnail sitting beside its own heading
         is noise — a screen reader would announce the session twice — and the
         WAI's own advice for a linked image next to its text label is to leave
         the naming to the text. */
      alt=""
      width={px}
      height={px}
      className={`${box} shrink-0 rounded-box object-cover`}
    />
  );
}
