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
    const cmView = window.CodeMirrorModules['@codemirror/view']
    const cmState = window.CodeMirrorModules['@codemirror/state']
    const cmLanguage = window.CodeMirrorModules['@codemirror/language']
    const cmJavaScript = window.CodeMirrorModules['@codemirror/lang-javascript']
    const cmCss = window.CodeMirrorModules['@codemirror/lang-css']
    const cmHtml = window.CodeMirrorModules['@codemirror/lang-html']
    const cmJson = window.CodeMirrorModules['@codemirror/lang-json']
    const cmMarkdown = window.CodeMirrorModules['@codemirror/lang-markdown']
    const langPlugins = []
    if (['js', 'javascript'].includes(this.fileType)) {
      langPlugins.push(cmJavaScript.javascriptLanguage)
    } else if (this.fileType === 'css') {
      langPlugins.push(cmCss.cssLanguage)
    } else if (this.fileType === 'html') {
      langPlugins.push(cmHtml.htmlLanguage)
    } else if (this.fileType === 'json') {
      langPlugins.push(cmJson.jsonLanguage)
    } else if (this.fileType === 'md') {
      const codeLanguages = [
        cmLanguage.LanguageDescription.of({
          name: 'javascript',
          alias: ['js'],
          async load() {
            return new cmLanguage.LanguageSupport(cmJavaScript.javascriptLanguage)
          },
        }),
        cmLanguage.LanguageDescription.of({
          name: 'css',
          async load() {
            return new cmLanguage.LanguageSupport(cmCss.cssLanguage)
          },
        }),
        cmLanguage.LanguageDescription.of({
          name: 'json',
          async load() {
            return new cmLanguage.LanguageSupport(cmJson.jsonLanguage)
          },
        }),
        cmLanguage.LanguageDescription.of({
          name: 'html',
          async load() {
            const javascript = new cmLanguage.LanguageSupport(cmJavaScript.javascriptLanguage)
            const css = new cmLanguage.LanguageSupport(cmCss.cssLanguage)
            return new cmLanguage.LanguageSupport(cmHtml.htmlLanguage, [css, javascript])
          },
        }),
      ]
      const { language, support } = cmMarkdown.markdown({codeLanguages, addKeymap: false})
      const markdownSupport = new cmLanguage.LanguageSupport(
        language, [...support, cmState.Prec.high(cmView.keymap.of(cmMarkdown.markdownKeymap))]
      )
      langPlugins.push(
        markdownSupport
      )
    }
    return langPlugins
  }

  initEditor() {
    const cmView = window.CodeMirrorModules['@codemirror/view']
    const cmState = window.CodeMirrorModules['@codemirror/state']
    const cmLanguage = window.CodeMirrorModules['@codemirror/language']
    const cmCommands = window.CodeMirrorModules['@codemirror/commands']
    const cmAutocomplete = window.CodeMirrorModules['@codemirror/autocomplete']
    const cmSearch = window.CodeMirrorModules['@codemirror/search']
    const cmLint = window.CodeMirrorModules['@codemirror/lint']
    this.languageCompartment = new cmState.Compartment()
    const langPlugins = this.langPlugins
    const basicSetup = [
      cmView.lineNumbers(),
      cmView.highlightActiveLineGutter(),
      cmView.highlightSpecialChars(),
      cmCommands.history(),
      cmLanguage.foldGutter(),
      cmView.drawSelection(),
      cmView.dropCursor(),
      cmState.EditorState.allowMultipleSelections.of(true),
      cmLanguage.indentOnInput(),
      cmLanguage.syntaxHighlighting(
        cmLanguage.defaultHighlightStyle, {fallback: true}
      ),
      cmLanguage.bracketMatching(),
      cmAutocomplete.closeBrackets(),
      cmAutocomplete.autocompletion(),
      cmView.rectangularSelection(),
      cmView.crosshairCursor(),
      cmView.highlightActiveLine(),
      cmSearch.highlightSelectionMatches(),
      cmView.keymap.of([
        ...cmAutocomplete.closeBracketsKeymap,
        ...cmCommands.defaultKeymap,
        ...cmSearch.searchKeymap,
        ...cmCommands.historyKeymap,
        ...cmLanguage.foldKeymap,
        ...cmAutocomplete.completionKeymap,
        ...cmLint.lintKeymap,
      ]),
    ]
    const viewTheme = cmView.EditorView.theme({
      '&': {flexGrow: '1', height: '100%'},
      '.cm-scroller': {overflow: 'auto'}
    })
    this.view = new cmView.EditorView({
      doc: this._value ?? '',
      extensions: [
        ...basicSetup,
        this.languageCompartment.of(langPlugins),
        viewTheme,
        cmView.EditorView.updateListener.of(e => {
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
      flex-grow: 1;
      background-color: #fff;
      height: 100%;
    }
  `
}
```
