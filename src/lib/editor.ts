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
import {
  highlightSelectionMatches,
  openSearchPanel,
  search,
  searchKeymap,
} from '@codemirror/search';
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
  hasFocus(): boolean;
  openFind(): void;
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
  '.cm-searchMatch': {
    backgroundColor: 'var(--editor-match)',
    outline: '1px solid var(--line-strong)',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'var(--editor-selection)',
  },
  '.cm-panel.cm-search': {
    backgroundColor: 'var(--editor-gutter)',
    color: 'var(--body)',
    borderBottom: '1px solid var(--line)',
    padding: '6px 32px 6px 10px',
    fontFamily: 'var(--font-sans)',
    fontSize: '12px',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '4px',
  },
  // Same treatment as the home search field: one hairline that deepens on focus,
  // never a second ring around it.
  '.cm-panel.cm-search input[name="search"]': {
    flex: '1 1 6em',
    minWidth: '0',
    width: 'auto',
    borderColor: 'var(--line)',
  },
  '.cm-panel.cm-search input[name="search"]:focus, .cm-panel.cm-search input[name="search"]:focus-visible':
    {
      outline: 'none',
      borderColor: 'var(--ink)',
    },
  '.cm-panel.cm-search input': {
    backgroundColor: 'var(--canvas)',
    color: 'var(--ink)',
    border: '1px solid var(--line)',
    borderRadius: '6px',
    padding: '3px 7px',
    fontFamily: 'var(--font-sans)',
    fontSize: '12px',
    marginRight: '0',
  },
  '.cm-panel.cm-search button': {
    backgroundColor: 'transparent',
    backgroundImage: 'none',
    color: 'var(--body)',
    border: '1px solid var(--line)',
    borderRadius: '6px',
    padding: '3px 6px',
    fontFamily: 'var(--font-sans)',
    fontSize: '12px',
    cursor: 'pointer',
  },
  '.cm-panel.cm-search button:hover': {
    backgroundColor: 'var(--cream)',
    color: 'var(--ink)',
  },
  '.cm-panel.cm-search button[name="close"]': {
    border: 'none',
    color: 'var(--body-mid)',
    fontSize: '16px',
    lineHeight: '1',
    padding: '4px 6px',
    position: 'absolute',
    top: '50%',
    right: '4px',
    transform: 'translateY(-50%)',
  },
  '.cm-panel.cm-search label': {
    color: 'var(--body-mid)',
    fontSize: '11px',
    marginRight: '0',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    lineHeight: '1.6',
  },
  '.cm-panel.cm-search input[type="checkbox"]': {
    appearance: 'none',
    width: '13px',
    height: '13px',
    flex: 'none',
    margin: '0',
    padding: '0',
    borderRadius: '3px',
    border: '1px solid var(--line-strong)',
    backgroundColor: 'var(--canvas)',
    cursor: 'pointer',
  },
  '.cm-panel.cm-search input[type="checkbox"]:checked': {
    backgroundColor: 'var(--primary)',
    borderColor: 'var(--primary)',
  },
  '.cm-panel.cm-search input[type="checkbox"]:focus-visible': {
    outline: '2px solid var(--focus-ring)',
    outlineOffset: '1px',
  },
  // A formatter is for reading, not bulk-editing: keep the panel to one row.
  '.cm-panel.cm-search input[name="replace"], .cm-panel.cm-search button[name="replace"], .cm-panel.cm-search button[name="replaceAll"], .cm-panel.cm-search br, .cm-panel.cm-search label:has(input[name="word"])':
    {
      display: 'none',
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
        search({ top: true }),
        highlightSelectionMatches(),
        keymap.of([...defaultKeymap, ...searchKeymap, ...historyKeymap]),
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
    hasFocus: () => view.hasFocus,
    openFind: () => {
      openSearchPanel(view);
    },
    refresh: () => view.requestMeasure(),
    destroy: () => view.destroy(),
  };
}
