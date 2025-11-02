// TipTap extension for manual page breaks
import { Node, mergeAttributes } from '@tiptap/core';

export interface PageBreakOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: {
      /**
       * Insert a page break
       */
      setPageBreak: () => ReturnType;
    };
  }
}

export const PageBreak = Node.create<PageBreakOptions>({
  name: 'pageBreak',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  group: 'block',

  parseHTML() {
    return [
      {
        tag: 'hr[class="page-break"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['hr', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: 'page-break' })];
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ chain }) => {
          return chain()
            .insertContent('<hr class="page-break" />')
            .insertContent('<p></p>') // Add empty paragraph after page break
            .run();
        },
    };
  },
});

