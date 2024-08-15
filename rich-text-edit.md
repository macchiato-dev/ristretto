# Rich Text Edit

`notebook.json`

```json
{
  "bundleFiles": [
    ["prosemirror-bundle.md", "prosemirror-bundle.js"]
  ]
}
```

This sets up ProseMirror.

`rich-text-edit.js`

```js
import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {Schema, DOMParser} from "prosemirror-model"
import {schema} from "prosemirror-schema-basic"
import {addListNodes} from "prosemirror-schema-list"
import {exampleSetup} from "prosemirror-example-setup"

export class RichTextEdit extends HTMLElement {
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
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(this.styleSource)
    }
    return this._styles
  }

  static get styleSource() {
    return `
      div {
        background-color: white;
      }

      .content {
        display: none;
      }

      // from https://prosemirror.net/css/editor.css
      .ProseMirror {
        position: relative;
      }

      .ProseMirror {
        word-wrap: break-word;
        white-space: pre-wrap;
        white-space: break-spaces;
        -webkit-font-variant-ligatures: none;
        font-variant-ligatures: none;
        font-feature-settings: "liga" 0; /* the above doesn't seem to work in Edge */
      }

      .ProseMirror pre {
        white-space: pre-wrap;
      }

      .ProseMirror li {
        position: relative;
      }

      .ProseMirror-hideselection *::selection { background: transparent; }
      .ProseMirror-hideselection *::-moz-selection { background: transparent; }
      .ProseMirror-hideselection { caret-color: transparent; }

      /* See https://github.com/ProseMirror/prosemirror/issues/1421#issuecomment-1759320191 */
      .ProseMirror [draggable][contenteditable=false] { user-select: text }

      .ProseMirror-selectednode {
        outline: 2px solid #8cf;
      }

      /* Make sure li selections wrap around markers */

      li.ProseMirror-selectednode {
        outline: none;
      }

      li.ProseMirror-selectednode:after {
        content: "";
        position: absolute;
        left: -32px;
        right: -2px; top: -2px; bottom: -2px;
        border: 2px solid #8cf;
        pointer-events: none;
      }

      /* Protect against generic img rules */

      img.ProseMirror-separator {
        display: inline !important;
        border: none !important;
        margin: 0 !important;
      }
      .ProseMirror-textblock-dropdown {
        min-width: 3em;
      }

      .ProseMirror-menu {
        margin: 0 -4px;
        line-height: 1;
      }

      .ProseMirror-tooltip .ProseMirror-menu {
        width: -webkit-fit-content;
        width: fit-content;
        white-space: pre;
      }

      .ProseMirror-menuitem {
        margin-right: 3px;
        display: inline-block;
      }

      .ProseMirror-menuseparator {
        border-right: 1px solid #ddd;
        margin-right: 3px;
      }

      .ProseMirror-menu-dropdown, .ProseMirror-menu-dropdown-menu {
        font-size: 90%;
        white-space: nowrap;
      }

      .ProseMirror-menu-dropdown {
        vertical-align: 1px;
        cursor: pointer;
        position: relative;
        padding-right: 15px;
      }

      .ProseMirror-menu-dropdown-wrap {
        padding: 1px 0 1px 4px;
        display: inline-block;
        position: relative;
      }

      .ProseMirror-menu-dropdown:after {
        content: "";
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-top: 4px solid currentColor;
        opacity: .6;
        position: absolute;
        right: 4px;
        top: calc(50% - 2px);
      }

      .ProseMirror-menu-dropdown-menu, .ProseMirror-menu-submenu {
        position: absolute;
        background: white;
        color: #666;
        border: 1px solid #aaa;
        padding: 2px;
      }

      .ProseMirror-menu-dropdown-menu {
        z-index: 15;
        min-width: 6em;
      }

      .ProseMirror-menu-dropdown-item {
        cursor: pointer;
        padding: 2px 8px 2px 4px;
      }

      .ProseMirror-menu-dropdown-item:hover {
        background: #f2f2f2;
      }

      .ProseMirror-menu-submenu-wrap {
        position: relative;
        margin-right: -4px;
      }

      .ProseMirror-menu-submenu-label:after {
        content: "";
        border-top: 4px solid transparent;
        border-bottom: 4px solid transparent;
        border-left: 4px solid currentColor;
        opacity: .6;
        position: absolute;
        right: 4px;
        top: calc(50% - 4px);
      }

      .ProseMirror-menu-submenu {
        display: none;
        min-width: 4em;
        left: 100%;
        top: -3px;
      }

      .ProseMirror-menu-active {
        background: #eee;
        border-radius: 4px;
      }

      .ProseMirror-menu-disabled {
        opacity: .3;
      }

      .ProseMirror-menu-submenu-wrap:hover .ProseMirror-menu-submenu, .ProseMirror-menu-submenu-wrap-active .ProseMirror-menu-submenu {
        display: block;
      }

      .ProseMirror-menubar {
        border-top-left-radius: inherit;
        border-top-right-radius: inherit;
        position: relative;
        min-height: 1em;
        color: #666;
        padding: 1px 6px;
        top: 0; left: 0; right: 0;
        border-bottom: 1px solid silver;
        background: white;
        z-index: 10;
        -moz-box-sizing: border-box;
        box-sizing: border-box;
        overflow: visible;
      }

      .ProseMirror-icon {
        display: inline-block;
        line-height: .8;
        vertical-align: -2px; /* Compensate for padding */
        padding: 2px 8px;
        cursor: pointer;
      }

      .ProseMirror-menu-disabled.ProseMirror-icon {
        cursor: default;
      }

      .ProseMirror-icon svg {
        fill: currentColor;
        height: 1em;
      }

      .ProseMirror-icon span {
        vertical-align: text-top;
      }
      .ProseMirror-gapcursor {
        display: none;
        pointer-events: none;
        position: absolute;
      }

      .ProseMirror-gapcursor:after {
        content: "";
        display: block;
        position: absolute;
        top: -2px;
        width: 20px;
        border-top: 1px solid black;
        animation: ProseMirror-cursor-blink 1.1s steps(2, start) infinite;
      }

      @keyframes ProseMirror-cursor-blink {
        to {
          visibility: hidden;
        }
      }

      .ProseMirror-focused .ProseMirror-gapcursor {
        display: block;
      }
      /* Add space around the hr to make clicking it easier */

      .ProseMirror-example-setup-style hr {
        padding: 2px 10px;
        border: none;
        margin: 1em 0;
      }

      .ProseMirror-example-setup-style hr:after {
        content: "";
        display: block;
        height: 1px;
        background-color: silver;
        line-height: 2px;
      }

      .ProseMirror ul, .ProseMirror ol {
        padding-left: 30px;
      }

      .ProseMirror blockquote {
        padding-left: 1em;
        border-left: 3px solid #eee;
        margin-left: 0; margin-right: 0;
      }

      .ProseMirror-example-setup-style img {
        cursor: default;
      }

      .ProseMirror-prompt {
        background: white;
        padding: 5px 10px 5px 15px;
        border: 1px solid silver;
        position: fixed;
        border-radius: 3px;
        z-index: 11;
        box-shadow: -.5px 2px 5px rgba(0, 0, 0, .2);
      }

      .ProseMirror-prompt h5 {
        margin: 0;
        font-weight: normal;
        font-size: 100%;
        color: #444;
      }

      .ProseMirror-prompt input[type="text"],
      .ProseMirror-prompt textarea {
        background: #eee;
        border: none;
        outline: none;
      }

      .ProseMirror-prompt input[type="text"] {
        padding: 0 4px;
      }

      .ProseMirror-prompt-close {
        position: absolute;
        left: 2px; top: 1px;
        color: #666;
        border: none; background: transparent; padding: 0;
      }

      .ProseMirror-prompt-close:after {
        content: "âœ•";
        font-size: 12px;
      }

      .ProseMirror-invalid {
        background: #ffc;
        border: 1px solid #cc7;
        border-radius: 4px;
        padding: 5px 10px;
        position: absolute;
        min-width: 10em;
      }

      .ProseMirror-prompt-buttons {
        margin-top: 5px;
        display: none;
      }
      #editor, .editor {
        background: white;
        color: black;
        background-clip: padding-box;
        border-radius: 4px;
        border: 2px solid rgba(0, 0, 0, 0.2);
        padding: 5px 0;
        margin-bottom: 23px;
      }

      .ProseMirror p:first-child,
      .ProseMirror h1:first-child,
      .ProseMirror h2:first-child,
      .ProseMirror h3:first-child,
      .ProseMirror h4:first-child,
      .ProseMirror h5:first-child,
      .ProseMirror h6:first-child {
        margin-top: 10px;
      }

      .ProseMirror {
        padding: 4px 8px 4px 14px;
        line-height: 1.2;
        outline: none;
      }

      .ProseMirror p { margin-bottom: 1em }
    `
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

    const richTextEdit = document.createElement('rich-text-edit')
    this.shadowRoot.append(richTextEdit)
  }
}
```

`app.js`

```js
import {RichTextEdit} from '/rich-text-edit.js'
import {AppView} from '/app-view.js'

customElements.define('rich-text-edit', RichTextEdit)
customElements.define('app-view', AppView)

async function setup() {
  const appView = document.createElement('app-view')
  document.body.append(appView)
}

await setup()
```