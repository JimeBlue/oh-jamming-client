import { FaRegUserCircle } from 'react-icons/fa';

type UserButtonProps = {
  /* Present once auth exists: logged-in users get a circle with their initial
     instead of the generic icon. Passing it now is how you preview that state. */
  initial?: string;
};

export default function UserButton({ initial }: UserButtonProps) {
  return (
    <button
      type="button"
      aria-label="Account"
      className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full transition-colors hover:text-accent"
    >
      {initial ? (
        <span className="grid size-10 place-items-center rounded-full bg-accent font-heading text-lg text-accent-content">
          {initial.toUpperCase()}
        </span>
      ) : (
        <FaRegUserCircle className="size-8" />
      )}
    </button>
  );
}
