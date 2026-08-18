'use client';

import { Placeholder } from '@tiptap/extensions';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useState } from 'react';
import {
  FaBold,
  FaItalic,
  FaLink,
  FaListOl,
  FaListUl,
  FaLinkSlash,
} from 'react-icons/fa6';
import { Markdown } from 'tiptap-markdown';

import LinkDialog from './LinkDialog';

/* The overview editor: bold, italic, link, and the two kinds of list.

   Deliberately five buttons and no more. TipTap's StarterKit ships headings,
   quotes, code blocks, strikethrough and horizontal rules as well, and every one
   of them is a formatting decision a venue would have to make about a paragraph
   describing a jam night. They're switched off below rather than left enabled
   and unlabelled — an editor that accepts a `# heading` from a paste but has no
   button for it is a surface with no edge.

   The value in and out is **markdown**, not HTML. That's the whole reason for
   `tiptap-markdown`: the API stores the overview as markdown in a text block, so
   nothing rendering it later has to sanitise HTML. TipTap's own document model
   is neither — it's ProseMirror JSON — so markdown goes in at mount and comes
   back out of the serialiser on every change. */

type MarkdownEditorProps = {
  /* Seeds the editor once, at mount, and is not read again — feeding a value
     back into a text editor on every keystroke is how you send the caret to
     position 0 mid-word. The form holds the value from then on, and this is
     mounted afresh each time the venue walks back to this step. */
  defaultValue: string;
  onChange: (markdown: string) => void;
  onBlur: () => void;
  invalid?: boolean;
  /* Shown while the document is empty. A rich-text editor has no `placeholder`
     attribute to hand — the text is a `::before` on the empty paragraph, drawn
     from an extension — which is why this is a prop rather than something the
     caller could pass straight through. */
  placeholder?: string;
};

export default function MarkdownEditor({
  defaultValue,
  onChange,
  onBlur,
  invalid,
  placeholder,
}: MarkdownEditorProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const editor = useEditor({
    /* Deferred to an effect rather than run during render. TipTap builds real
       DOM, which the server doesn't have — and while the builder happens to be
       client-only today (the role guard renders a spinner until /auth/me
       answers), relying on that would make this component break if it were ever
       used on a page without one. */
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        strike: false,
        underline: false,
        horizontalRule: false,
        link: {
          /* A bare "ohjamming.com" becomes https, not http. */
          defaultProtocol: 'https',
          /* Otherwise a click inside the editor navigates away from a wizard
             holding twenty minutes of unsaved typing. */
          openOnClick: false,
        },
      }),
      Markdown.configure({
        /* Raw HTML in the markdown is not parsed and not kept. The point of
           storing markdown is that nothing downstream has to sanitise, and an
           editor that lets `<script>` through the front door undoes that. */
        html: false,
        /* Paste markdown, get formatting — the venue who wrote their house rules
           in Notes.app gets their asterisks turned into bold rather than left
           lying in the text. */
        transformPastedText: true,
      }),
      /* The one extension from `@tiptap/extensions` this editor uses. It writes
         the text into a `data-placeholder` attribute on the empty paragraph and
         adds a class; drawing it is a `::before` rule in globals.css. */
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    content: defaultValue,
    editorProps: {
      attributes: {
        /* `rich-text` carries the list markers and bold weights that Tailwind's
           preflight strips — see globals.css. The same class renders this
           content on the listing, so the editor and the page agree. */
        class: 'rich-text min-h-48 px-4 py-3 focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.storage.markdown.getMarkdown()),
    onBlur,
  });

  /* Which buttons are lit. `useEditorState` rather than reading `editor.isActive`
     during render: TipTap 3 doesn't re-render React on every transaction, so a
     toolbar built the obvious way sits there showing the formatting the caret
     was in three words ago.

     The editor is still null on the first render — the price of
     `immediatelyRender: false` — and this hook caches that first snapshot until
     something transacts, so it keeps *reporting* null for a moment after the
     editor actually exists. Hence the defaults rather than a null check: gate
     the toolbar on this and it never appears at all. */
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive('bold') ?? false,
      italic: editor?.isActive('italic') ?? false,
      link: editor?.isActive('link') ?? false,
      bulletList: editor?.isActive('bulletList') ?? false,
      orderedList: editor?.isActive('orderedList') ?? false,
    }),
  }) ?? NOTHING_ACTIVE;

  /* One painted frame before the effect that builds the editor runs. Same height
     as the editor, so nothing jumps when it arrives. */
  if (!editor) {
    return (
      <div className="h-64 w-full rounded-box border border-base-300 bg-base-200/40" />
    );
  }

  const toggleLink = () => {
    if (active.link) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    setLinkDialogOpen(true);
  };

  /* The dialog has taken focus off the editor by now, but not its selection —
     ProseMirror keeps that in its own state, so `focus()` puts the caret back
     exactly where the venue left it and the mark lands on the right words. */
  const addLink = (href: string) => {
    setLinkDialogOpen(false);

    /* With nothing selected there is no text to make into a link, so the address
       becomes its own label. The alternative — setting the mark on an empty
       selection — looks like the button did nothing at all. */
    if (editor.state.selection.empty) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text: href,
          marks: [{ type: 'link', attrs: { href } }],
        })
        .run();

      return;
    }

    /* extendMarkRange so clicking inside an existing link edits the whole thing
       rather than splitting it in two at the caret. */
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  };

  return (
    <div
      className={`overflow-hidden rounded-box border bg-base-100 ${
        invalid ? 'border-error' : 'border-base-300'
      }`}
    >
      <div className="flex items-center gap-1 border-b border-base-300 px-2 py-1.5">
        <ToolbarButton
          label="Bold"
          active={active.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <FaBold className="size-3.5" />
        </ToolbarButton>

        <ToolbarButton
          label="Italic"
          active={active.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <FaItalic className="size-3.5" />
        </ToolbarButton>

        <ToolbarButton
          label={active.link ? 'Remove link' : 'Add link'}
          active={active.link}
          onClick={toggleLink}
        >
          {active.link ? (
            <FaLinkSlash className="size-3.5" />
          ) : (
            <FaLink className="size-3.5" />
          )}
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-base-300" />

        <ToolbarButton
          label="Bulleted list"
          active={active.bulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <FaListUl className="size-3.5" />
        </ToolbarButton>

        <ToolbarButton
          label="Numbered list"
          active={active.orderedList}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <FaListOl className="size-3.5" />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />

      {linkDialogOpen && (
        <LinkDialog onCancel={() => setLinkDialogOpen(false)} onSave={addLink} />
      )}
    </div>
  );
}

/* The toolbar before the editor has reported in — see the note on `active`. */
const NOTHING_ACTIVE = {
  bold: false,
  italic: false,
  link: false,
  bulletList: false,
  orderedList: false,
};

type ToolbarButtonProps = {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

const ToolbarButton = ({ label, active, onClick, children }: ToolbarButtonProps) => (
  <button
    /* Every one of these is inside the wizard's form, and a button without an
       explicit type submits it — which on the last step publishes the session. */
    type="button"
    onClick={onClick}
    /* aria-pressed, not aria-selected: these are toggles, and a screen reader
       should say whether bold is on before the venue starts typing in it. */
    aria-pressed={active}
    aria-label={label}
    title={label}
    className={`btn btn-square btn-ghost btn-sm ${active ? 'btn-active' : ''}`}
  >
    {children}
  </button>
);
