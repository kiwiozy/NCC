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
            .insertContent({ type: this.name })
            .command(({ tr, dispatch }) => {
              if (dispatch) {
                const { parent, pos } = tr.selection.$from;
                const posAfter = pos + 1;
                const nodeAfter = tr.doc.nodeAt(posAfter);

                if (nodeAfter) {
                  tr.setSelection(
                    // @ts-ignore
                    new TextSelection(tr.doc.resolve(posAfter))
                  );
                } else {
                  const node = parent.type.contentMatch.defaultType?.create();

                  if (node) {
                    tr.insert(posAfter, node);
                    // @ts-ignore
                    tr.setSelection(new TextSelection(tr.doc.resolve(posAfter)));
                  }
                }

                tr.scrollIntoView();
              }

              return true;
            })
            .run();
        },
    };
  },
});

