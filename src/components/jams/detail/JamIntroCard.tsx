'use client';

import { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa6';

const LEAD = `Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem ipsum has been the industry's standard dummy text ever since 1966, when designers at Letraset and James Mosley, the librarian at St Bride Printing Library in London, took a galley of type and scrambled it to make a specimen book.`;

const REST = `It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing passages of it, and more recently with desktop publishing software.`;

/* The first card on the detail page, and for now a placeholder for the jam's own
   overview — the shape is here so the rest of the page can be laid out around
   something the right size.

   The button is a real disclosure rather than a dead control: an overview long
   enough to need a "show me more" is exactly the case this has to handle, and a
   button that only looks like one would have to be un-built later anyway. */
export default function JamIntroCard() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="rounded-box bg-base-100 p-6 text-base-content shadow-lg sm:p-8">
      <p className="leading-relaxed">{LEAD}</p>

      {expanded && <p className="mt-4 leading-relaxed">{REST}</p>}

      {/* `aria-expanded` rather than a second label: the words stay "Show me
          more" while the glyph and the state say the rest, which is what a
          screen reader reads off the attribute anyway. */}
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
      >
        <FaChevronDown
          aria-hidden
          className={`size-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
        Show me more
      </button>
    </section>
  );
}
