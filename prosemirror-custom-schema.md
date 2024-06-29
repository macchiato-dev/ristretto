# ProseMirror Custom Schema

`notebook.json`

```json
{
  "bundleFiles": [
    ["prosemirror-bundle.md", "prosemirror-bundle.js"]
  ],
  "importFiles": [
    ["rich-text-edit.md", "rich-text-edit.js"]
  ]
}
```

`outline-text-edit.js`

```js
import {RichTextEdit} from "/rich-text-edit/rich-text-edit.js"
import {EditorState, TextSelection, Selection} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {undo, redo, history} from "prosemirror-history"
import {keymap} from "prosemirror-keymap"
import {baseKeymap} from "prosemirror-commands"
import {Schema, DOMParser} from "prosemirror-model"
import {addListNodes} from "prosemirror-schema-list"
import {exampleSetup} from "prosemirror-example-setup"

export class OutlineTextEdit extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    const editorDiv = document.createElement('div')
    const contentDiv = document.createElement('div')
    contentDiv.innerHTML = `<obj-pair><obj-key>Pedro</obj-key><obj-sep>:</obj-sep><str-val>Pedro</str-val></obj-pair><obj-pair><obj-key>Pedro</obj-key><obj-sep>:</obj-sep><obj-val>Pedro</obj-val></obj-pair>`
    this.shadowRoot.append(editorDiv)

    const dataSchema = new Schema({
      nodes: {
        text: {},
        objKey: {
          content: "text*",
          toDOM() { return ["obj-key", 0] },
          parseDOM: [{tag: "obj-key"}],
        },
        objSep: {
          content: "text*",
          toDOM() { return ["obj-sep", 0] },
          parseDOM: [{tag: "obj-sep"}],
        },
        objVal: {
          content: "text*",
          toDOM() { return ["obj-val", 0] },
          parseDOM: [{tag: "obj-val"}],
        },
        objPair: {
          content: "objKey objSep objVal",
          toDOM() { return ["obj-pair", 0] },
          parseDOM: [{tag: "obj-pair"}]
        },
        doc: {content: "(objPair)+"},
      },
    })
    const dataKeymap = keymap({
      "Backspace": (state, dispatch, view) => {
        const {$from} = state.selection
        console.log($from.parent, $from.parentOffset)
        if ($from.parent.type.name === 'objVal' && $from.parentOffset === 1) {
          console.log($from)
          dispatch(
            state.tr
            .delete($from.pos - 1, $from.pos)
            .setSelection(TextSelection.create(state.doc, 1))
          )
          return true
        }
      }
    })

    const histKeymap = keymap({
      "Mod-z": undo,
      "Mod-y": redo,
    })
    this.view = new EditorView(editorDiv, {
      state: EditorState.create({
        doc: DOMParser.fromSchema(dataSchema).parse(contentDiv),
        plugins: [dataKeymap, histKeymap, history()],
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
        ul {
          list-style-type: none;
        }
        div {
          background: #14191e;
          color: #eee;
          font-family: -apple-system, BlinkMacSystemFont, Avenir Next, Avenir, Helvetica, sans-serif;
          font-size: 16px;
        }
        .ProseMirror-menubar { display: none; }
        obj-pair {
          display: block;
        }
        obj-sep {
          opacity: 0;
        }
        obj-key {
          background-color: #6f6f6f;
          padding: 3px 7px;
          border-radius: 9999px;
        }
        obj-val {
        }
        obj-pair {
          display: block;
          padding: 5px;
        }
      `)
    }
    return this._styles
  }

  get exampleContent() {
    const ul = document.createElement('ul')
    const li = document.createElement('li')
    const root = document.createElement('b')
    root.innerText = 'root'
    const nested = document.createElement('ul')
    nested.append(...([
      ['$schema', 'https://vega.github.io/schema/vega/v5.json'],
      ['description', 'A basic stacked area chart example.'],
      ['width', '500'],
      ['height', '200'],
    ]).map(item => {
      const li = document.createElement('li')
      const b = document.createElement('b')
      b.innerText = item[0]
      li.append(b, ' ' + item[1])
      return li
    }))
    li.append(root, nested)
    ul.append(li)
    return ul
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

    const richTextEdit = document.createElement('outline-text-edit')
    this.shadowRoot.append(richTextEdit)
  }
}
```

`app.js`

```js
import {OutlineTextEdit} from '/outline-text-edit.js'
import {AppView} from '/app-view.js'

customElements.define('outline-text-edit', OutlineTextEdit)
customElements.define('app-view', AppView)

async function setup() {
  const appView = document.createElement('app-view')
  document.body.append(appView)
}

await setup()
```
