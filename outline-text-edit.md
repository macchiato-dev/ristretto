# Outline Text Edit

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
import {Schema, DOMParser} from "prosemirror-model"
import {schema} from "prosemirror-schema-basic"
import {addListNodes} from "prosemirror-schema-list"
import {exampleSetup} from "prosemirror-example-setup"

export class OutlineTextEdit extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    const editorDiv = document.createElement('div')
    const contentDiv = document.createElement('div')
    contentDiv.classList.add('content')
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
    contentDiv.append(ul)
    this.shadowRoot.append(editorDiv, contentDiv)
    // Mix the nodes from prosemirror-schema-list into the basic schema to
    // create a schema with list support.
    const mySchema = new Schema({
      nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
      marks: schema.spec.marks
    })

    this.view = new EditorView(editorDiv, {
      state: EditorState.create({
        doc: DOMParser.fromSchema(mySchema).parse(contentDiv),
        plugins: exampleSetup({schema: mySchema}),
      }),
      root: this.shadowRoot
    })
    console.log(this.view)
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        ${RichTextEdit.styleSource}
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
        strong {
          background-color: #6f6f6f;
          padding: 3px 7px;
          border-radius: 9999px;
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
