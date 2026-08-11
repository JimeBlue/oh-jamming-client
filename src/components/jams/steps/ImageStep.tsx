import { IoInformationCircle } from 'react-icons/io5';

/* Step one has no field yet: the API's jam session has no image on it, so there
   is nothing to send even if the venue picked a file. Rather than hide the step
   and renumber the other seven later, it says so — the shape of the wizard stays
   the shape it will keep. */
export default function ImageStep() {
  return (
    /* Not daisyUI's `alert alert-info`: this theme's --color-info is the brand
       indigo, which fills the whole box and shouts at someone who is only being
       told a field isn't ready yet. A tinted panel says the same thing at the
       volume it deserves. */
    <div
      role="note"
      className="flex gap-3 rounded-box border border-secondary/40 bg-secondary/10 p-4"
    >
      <IoInformationCircle className="size-6 shrink-0 text-secondary" />
      <p className="text-sm">
        Image upload is still to be built — the API has no field for it yet.
        Carry on to the next step; you&apos;ll be able to add a photo here once
        it&apos;s ready.
      </p>
    </div>
  );
}
