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
import {EditorState} from "prosemirror-state"
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
    contentDiv.innerHTML = `<note>Pedro</note><note>Pedro</note><note>Pedro</note>`
    this.shadowRoot.append(editorDiv)

    const mySchema = new Schema({
      nodes: {
        text: {},
        note: {
          content: "text*",
          toDOM() { return ["note", 0] },
          parseDOM: [{tag: "note"}]
        },
        doc: {content: "(note)+"},
      },
    })

    const histKeymap = keymap({
      "Mod-z": undo,
      "Mod-y": redo
    })
    this.view = new EditorView(editorDiv, {
      state: EditorState.create({
        doc: DOMParser.fromSchema(mySchema).parse(contentDiv),
        plugins: [histKeymap, keymap(baseKeymap), history()],
      }),
      root: this.shadowRoot,
    })
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        * {
          color: white;
        }
        note {
          display: block;
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
