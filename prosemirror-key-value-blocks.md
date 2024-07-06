# ProseMirror Key Value w/ blocks

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
import {EditorState, TextSelection, Selection, Plugin} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {undo, redo, history} from "prosemirror-history"
import {keymap} from "prosemirror-keymap"
import {baseKeymap} from "prosemirror-commands"
import {Schema, Node, Slice, Fragment} from "prosemirror-model"
import {addListNodes} from "prosemirror-schema-list"
import {exampleSetup} from "prosemirror-example-setup"

export class OutlineTextEdit extends HTMLElement {
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
