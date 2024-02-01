# List

`notebook.json`

```json
{
  "deps": [
    "codemirror-bundle.md"
  ]
}
```

`forms/button-group.js`

```js
export class ButtonGroup extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: flex;
        flex-direction: row-reverse;
        gap: 5px;
      }
      button {
        font-size: 16px;
        font-family: sans-serif;
        font-weight: normal;
        background: #111;
        color: #eee;
        margin: 0;
        border: none;
        padding: 5px 10px;
        border-radius: 3px;
      }
    `
    this.shadowRoot.appendChild(style)
  }

  addButton(text, cls, handler) {
    const el = document.createElement('button')
    el.innerText = text
    el.classList.add(cls)
    el.addEventListener('click', handler)
    this.shadowRoot.appendChild(el)
    return el
  }

  addPrimary(text, handler) {
    this.primary = this.addButton(
      text, 'primary', handler
    )
  }

  addCancel(text, handler) {
    this.cancel = this.addButton(
      text, 'cancel', handler
    )
  }
}
```

`menu/dropdown.js`

```js
export class Dropdown extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.dialogEl = document.createElement('dialog')
    this.dialogEl.addEventListener('click', e => {
      const rect = this.dialogEl.getBoundingClientRect()
      const clickedInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      )
      const isDialog = e.target === this.dialogEl
      if (isDialog && !clickedInDialog) {
        this.close()
      }
    })
    this.shadowRoot.appendChild(this.dialogEl)
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      dialog {
        min-width: 200px;
        border: 1px solid rgba(0, 0, 0, 0.3);
        border-radius: 6px;
        box-shadow: 0 3px 7px rgba(0, 0, 0, 0.3);
      }
      dialog {
        background: #222;
        color: #ddd;
        padding: 3px;
        margin-top: var(--anchor-bottom);
        margin-right: calc(
          100% - var(--anchor-right)
        );
        margin-left: auto;
        margin-bottom: auto;
        position: static;
      }
      dialog[open] {
        display: flex;
        flex-direction: column;
      }
      dialog::backdrop {
        opacity: 0;
        top: 0;
        left: 0;
        margin: 0;
        padding: 0;
        height: var(--window-height);
        height: var(--window-width);
      }
      button {
        background: #222;
        font-size: 16px;
        border: none;
        color: inherit;
        padding: 8px 10px;
        text-align: left;
      }
    `
    this.shadowRoot.append(style)
  }

  open(anchor) {
    const rect = anchor.getBoundingClientRect()
    const style = this.shadowRoot.host.style
    style.setProperty(
      '--anchor-right', `${rect.right}px`
    )
    style.setProperty(
      '--anchor-bottom',
      `${window.scrollY + rect.bottom - 3}px`
    )
    style.setProperty(
      '--window-height', `${window.height}px`
    )
    style.setProperty(
      '--window-width', `${window.width}px`
    )
    this.dialogEl.showModal()
  }

  close() {
    this.dialogEl.close()
  }

  clear() {
    this.dialogEl.replaceChildren()
  }

  add(text, handler = undefined) {
    const btn = document.createElement('button')
    btn.innerText = text
    this.dialogEl.appendChild(btn)
    btn.addEventListener('click', () => {
      this.close()
      if (handler !== undefined) {
        handler()
      }
    })
  }
}
```

`editor/code-edit.js`

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
    const cm = window.CodeMirrorBasic
    const langPlugins = []
    if (['js', 'javascript'].includes(this.fileType)) {
      langPlugins.push(cm.javascriptLanguage)
    } else if (this.fileType === 'css') {
      langPlugins.push(cm.cssLanguage)
    } else if (this.fileType === 'html') {
      langPlugins.push(cm.htmlLanguage)
    } else if (this.fileType === 'json') {
      langPlugins.push(cm.jsonLanguage)
    }
    return langPlugins
  }

  initEditor() {
    const cm = window.CodeMirrorBasic
    this.languageCompartment = new cm.Compartment()
    const langPlugins = this.langPlugins
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
      doc: this._value ?? '',
      extensions: [
        ...basicSetup,
        this.languageCompartment.of(langPlugins),
        cm.EditorView.updateListener.of(e => {
          this.dispatchEvent(new CustomEvent(
            'code-input', {bubbles: true, composed: true}
          ))
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
      background-color: #fff;
    }
    :host > * {
      flex-grow: 1;
    }
  `
}
```

`editor/file-group.js`

```js
export class FileGroup extends HTMLElement {
  textEn = {}

  textEs = {}

  constructor() {
    super()
    this.fileCount = {value: 0}
    this.language = navigator.language
    this.attachShadow({mode: 'open'})
    this.headerEl = document.createElement('div')
    this.headerEl.classList.add('header')
    this.contentEl = document.createElement('div')
    this.contentEl.classList.add('content')
    this.shadowRoot.appendChild(this.headerEl)
    this.shadowRoot.appendChild(this.contentEl)
    const bGroup = document.createElement(
      'm-forms-button-group'
    )
    this.shadowRoot.appendChild(bGroup)
    this.contentEl.addEventListener(
      'click-add-above',
      e => {
        const el = document.createElement(
          'm-editor-file-view'
        )
        el.fileCount = this.fileCount
        el.codeMirror = this.codeMirror
        e.target.insertAdjacentElement(
          'beforebegin', el
        )
        this.fileCount.value += 1
      },
    )
    this.contentEl.addEventListener(
      'click-add-below',
      e => {
        const el = document.createElement(
          'm-editor-file-view'
        )
        el.fileCount = this.fileCount
        el.codeMirror = this.codeMirror
        e.target.insertAdjacentElement(
          'afterend', el
        )
        this.fileCount.value += 1
      },
    )
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: flex;
        flex-direction: column;
        align-items: stretch;
      }
      div.header {
        display: flex;
        flex-direction: row;
      }
      div.files {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        overflow-y: auto;
      }
    `
    this.shadowRoot.appendChild(style)
    if (this.contentEl.childNodes.length === 0) {
      this.addFile()
    }
  }

  addFile({name, data, collapsed} = {}) {
    const el = document.createElement('m-editor-file-view')
    el.fileCount = this.fileCount
    el.codeMirror = this.codeMirror
    if (name !== undefined) {
      el.name = name
    }
    if (data !== undefined) {
      el.data = data
    }
    if (collapsed !== undefined) {
      el.collapsed = collapsed
    }
    this.contentEl.appendChild(el)
    this.fileCount.value += 1
    return el
  }

  get language() {
    return this._language
  }

  set language(language) {
    this._language = language
    this.text = this.langEs ? this.textEs : this.textEn
  }

  get langEs() {
    return /^es\b/.test(this.language)
  }

  get files() {
    return [...this.contentEl.children]
  }
}
```

`editor/file-view.js`

```js
export class FileView extends HTMLElement {
  icons = {
    menu: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-three-dots" viewBox="0 0 16 16">
        <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
      </svg>
    `,
    down: `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-down-fill" viewBox="0 0 16 16">
        <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
      </svg>
    `,
    up: `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-up-fill" viewBox="0 0 16 16">
        <path d="m7.247 4.86-4.796 5.481c-.566.647-.106 1.659.753 1.659h9.592a1 1 0 0 0 .753-1.659l-4.796-5.48a1 1 0 0 0-1.506 0z"/>
      </svg>
    `,
  }

  textEn = {
    addAbove: 'Add above',
    addBelow: 'Add below',
    delete: 'Delete',
  }

  textEs = {
    addAbove: 'Añadir arriba',
    addBelow: 'Añadir abajo',
    delete: 'Borrar',
  }

  constructor() {
    super()
    this.language = navigator.language
    this.attachShadow({mode: 'open'})
    this.headerEl = document.createElement('div')
    this.headerEl.classList.add('header')
    this.contentEl = document.createElement('div')
    this.contentEl.classList.add('content')
    this.shadowRoot.appendChild(this.headerEl)
    this.shadowRoot.appendChild(this.contentEl)
    this.nameEl = document.createElement('input')
    this.nameEl.classList.add('name')
    this.nameEl.setAttribute('spellcheck', 'false')
    this.nameEl.addEventListener('input', e => {
      this.setFileType(e.target.value)
    })
    this.headerEl.appendChild(this.nameEl)
    this.collapseBtn = document.createElement(
      'button'
    )
    this.collapseBtn.innerHTML = this.icons.up
    this.collapseBtn.addEventListener('click', () => {
      this.collapsed = !this.collapsed
    })
    this.headerEl.appendChild(this.collapseBtn)
    this.menuBtn = document.createElement('button')
    this.menuBtn.innerHTML = this.icons.menu
    this.menuBtn.addEventListener('click', () => {
      this.openMenu()
    })
    this.headerEl.appendChild(this.menuBtn)
    this.menu = document.createElement(
      'm-menu-dropdown'
    )
    this.shadowRoot.appendChild(this.menu)
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: flex;
        flex-direction: column;
        align-items: stretch;
      }
      div.header {
        display: flex;
        flex-direction: row;
        align-items: stretch;
        background-color: #f2dbd8;
        color: #000;
        padding: 3px 0;
      }
      div.header > * {
        background: inherit;
        color: inherit;
        border: none;
      }
      .name {
        flex-grow: 1;
        padding: 0 5px;
        font: inherit;
        font-family: monospace;
        outline: none;
      }
      div.header button svg {
        margin-bottom: -3px;
      }
      div.content {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        min-height: 5px;
      }
      div.content.collapsed > * {
        display: none;
      }
      svg {
        height: 20px;
        width: 20px;
      }
    `
    this.shadowRoot.appendChild(style)
  }

  openMenu() {
    this.menu.clear()
    this.menu.add(this.text.addAbove, () => {
      this.dispatchEvent(new CustomEvent(
        'click-add-above', {bubbles: true}
      ))
    })
    this.menu.add(this.text.addBelow, () => {
      this.dispatchEvent(new CustomEvent(
        'click-add-below', {bubbles: true}
      ))
    })
    if (this.fileCount.value > 1) {
      this.menu.add(this.text.delete, () => {
        this.remove()
        this.fileCount.value -= 1
      })
    }
    this.menu.open(this.menuBtn)
  }

  set codeMirror(value) {
    this._codeMirror = value
    const tagName = (
      this.codeMirror ?
      'm-editor-code-edit' : 'm-editor-text-edit'
    )
    this.editEl = document.createElement(tagName)
    this.contentEl.replaceChildren(this.editEl)
  }

  get codeMirror() {
    return this._codeMirror
  }

  set name(name) {
    this.nameEl.value = name
    this.setFileType(name)
  }

  get name() {
    return this.nameEl.value
  }

  set data(data) {
    this.editEl.value = data
  }

  get data() {
    return this.editEl.value
  }

  set collapsed(value) {
    const cl = this.contentEl.classList
    if (value) {
      cl.add('collapsed')
    } else {
      cl.remove('collapsed')
    }
    this.collapseBtn.innerHTML = (
      value ?
      this.icons.down : this.icons.up
    )
  }

  get collapsed() {
    return this.contentEl.classList.contains(
      'collapsed'
    )
  }

  setFileType(value) {
    if (this.codeMirror && this.editEl) {
      let fileType
      if (value.endsWith('.js')) {
        fileType = 'js'
      } else if (value.endsWith('.html')) {
        fileType = 'html'
      } else if (value.endsWith('.css')) {
        fileType = 'css'
      } else if (value.endsWith('.json')) {
        fileType = 'json'
      }
      this.editEl.fileType = fileType
    }
  }

  get language() {
    return this._language
  }

  set language(language) {
    this._language = language
    this.text = this.langEs ? this.textEs : this.textEn
  }

  get langEs() {
    return /^es\b/.test(this.language)
  }
}
```

`editor/text-edit.js`

```js
export class TextEdit extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.stackEl = document.createElement('div')
    this.stackEl.classList.add('stack')
    this.textEl = document.createElement('textarea')
    this.textEl.classList.add('text')
    this.textEl.setAttribute('spellcheck', 'false')
    this.textEl.rows = 1
    this.stackEl.appendChild(this.textEl)
    this.shadowRoot.appendChild(this.stackEl)
    this.textEl.addEventListener('input', () => {
      this.stackEl.dataset.copy = this.textEl.value
    })
  }

  connectedCallback() {
    // https://css-tricks.com/the-cleanest-trick-for-autogrowing-textareas/
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        margin: 5px 0;
      }
      div.stack {
        display: grid;
      }
      div.stack::after {
        content: attr(data-copy) " ";
        visibility: hidden;
        overflow: hidden;
      }
      div.stack::after, div.stack > textarea {
        white-space: pre-wrap;
        border: 1px solid #888;
        padding: 3px;
        font: inherit;
        font-family: monospace;
        grid-area: 1 / 1 / 2 / 2;
        min-height: 1em;
        border-radius: 2px;
        resize: none;
      }
    `
    this.shadowRoot.appendChild(style)
  }

  set value(value) {
    this.textEl.value = value
    this.stackEl.dataset.copy = this.textEl.value
  }

  get value() {
    return this.textEl.value
  }
}
```

`app.js`

```js
import { FileGroup } from "/editor/file-group.js"
import { FileView } from "/editor/file-view.js"
import { TextEdit } from "/editor/text-edit.js"
import { CodeEdit } from "/editor/code-edit.js"
import { ButtonGroup } from "/forms/button-group.js"
import { Dropdown } from "/menu/dropdown.js"

customElements.define(
  'm-editor-file-group', FileGroup
)
customElements.define(
  'm-editor-file-view', FileView
)
customElements.define(
  'm-editor-text-edit', TextEdit
)
customElements.define(
  'm-editor-code-edit', CodeEdit
)
customElements.define(
  'm-forms-button-group', ButtonGroup
)
customElements.define(
  'm-menu-dropdown', Dropdown
)

class EditorApp extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.loaded = false
    this.el = document.createElement(
      'm-editor-file-group'
    )
    this.load()
    this.shadowRoot.addEventListener('code-input', (e) => {
      this.handleInput()
    })
    this.shadowRoot.addEventListener('input', (e) => {
      this.handleInput()
    })
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        margin: 8px;
      }
    `
    this.shadowRoot.append(style)
  }

  async load() {
    const files = [{name: 'test.js', data: "console.log('Hello, World.')"}]
    this.el.codeMirror = true
    for (const file of files) {
      this.el.addFile(file)
    }
    this.loaded = true
    this.shadowRoot.appendChild(this.el)
  }

  save(e) {
    const files = this.el.files.map(
      ({name, data, collapsed}) =>
      ({name, data, collapsed})
    )
    const data = JSON.stringify({
      type: 'm-file-group',
      files,
    })
    parent.postMessage(['save', data], '*')
  }

  handleInput(e) {
    this.lastInputEvent = e
    if (!this.inputTimeout) {
      this.save(this.lastInputEvent)
      this.lastInputEvent = undefined
      this.inputTimeout = setTimeout(() => {
        this.inputTimeout = undefined
        if (this.lastInputEvent) {
          this.handleInput(this.lastInputEvent)
        }
      }, 100)
    }
  }

  async sha(ab) {
    const hash = await crypto.subtle.digest(
      "SHA-256", ab
    )
    return 'sha256-' + btoa(
      String.fromCharCode(
        ...new Uint8Array(hash)
      )
    )
  }

  async checkIntegrity(text, integrity) {
    const ab = new TextEncoder().encode(text)
    const sha = await this.sha(ab)
    if (sha !== integrity) {
      throw new Error(
        'failed integrity check: ' +
        `${sha} !== ${integrity}`
      )
    }
    return ab
  }

  req(method, path, value = undefined) {
    return new Promise((resolve, reject) => {
      const ch = new MessageChannel()
      const port = ch.port1
      port.onmessage = e => {
        resolve(e.data)
        port.close()
      }
      window.parent.postMessage(
        (
          method === 'get' ?
          [method, path] :
          [method, path, value]
        ),
        '*',
        [ch.port2]
      )
    })
  }
}

customElements.define(
  'm-editor-app', EditorApp
)

class Setup {
  async run() {
    document.body.appendChild(
      document.createElement(
        'm-editor-app'
      )
    )
  }
}

new Setup().run()
```

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
    const {Builder} = await import(`data:text/javascript;base64,${btoa(builderSource)}`)
    const files = []
    for (const block of readBlocksWithNames(__source)) {
      if (block.name.endsWith('.js') && !['NotebookView.js', 'run.js'].includes(block.name)) {
        files.push({name: block.name, data: __source.slice(...block.contentRange)})
      }
    }
    const builder = new Builder(files)
    const {styles, scripts} = builder.build()
    for (const styleText of styles) {
      const style = document.createElement('style')
      style.textContent = styleText
      document.head.append(style)
    }
    for (const scriptText of scripts) {
      const script = document.createElement('script')
      script.type = 'module'
      script.textContent = scriptText
      document.head.append(script)
    }
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

`entry.js`

```js
function* readBlocks(input) {
  const re = /(?:^|\n)([ \t]*)(`{3,}|~{3,})([^\n]*\n)/
  let index = 0
  while (index < input.length) {
    const open = input.substring(index).match(re)
    if (!open) {
      break
    } else if (open[1].length > 0 || open[2][0] === '~') {
      throw new Error(`Invalid open fence at ${index + open.index}`)
    }
    const contentStart = index + open.index + open[0].length
    const close = input.substring(contentStart).match(
      new RegExp(`\n([ ]{0,3})${open[2]}(\`*)[ \t]*\r?(?:\n|$)`)
    )
    if (!(close && close[1] === '')) {
      throw new Error(`Missing or invalid close fence at ${index + open.index}`)
    }
    const contentRange = [contentStart, contentStart + close.index]
    const blockRange = [index + open.index, contentRange.at(-1) + close[0].length]
    yield { blockRange, contentRange, info: open[3].trim() }
    index = blockRange.at(-1)
  }
}

function* readBlocksWithNames(input) {
  for (const block of readBlocks(input)) {
    const match = input.slice(0, block.blockRange[0]).match(
      new RegExp('\\n\\s*\\n\\s*`([^`]+)`\\s*\\n\\s*$')
    )
    yield ({...block, ...(match ? {name: match[1]} : undefined)})
  }
}

async function run(src) {
  globalThis.readBlocks = readBlocks
  globalThis.readBlocksWithNames = readBlocksWithNames
  for (const block of readBlocksWithNames(src)) {
    if (['NotebookView.js', 'run.js'].includes(block.name)) {
      const blockSrc = src.slice(...block.contentRange)
      await import(`data:text/javascript;base64,${btoa(blockSrc)}`)
    }
  }
}

run(__source)
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
