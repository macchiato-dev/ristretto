# List

`NotebookView.js`

```js
export default class NotebookView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.shadowRoot.append()
  }

  connectedCallback() {
    const globalStyle = document.createElement('style')
    globalStyle.textContent = `
      body {
        margin: 0;
        padding: 0;
      }
      html, body {
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
      :host {
        display: flex;
        height: 100vh;
        flex-direction: column;
        align-items: stretch;
        justify-content: space-around;
        background: #fff;
        color: #000;
        overflow: auto;
      }
      .cm-editor {
        flex-grow: 1;
        height: 99vh;
        background: #fff;
        color: #000;
      }
    `
    this.shadowRoot.append(style)
    this.loadEditor()
  }

  async loadEditor() {
    const codeMirrorSource = this.getSubBlockContent('codemirror-bundle.md', 'codemirror-bundle.js')
    const builderSource = this.getSubBlockContent('loader.md', 'builder.js')
    const codeMirrorScript = document.createElement('script')
    codeMirrorScript.type = 'module'
    codeMirrorScript.textContent = codeMirrorSource
    document.head.appendChild(codeMirrorScript)
    for (let i=0; i < 50; i++) {
      const delay = i
      await new Promise(r => setTimeout(r, delay))
      if (window.CodeMirrorBasic) {
        break
      }
    }
    this.initEditor()
  }

  initEditor() {
    const cm = window.CodeMirrorBasic
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
      doc: '',
      extensions: [
        basicSetup,
        cm.javascriptLanguage
      ],
      root: this.shadowRoot,
    })
    this.shadowRoot.append(this.view.dom)
  }

  getSubBlockContent(blockName, subBlockName) {
    for (const block of readBlocksWithNames(__source)) {
      if (block.name === blockName) {
        const blockSource = __source.slice(...block.contentRange)
        for (const subBlock of readBlocksWithNames(blockSource)) {
          if (subBlock.name === subBlockName)
          return blockSource.slice(...subBlock.contentRange)
        }
      }
    }
  }
}

customElements.define('notebook-view', NotebookView)
```

`run.js`

```js
async function setup() {
  const notebookView = document.createElement('notebook-view')
  document.body.replaceChildren(notebookView)
}

await setup()
```

`thumbnail.svg`

```svg
<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <style>
    svg {
      background-color: #fff;
    }
    .color1 {
      fill: #000;
    }
    .color2 {
      fill: #000;
    }
    .color3 {
      fill: #000;
    }
  </style>

  <rect x="0" y="0" width="128" height="128" stroke="#bbb" stroke-width="5" fill="transparent" />
  <g transform="translate(17 15)">
    <rect x="10" y="15" width="75" height="20" class="color1" />
    <rect x="10" y="40" width="75" height="20" class="color2" />
    <rect x="10" y="65" width="75" height="20" class="color3" />
  </g>
</svg>
```
