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
export default function JamThumbnail({ image }: { image?: string }) {
  if (!image) {
    return (
      <div
        /* Decorative: the row already says the title, in words, an inch away. */
        aria-hidden
        className="grid size-20 shrink-0 place-items-center rounded-box bg-primary/10"
      >
        <FaRegImage className="size-7 text-primary/40" />
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
      width={80}
      height={80}
      className="size-20 shrink-0 rounded-box object-cover"
    />
  );
}
