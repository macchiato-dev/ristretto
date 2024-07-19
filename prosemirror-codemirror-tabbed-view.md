# ProseMirror/CodeMirror Tabbed View

`notebook.json`

```json
{
  "bundleFiles": [
    ["prosemirror-bundle.md", "prosemirror-bundle.js"],
    ["codemirror-bundle.md", "codemirror-bundle.js"]
  ],
  "importFiles": [
    ["rich-text-edit.md", "rich-text-edit.js"]
  ]
}
```

`code-block-view.js`

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

export class CodeBlockView extends HTMLElement {
  constructor() {
    super()
    this.lineWrapping = false
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
    this._fileType = value
    this.reconfigure()
  }

  get fileType() {
    return this._fileType
  }

  set lineWrapping(value) {
    this._lineWrapping = value
  }

  get lineWrapping() {
    return this._lineWrapping
  }

  reconfigure() {
    if (this.view) {
      const {langPlugins} = this
      this.view.dispatch({
        effects: this.languageCompartment.reconfigure(langPlugins)
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

  initEditor() {
    this.languageCompartment = new Compartment()
    const langPlugins = this.langPlugins
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
    const viewTheme = EditorView.theme({
      '&': {flexGrow: '1', height: '100%'},
      '.cm-scroller': {overflow: 'auto'}
    })
    this.view = new EditorView({
      doc: this._value ?? '',
      extensions: [
        ...basicSetup,
        this.languageCompartment.of(langPlugins),
        viewTheme,
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
}
```

`code-block-edit.js`

```js
import {RichTextEdit} from "/rich-text-edit/rich-text-edit.js"
import {EditorState, TextSelection, Selection, Plugin} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {undo, redo, history} from "prosemirror-history"
import {keymap} from "prosemirror-keymap"
import {baseKeymap} from "prosemirror-commands"
import {Schema, Node, Slice, Fragment} from "prosemirror-model"
import {addListNodes} from "prosemirror-schema-list"
import {exampleSetup} from "prosemirror-example-setup"
import {CodeBlockView} from "/code-block-view.js"


export class CodeBlockEdit extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    const editorDiv = document.createElement('div')
    const content = {
      type: 'doc',
      content: [
        {
          type: 'objKey',
          content: [],
        },
        {
          type: 'objVal',
          content: [],
        },
        {
          type: 'objKey',
          content: [],
        },
        {
          type: 'objVal',
          content: [],
        }
      ],
    }
    this.shadowRoot.append(editorDiv)

    const dataSchema = new Schema({
      nodes: {
        text: {
          inline: true,
        },
        objKey: {
          content: "text*",
          toDOM() { return ["obj-key", 0] },
          parseDOM: [{tag: "obj-key"}],
        },
        objVal: {
          content: "text*",
          toDOM() { return ["obj-val", 0] },
          parseDOM: [{tag: "obj-val"}],
        },
        doc: {content: "(objKey objVal)+"},
      },
    })
    const dataKeymap = keymap({
    })

    const histKeymap = keymap({
      "Mod-z": undo,
      "Mod-y": redo,
    })
    const dataPlugin = new Plugin({
      appendTransaction(transactions, oldState, newState) {
        
      }
    })
    this.view = new EditorView(editorDiv, {
      state: EditorState.create({
        doc: Node.fromJSON(dataSchema, content),
        plugins: [dataKeymap, dataPlugin, histKeymap, history()],
      }),
      root: this.shadowRoot,
    })
  }


  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        .ProseMirror {
          word-wrap: break-word;
          white-space: pre-wrap;
          white-space: break-spaces;
          -webkit-font-variant-ligatures: none;
          font-variant-ligatures: none;
          font-feature-settings: "liga" 0; /* the above doesn't seem to work in Edge */
        }
        :host {
          color: white;
        }
        obj-key, obj-val {
          display: block;
          float: left;
          background-color: #6f6f6f;
          padding: 3px 7px;
          border-radius: 9999px;
          margin-right: 5px;
        }
        obj-key {
          clear: both;
        }
      `)
    }
    return this._styles
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

    const codeBlockEdit = document.createElement('code-block-edit')
    this.shadowRoot.append(codeBlockEdit)
  }
}
```

`app.js`

```js
import {CodeBlockEdit} from '/code-block-edit.js'
import {AppView} from '/app-view.js'

customElements.define('code-block-edit', CodeBlockEdit)
customElements.define('app-view', AppView)

async function setup() {
  const appView = document.createElement('app-view')
  document.body.append(appView)
}

await setup()
```
