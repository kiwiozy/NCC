// frontend/app/components/tiptap/PageBreak.ts
import { Node } from '@tiptap/core';

const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  parseHTML() {
    return [{ tag: 'hr[data-page-break]' }];
  },
  renderHTML() {
    return ['hr', { 'data-page-break': 'true' }];
  },
});

export default PageBreak;
