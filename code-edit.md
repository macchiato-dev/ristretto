# Code Edit

`notebook.json`

```json
{
  "bundleFiles": [
    ["codemirror-bundle.md", "codemirror-bundle.js"]
  ]
}
```

This sets up CodeMirror. It supports getting and setting the text, and sends the `code-input` event when the text is edited. The filetype can be changed dynamically.

`code-edit.js`

```js
import { keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, EditorView } from '@codemirror/view'
import { Compartment, Prec, EditorState } from '@codemirror/state'
import { LanguageSupport, LanguageDescription, foldGutter, indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldKeymap } from '@codemirror/language'
import { javascriptLanguage } from '@codemirror/lang-javascript'
import { cssLanguage } from '@codemirror/lang-css'
import { htmlLanguage } from '@codemirror/lang-html'
import { jsonLanguage } from '@codemirror/lang-json'
import { markdown, markdownKeymap } from '@codemirror/lang-markdown'
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands'
import { closeBrackets, autocompletion, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { lintKeymap } from '@codemirror/lint'
import { oneDark } from '@codemirror/theme-one-dark'

export class CodeEdit extends HTMLElement {
  constructor() {
    super()
    this.lineWrapping = false
    this.dark = false
  }

  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styleSheet]
    this.initEditor()
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
    const previousFileType = this.fileType
    this._fileType = value
    if (this.fileType !== previousFileType) {
      this.reconfigureLanguage()
    }
  }

  get fileType() {
    return this._fileType
  }

  set dark(value) {
    const previousDark = this.dark
    this._dark = value
    if (this.dark !== previousDark) {
      this.reconfigureTheme()
    }
  }

  get dark() {
    return this._dark
  }

  set lineWrapping(value) {
    this._lineWrapping = value
  }

  get lineWrapping() {
    return this._lineWrapping
  }

  reconfigureLanguage() {
    if (this.view) {
      const {langPlugins} = this
      this.view.dispatch({
        effects: this.languageCompartment.reconfigure(langPlugins)
      })
    }
  }

  reconfigureTheme() {
    if (this.view) {
      const {themePlugins} = this
      this.view.dispatch({
        effects: this.themeCompartment.reconfigure(themePlugins)
      })
    }
  }

  get langPlugins() {
    const langPlugins = []
    if (['js', 'javascript'].includes(this.fileType)) {
      langPlugins.push(javascriptLanguage)
    } else if (this.fileType === 'css') {
      langPlugins.push(cssLanguage)
    } else if (this.fileType === 'html') {
      langPlugins.push(htmlLanguage)
    } else if (this.fileType === 'json') {
      langPlugins.push(jsonLanguage)
    } else if (this.fileType === 'md') {
      const codeLanguages = [
        LanguageDescription.of({
          name: 'javascript',
          alias: ['js'],
          async load() {
            return new LanguageSupport(javascriptLanguage)
          },
        }),
        LanguageDescription.of({
          name: 'css',
          async load() {
            return new LanguageSupport(cssLanguage)
          },
        }),
        LanguageDescription.of({
          name: 'json',
          async load() {
            return new LanguageSupport(jsonLanguage)
          },
        }),
        LanguageDescription.of({
          name: 'html',
          async load() {
            const javascript = new LanguageSupport(javascriptLanguage)
            const css = new LanguageSupport(cssLanguage)
            return new LanguageSupport(htmlLanguage, [css, javascript])
          },
        }),
      ]
      const { language, support } = markdown({codeLanguages, addKeymap: false})
      const markdownSupport = new LanguageSupport(
        language, [...support, Prec.high(keymap.of(markdownKeymap))]
      )
      langPlugins.push(
        markdownSupport
      )
    }
    if (this.lineWrapping) {
      langPlugins.push(EditorView.lineWrapping)
    }
    return langPlugins
  }

  get themePlugins() {
    return this.dark ? [this.constructor.viewThemeDark, oneDark] : [this.constructor.viewTheme]
  }

  initEditor() {
    this.languageCompartment = new Compartment()
    this.themeCompartment = new Compartment()
    const langPlugins = this.langPlugins
    const themePlugins = this.themePlugins
    const basicSetup = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      foldGutter(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(
        defaultHighlightStyle, {fallback: true}
      ),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...lintKeymap,
      ]),
    ]
    this.view = new EditorView({
      doc: this._value ?? '',
      extensions: [
        ...basicSetup,
        this.languageCompartment.of(langPlugins),
        this.themeCompartment.of(themePlugins),
        EditorView.updateListener.of(e => {
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

  focus() {
    this.view.focus()
  }

  static get viewTheme() {
    if (!this._viewTheme) {
      this._viewTheme = EditorView.theme({
        '&': {flexGrow: '1', height: '100%'},
        '.cm-scroller': {overflow: 'auto'}
      })
    }
    return this._viewTheme
  }

  static get viewThemeDark() {
    if (!this._viewThemeDark) {
      this._viewThemeDark = EditorView.theme({
        '&': {flexGrow: '1', height: '100%'},
        '.cm-scroller': {
          overflow: 'auto',
        },
      })
    }
    return this._viewThemeDark
  }
}
```

`app-view.js`

```js
export class AppView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
  }

  connectedCallback() {
    const globalStyle = document.createElement('style')
    globalStyle.textContent = `
      body {
        margin: 0;
        padding: 0;
      }
      html {
        box-sizing: border-box;
      }
      *, *:before, *:after {
        box-sizing: inherit;
      }
    `
    document.head.append(globalStyle)

    const style = document.createElement('style')
    style.textContent = `
    `
    this.shadowRoot.append(style)

    const codeEdit = document.createElement('code-edit')
    codeEdit.fileType = 'js'
    codeEdit.value = `const x = 9\n`.repeat(100).trim()
    codeEdit.dark = true
    // setTimeout(() => {
    //   codeEdit.dark = true
    // }, 1500)
    // setTimeout(() => {
    //   codeEdit.fileType = 'html'
    // }, 3000)
    this.shadowRoot.append(codeEdit)
  }
}
```

`app.js`

```js
import {CodeEdit} from '/code-edit.js'
import {AppView} from '/app-view.js'

customElements.define('code-edit', CodeEdit)
customElements.define('app-view', AppView)

async function setup() {
  const appView = document.createElement('app-view')
  document.body.append(appView)
}

await setup()
```
