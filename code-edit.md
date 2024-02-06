# Code Edit

This sets up CodeMirror. It supports getting and setting the text, and sends the `code-input` event when the text is edited. The filetype can be changed dynamically.

`code-edit.js`

```js
export class CodeEdit extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [
      this.constructor.styleSheet
    ]
  }

  connectedCallback() {
    this.initEditor()
  }

  static get styleSheet() {
    if (this._styleSheet === undefined) {
      this._styleSheet = new CSSStyleSheet()
      this._styleSheet.replaceSync(this.css)
    }
    return this._styleSheet
  }

  set value(value) {
    if (this.view) {
      this.view.dispatch({changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: value
      }})
    } else {
      this._value = value
    }
  }

  get value() {
    if (this.view) {
      return this.view.state.doc.toString()
    } else {
      return this._value ?? ''
    }
  }

  set fileType(value) {
    this._fileType = value
    if (this.view) {
      const langPlugins = this.langPlugins
      this.view.dispatch({
        effects: 
        this.languageCompartment.reconfigure(langPlugins)
      })
    }
  }

  get fileType() {
    return this._fileType
  }

  get langPlugins() {
    const cm = window.CodeMirrorBasic
    const langPlugins = []
    if (['js', 'javascript'].includes(this.fileType)) {
      langPlugins.push(cm.javascriptLanguage)
    } else if (this.fileType === 'css') {
      langPlugins.push(cm.cssLanguage)
    } else if (this.fileType === 'html') {
      langPlugins.push(cm.htmlLanguage)
    } else if (this.fileType === 'json') {
      langPlugins.push(cm.jsonLanguage)
    }
    return langPlugins
  }

  initEditor() {
    const cm = window.CodeMirrorBasic
    this.languageCompartment = new cm.Compartment()
    const langPlugins = this.langPlugins
    const basicSetup = [
      cm.lineNumbers(),
      cm.highlightActiveLineGutter(),
      cm.highlightSpecialChars(),
      cm.history(),
      cm.foldGutter(),
      cm.drawSelection(),
      cm.dropCursor(),
      cm.EditorState.allowMultipleSelections.of(true),
      cm.indentOnInput(),
      cm.syntaxHighlighting(
        cm.defaultHighlightStyle, {fallback: true}
      ),
      cm.bracketMatching(),
      cm.closeBrackets(),
      cm.autocompletion(),
      cm.rectangularSelection(),
      cm.crosshairCursor(),
      cm.highlightActiveLine(),
      cm.highlightSelectionMatches(),
      cm.keymap.of([
        ...cm.closeBracketsKeymap,
        ...cm.defaultKeymap,
        ...cm.searchKeymap,
        ...cm.historyKeymap,
        ...cm.foldKeymap,
        ...cm.completionKeymap,
        ...cm.lintKeymap
      ]),
    ]
    this.view = new cm.EditorView({
      doc: this._value ?? '',
      extensions: [
        ...basicSetup,
        this.languageCompartment.of(langPlugins),
        cm.EditorView.updateListener.of(e => {
          if (e.docChanged) {
            this.dispatchEvent(new CustomEvent(
              'code-input', {bubbles: true, composed: true}
            ))
          }
        }),
      ],
      root: this.shadowRoot,
    })
    this.shadowRoot.append(this.view.dom)
  }

  static css = `
    :host {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      background-color: #fff;
    }
    :host > * {
      flex-grow: 1;
    }
    .cm-editor.cm-focused {
      outline: none;
    }
  `
}
```
