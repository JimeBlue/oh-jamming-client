import type { MarkdownStorage } from 'tiptap-markdown';

/* tiptap-markdown ships types for its own exports but never tells TipTap that it
   has added anything to `editor.storage` — so `editor.storage.markdown` is a
   type error rather than the serialiser it is at runtime.

   Declared here rather than reached for with a cast at the call site: a cast
   would keep compiling if the extension were removed, and the first sign of it
   would be `getMarkdown is not a function` in the browser. */
declare module '@tiptap/core' {
  interface Storage {
    markdown: MarkdownStorage;
  }
}
