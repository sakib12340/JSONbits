import {
  defaultKeymap,
  history,
  historyKeymap,
} from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import {
  HighlightStyle,
  bracketMatching,
  syntaxHighlighting,
} from '@codemirror/language';
import { Compartment, EditorState } from '@codemirror/state';
import {
  EditorView,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder as placeholderExtension,
} from '@codemirror/view';
import { tags } from '@lezer/highlight';

export interface EditorHandle {
  getDoc(): string;
  getLength(): number;
  setDoc(text: string): void;
  setReadOnly(readOnly: boolean): void;
  gotoLine(line: number, column?: number): void;
  lineText(line: number): string | null;
  focus(): void;
  refresh(): void;
  destroy(): void;
}

interface EditorOptions {
  parent: HTMLElement;
  doc: string;
  readOnly: boolean;
  placeholder: string;
  label: string;
  onChange?: (length: number) => void;
}

const theme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'var(--editor-bg)',
    color: 'var(--editor-text)',
  },
  // The caret is the focus indicator here: a ring around the whole pane
  // competes with the code and reads as a selection box.
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
    fontSize: '13.5px',
    lineHeight: '1.65',
    overflow: 'auto',
  },
  '.cm-content': {
    padding: '14px 0 20px',
    caretColor: 'var(--primary)',
  },
  '.cm-content:focus-visible': {
    outline: 'none',
  },
  '.cm-line': {
    padding: '0 var(--editor-pad)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--editor-gutter)',
    color: 'var(--editor-gutter-text)',
    border: 'none',
    paddingLeft: '4px',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 10px 0 6px',
    minWidth: '32px',
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--editor-active)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--editor-active)',
    color: 'var(--editor-text)',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--primary)',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
    {
      backgroundColor: 'var(--editor-selection)',
    },
  '.cm-matchingBracket': {
    backgroundColor: 'var(--editor-match)',
    outline: '1px solid var(--line-strong)',
  },
  '.cm-placeholder': {
    color: 'var(--body-mid)',
  },
});

const highlight = HighlightStyle.define([
  { tag: tags.propertyName, color: 'var(--syntax-key)' },
  { tag: tags.string, color: 'var(--syntax-string)' },
  { tag: tags.number, color: 'var(--syntax-number)' },
  { tag: tags.bool, color: 'var(--syntax-literal)' },
  { tag: tags.null, color: 'var(--syntax-literal)' },
  { tag: [tags.punctuation, tags.separator, tags.bracket], color: 'var(--syntax-punct)' },
  { tag: tags.invalid, color: 'var(--danger)' },
]);

function readOnlyExtension(readOnly: boolean) {
  return [EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)];
}

export function createEditor(options: EditorOptions): EditorHandle {
  const readOnlyCompartment = new Compartment();
  const view = new EditorView({
    parent: options.parent,
    state: EditorState.create({
      doc: options.doc,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        drawSelection(),
        dropCursor(),
        history(),
        bracketMatching(),
        json(),
        syntaxHighlighting(highlight),
        theme,
        EditorView.lineWrapping,
        placeholderExtension(options.placeholder),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        readOnlyCompartment.of(readOnlyExtension(options.readOnly)),
        EditorView.contentAttributes.of({
          'aria-label': options.label,
          'aria-multiline': 'true',
          role: 'textbox',
          spellcheck: 'false',
          autocapitalize: 'off',
          autocomplete: 'off',
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) options.onChange?.(update.state.doc.length);
        }),
      ],
    }),
  });

  return {
    getDoc: () => view.state.doc.toString(),
    getLength: () => view.state.doc.length,
    setDoc(text: string): void {
      if (view.state.doc.toString() === text) return;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
      });
    },
    setReadOnly(readOnly: boolean): void {
      view.dispatch({
        effects: readOnlyCompartment.reconfigure(readOnlyExtension(readOnly)),
      });
    },
    gotoLine(line: number, column = 1): void {
      const total = view.state.doc.lines;
      const lineNumber = Math.min(Math.max(1, Math.floor(line)), total);
      const info = view.state.doc.line(lineNumber);
      const safeColumn = Math.min(Math.max(1, Math.floor(column)), info.length + 1);
      const position = info.from + safeColumn - 1;

      view.dispatch({
        selection: { anchor: position },
        effects: EditorView.scrollIntoView(position, { y: 'center' }),
      });
      view.focus();
    },
    lineText(line: number): string | null {
      const total = view.state.doc.lines;
      if (line < 1 || line > total) return null;
      return view.state.doc.line(line).text;
    },
    focus: () => view.focus(),
    refresh: () => view.requestMeasure(),
    destroy: () => view.destroy(),
  };
}
