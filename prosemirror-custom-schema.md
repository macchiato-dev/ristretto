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
        this.buildPair('', ''),
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
          defining: true,
          isolating: true,
          whitespace: 'pre',
        },
        objVal: {
          content: "text*",
          toDOM() { return ["obj-val", 0] },
          parseDOM: [{tag: "obj-val"}],
          defining: true,
          whitespace: 'pre',
        },
        objPair: {
          content: "objKey objVal",
          toDOM() { return ["obj-pair", 0] },
          parseDOM: [{tag: "obj-pair"}],
          atom: true,
          selectable: false,
        },
        doc: {content: "(objPair)+"},
      },
      marks: {
        placeholder: {
          toDOM() { return ['span', {class: 'placeholder'}, 0] },
          parseDOM: [{tag: 'span.placeholder'}],
        },
      }
    })
    const dataKeymap = keymap({
      "Backspace": (state, dispatch, view) => {
        const {$from} = state.selection
        const textToDelete = state.doc.textBetween($from.pos - 1, $from.pos)
        const fullText = state.doc.textBetween(
          $from.posAtIndex($from.index(1), 1),
          $from.posAtIndex($from.indexAfter(1), 1)
        )
        if (fullText === ' ') {
          const tr = state.tr
          tr.delete(
            $from.posAtIndex($from.index(1), 1) - 2,
            $from.posAtIndex($from.indexAfter(1), 1) + 2
          )
          dispatch(tr)
          return true
        } else if ($from.pos !== state.selection.$to.pos) {
          return true
        } else if ($from.parent.type.name === 'objVal' && $from.parentOffset === 1) {
          // TODO: if both key and value are empty, delete the entire node
          return true
        } else if ($from.parent.type.name === 'objKey' && $from.parentOffset === 1) {
          const tr = state.tr
          tr.replaceWith(
            $from.pos - 1,
            $from.pos,
            state.schema.text(' ', [state.schema.mark('placeholder')])
          )
          dispatch(tr)
          return true
        }
      },
      "Enter": (state, dispatch, view) => {
        const from = state.selection.$from
        const rowStart = from.posAtIndex(from.index(1), 1)
        const rowEnd = from.posAtIndex(from.indexAfter(1), 1)
        if (from.pos - 1 === rowStart) {
          const tr = state.tr
          const newNode = Node.fromJSON(dataSchema, this.buildPair('', ''))
          tr.insert(rowStart - 1, newNode)
          dispatch(tr)
          return true
        } else if (from.pos + 1 === rowEnd) {
          const tr = state.tr
          const newNode = Node.fromJSON(dataSchema, this.buildPair('', ''))
          tr.insert(rowEnd + 1, newNode)
          dispatch(tr)
          return true
        }
      }
    })

    const histKeymap = keymap({
      "Mod-z": undo,
      "Mod-y": redo,
    })
    const dataPlugin = new Plugin({
      appendTransaction(transactions, oldState, newState) {
        console.log(this)
        console.log(oldState.doc.toJSON())
        for (const transaction of transactions) {
          for (const step of transaction.steps) {
            const stepText = step.slice?.content?.content?.[0]?.text
            if ((stepText !== ' ')) {
              for (const [start, end] of [[step.from - 1, step.from], [step.from, step.from + 1]]) {
                const text = newState.doc.textBetween(start, end)
                if (text === ' ') {
                  if (newState.doc.resolve(start).marks().some(mark => mark.type.name === 'placeholder')) {
                    const tr = newState.tr
                    tr.removeMark(start - 2, end + 2, newState.schema.marks.placeholder)
                    tr.delete(start, end)
                    tr.removeStoredMark(newState.schema.marks.placeholder)
                    return tr
                  }
                }
              }
            }
          }
        }
      },
    })
    this.view = new EditorView(editorDiv, {
      state: EditorState.create({
        doc: Node.fromJSON(dataSchema, content),
        plugins: [dataKeymap, dataPlugin, histKeymap, history()],
      }),
      root: this.shadowRoot,
    })
  }

  buildPair(key, value) {
    const keyContent = key === '' ? [{
      type: 'text',
      marks: [{type: 'placeholder'}],
      text: ' '
    }] : [{ type: 'text', text: key }]
    return {
      type: 'objPair',
      content: [
        {
          type: 'objKey',
          content: keyContent,
        },
        {
          type: 'objVal',
          content: [ { type: 'text', text: ` ${value}` } ],
        },
      ],
    }
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
        obj-place {
          display: inline;
        }
        obj-key {
          background-color: #6f6f6f;
          padding: 3px 7px;
          border-radius: 9999px;
          margin-right: 5px;
          display: inline;
        }
        obj-val {
          display: inline;
        }
        obj-pair {
          display: block;
          padding: 5px;
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
