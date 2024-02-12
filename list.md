# List

This is a list of named code blocks, with customizable order. With the names as paths to files, it can represent a directory of files. It is similar to GitHub gists and GitLab snippets.

`notebook.json`

```json
{
  "bundleFiles": [
    ["codemirror-bundle.md", "codemirror-bundle.js"]
  ],
  "importFiles": [
    ["loader.md", "builder.js"],
    ["forms.md", "button-group.js"],
    ["code-edit.md", "code-edit.js"],
    ["menu.md", "dropdown.js"]
  ]
}
```

This renders a list of files. The order needs to be changeable.

`file-group.js`

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
    this.contentEl.addEventListener('click-add-above', e => { this.handleAdd(e, 'up') })
    this.contentEl.addEventListener('click-add-below', e => { this.handleAdd(e, 'down') })
    this.contentEl.addEventListener('click-move-up', e => { this.handleMove(e, 'up') })
    this.contentEl.addEventListener('click-move-down', e => { this.handleMove(e, 'down') })
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

  handleAdd(e, direction) {
    const el = document.createElement(
      'm-editor-file-view'
    )
    el.fileCount = this.fileCount
    el.codeMirror = this.codeMirror
    const position = direction == 'up' ? 'beforebegin' : 'afterend'
    e.target.insertAdjacentElement(position, el)
    this.fileCount.value += 1
  }

  handleMove(e, direction) {
    const siblingEl = direction == 'up' ? e.target.previousElementSibling : e.target.nextElementSibling
    if (siblingEl) {
      const position = direction == 'up' ? 'beforebegin' : 'afterend'
      siblingEl.insertAdjacentElement(position, e.target)
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

  get files() {
    return [...this.contentEl.children]
  }
}
```

`file-view.js`

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
    moveUp: 'Move up',
    moveDown: 'Move down',
    delete: 'Delete',
  }

  textEs = {
    addAbove: 'Añadir arriba',
    addBelow: 'Añadir abajo',
    moveUp: 'Mover arriba',
    moveDown: 'Mover abajo',
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
    if (this.previousElementSibling) {
      this.menu.add(this.text.moveUp, () => {
        this.dispatchEvent(new CustomEvent(
          'click-move-up', {bubbles: true}
        ))
      })
    }
    if (this.nextElementSibling) {
      this.menu.add(this.text.moveDown, () => {
        this.dispatchEvent(new CustomEvent(
          'click-move-down', {bubbles: true}
        ))
      })
    }
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

`text-edit.js`

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

`list-editor.js`

```js
export class ListEditor extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.loaded = false
    this.el = document.createElement(
      'm-editor-file-group'
    )
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

  async load(files) {
    this.el.codeMirror = true
    for (const file of files) {
      this.el.addFile(file)
    }
    this.loaded = true
    this.shadowRoot.appendChild(this.el)
  }
}
```

`notebook-code.js`

```js
export class NotebookCode extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    const toolbar = document.createElement('div')
    toolbar.classList.add('toolbar')
    const selectContainer = document.createElement('div')
    const iconContainer = document.createElement('div')
    const closeBtn = document.createElement(
      'button'
    )
    closeBtn.innerHTML = this.icons.close
    closeBtn.addEventListener('click', () => {
      this.onHide()
    })
    iconContainer.append(closeBtn)
    iconContainer.classList.add('icon-container')
    toolbar.append(selectContainer, iconContainer)
    const editorContainer = document.createElement('div')
    editorContainer.classList.add('editor-container')
    this.editor = document.createElement('m-editor-code-edit')
    editorContainer.append(this.editor)
    this.shadowRoot.append(toolbar, editorContainer)
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: grid;
        grid-template-rows: auto 1fr;
      }
      .toolbar {
        background: #111;
        color: #e7e7e7;
        display: grid;
        grid-template-columns: 1fr auto;
        padding: 3px;
      }
      .icon-container {
        display: flex;
      }
      .icon-container button {
        background: inherit;
        color: inherit;
        border: none;
      }
      .icon-container svg {
        height: 20px;
        width: 20px;
      }
      .editor-container {
        display: flex;
        flex-direction: column;
        align-items: flex;
        overflow-y: scroll;
      }
      .editor-container m-editor-code-edit {
        flex-grow: 1;
      }
    `
    this.shadowRoot.append(style)
  }

  set value(value) {
    this.editor.value = value
  }

  get value() {
    return this.editor.value
  }

  icons = {
    close: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/>
      </svg>
    `,
  }
}
```



`toolbar.js`

```js
export class Toolbar extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    const selectContainer = document.createElement('div')
    const iconContainer = document.createElement('div')
    const codeBtn = document.createElement(
      'button'
    )
    codeBtn.innerHTML = this.icons.code
    codeBtn.addEventListener('click', () => {
      this.onShowNotebookCode()
    })
    iconContainer.append(codeBtn)
    iconContainer.classList.add('icon-container')
    this.shadowRoot.append(selectContainer, iconContainer)
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      :host {
        background: #111;
        color: #e7e7e7;
        display: grid;
        grid-template-columns: 1fr auto;
        padding: 3px;
      }
      .icon-container {
        display: flex;
      }
      .icon-container button {
        background: inherit;
        color: inherit;
        border: none;
      }
      .icon-container svg {
        height: 20px;
        width: 20px;
      }
    `
    this.shadowRoot.append(style)
  }

  icons = {
    code: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6l6 6zm5.2 0l4.6-4.6l-4.6-4.6L16 6l6 6l-6 6z" />
      </svg>
    `,
  }
}
```

`app-view.js`

```js
import {Builder} from '/loader/builder.js'

export class AppView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.depsConfig = {bundleFiles: [], importFiles: []}
    this.notebook = this.getBlockContent('notebook.md') ?? (
      `\n\n\`app.js\`\n\n${this.fence(`document.body.innerText = 'hello'`)}`
    )
    this.loaded = false
    this.toolbar = document.createElement('m-toolbar')
    this.toolbar.onShowNotebookCode = () => {
      this.showNotebookCode()
    }
    this.editor = document.createElement('m-list-editor')
    this.viewFrame = document.createElement('iframe')
    this.viewFrame.sandbox = 'allow-scripts'
    this.shadowRoot.append(this.toolbar, this.editor, this.viewFrame)
    this.shadowRoot.addEventListener('code-input', (e) => {
      this.handleInput()
    })
    this.shadowRoot.addEventListener('input', (e) => {
      this.handleInput()
    })
  }

  connectedCallback() {
    const style = document.createElement('style')
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
    style.textContent = `
      :host {
        display: grid;
        grid-template-rows: auto 1fr 1fr;
        grid-template-columns: 1fr;
        height: 100vh;
      }
      m-list-editor {
        overflow-y: auto;
      }
      iframe {
        width: 100%;
        height: 100%;
        padding: 0;
        border: none;
      }
      .notebook-code {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
      }
    `
    this.shadowRoot.append(style)
    this.editor.load(this.readNotebookFiles(this.notebook))
    this.renderView()
  }

  readNotebookFiles(notebook) {
    const result = []
    for (const block of readBlocksWithNames(notebook)) {
      result.push({name: block.name, data: notebook.slice(...block.contentRange)})
    }
    return result
  }

  update() {
    this.renderView()
  }

  handleInput(e) {
    // TODO: use notebook.json to control frequency, automaticness, and spinner of updates
    if (!this.inputTimeout) {
      this.inputTimeout = setTimeout(() => {
        this.inputTimeout = undefined
        this.update()
      }, 1500)
    }
  }

  renderView() {
    const viewFrame = document.createElement('iframe')
    viewFrame.sandbox = 'allow-scripts'
    this.shadowRoot.appendChild(viewFrame)
    this.viewFrame.remove()
    this.viewFrame = viewFrame
    this.displayNotebook()
  }

  getBlockContent(blockName, subBlockName = undefined) {
    for (const block of readBlocksWithNames(__source)) {
      if (block.name === blockName) {
        const blockSource = __source.slice(...block.contentRange)
        if (subBlockName === undefined) {
          return blockSource
        } else {
          for (const subBlock of readBlocksWithNames(blockSource)) {
            if (subBlock.name === subBlockName)
            return blockSource.slice(...subBlock.contentRange)
          }
        }
      }
    }
  }

  async getDepsConfig(notebook) {
    const defaultDeps = {bundleFiles: [], importFiles: []}
    for (const block of readBlocksWithNames(notebook)) {
      if (block.name === 'notebook.json') {
        return {...defaultDeps, ...JSON.parse(notebook.slice(...block.contentRange))}
      }
    }
    return defaultDeps
  }

  async getDeps(notebook) {
    const newDepsConfig = await this.getDepsConfig(notebook)
    if (typeof this.deps === 'string' && JSON.stringify(newDepsConfig) === JSON.stringify(this.depsConfig ?? null)) {
      return this.deps
    } else {
      const channel = new MessageChannel()
      let loaded = false
      const remotePromise = new Promise((resolve, _) => {
        channel.port1.onmessage = (message) => {
          channel.port1.close()
          loaded = true
          resolve(message.data)
        }
        parent.postMessage(['getDeps', notebook], '*', [channel.port2])
      })
      const localPromise = new Promise((resolve, _reject) => {
        setTimeout(() => {
          if (loaded) {
            resolve(undefined)
          } else {
            const builder = new Builder({src: '', parentSrc: __source})
            const deps = builder.getDeps()
            resolve(deps)
          }
        }, 500)
      })
      const deps = await Promise.race([remotePromise, localPromise])
      this.depsConfig = newDepsConfig
      this.deps = deps
      return deps
    }
  }

  fence(text) {
    const matches = Array.from(text.matchAll(new RegExp('^\\s*(`+)', 'gm')))
    const maxCount = matches.map(m => m[1].length).toSorted((a, b) => a - b).at(-1) ?? 0
    const quotes = '`'.repeat(Math.max(maxCount + 1, 3))
    return `\n${quotes}\n${text}\n${quotes}\n`
  }

  async buildNotebook(notebook, files) {
    let result = ''
    let position = 0
    const remaining = [...files]
    for (const block of readBlocksWithNames(notebook)) {
      result += notebook.slice(position, block.blockRange[0])
      const index = remaining.findIndex(({name}) => name === block.name)
      const file = remaining[index]
      if (file) {
        remaining.splice(index, 1)
        result += `\`${block.name}\`\n` + this.fence(file.data)
      } else {
        result += `\n`
      }
      position = block.blockRange[1]
    }
    result += notebook.slice(position)
    for (const file of remaining) {
      const fence = `\`\`\``
      result += `\n\n\`${file.name}\`\n\n${this.fence(file.data)}`
    }
    return result
  }

  async displayNotebook() {
    const dataSrc = ''
    const notebookContent = await this.buildNotebook(this.notebook, this.editor.el.files)
    const deps = await this.getDeps(notebookContent)
    const notebookSrc = `
**deps**

${deps}

---

**notebook**

${notebookContent}
`
    const re = /(?:^|\n)\s*\n`entry.js`\n\s*\n```.*?\n(.*?)```\s*(?:\n|$)/s
    const runEntry = `
const re = new RegExp(${JSON.stringify(re.source)}, ${JSON.stringify(re.flags)})
addEventListener('message', async e => {
  if (e.data[0] === 'notebook') {
    globalThis.__source = new TextDecoder().decode(e.data[1])
    const entrySrc = globalThis.__source.match(re)[1]
    await import(\`data:text/javascript;base64,\${btoa(entrySrc)}\`)
  }
}, {once: true})
    `.trim()
    this.viewFrame.srcdoc = `
<!doctype html>
<html>
<head>
  <title></title>
<script type="module">
${runEntry}
</script>
</head>
<body>
</body>
</html>
`.trim()
    this.viewFrame.addEventListener('load', () => {
      const messageText = `\n\n${notebookSrc}\n\n`
      const messageData = new TextEncoder().encode(messageText)
      this.viewFrame.contentWindow.postMessage(
        ['notebook', messageData],
        '*',
        [messageData.buffer]
      )
    }, {once: true})
  }

  async showNotebookCode() {
    const value = await this.buildNotebook(this.notebook, this.editor.el.files)
    if (!this.notebookCodeEl) {
      this.notebookCodeEl = document.createElement('m-notebook-code')
      this.notebookCodeEl.classList.add('notebook-code')
      this.notebookCodeEl.initialValue = value
      this.notebookCodeEl.value = value
      this.notebookCodeEl.onHide = () => {
        this.hideNotebookCode()
      }
      this.shadowRoot.append(this.notebookCodeEl)
    }
  }

  async hideNotebookCode() {
    if (this.notebookCodeEl) {
      if (this.notebookCodeEl.value.trim() !== this.notebookCodeEl.initialValue.trim()) {
        const oldEditor = this.editor
        this.notebook = this.notebookCodeEl.value
        this.editor = document.createElement('m-list-editor')
        this.shadowRoot.replaceChild(this.editor, oldEditor)
        this.editor.load(this.readNotebookFiles(this.notebook))
        this.renderView()
      }
      this.notebookCodeEl.remove()
      this.notebookCodeEl = undefined
    }
  }
}
```

`app.js`

```js
import { ButtonGroup } from "/forms/button-group.js"
import { Dropdown } from "/menu/dropdown.js"
import { TextEdit } from "/text-edit.js"
import { CodeEdit } from "/code-edit/code-edit.js"
import { FileView } from "/file-view.js"
import { FileGroup } from "/file-group.js"
import { ListEditor } from "/list-editor.js"
import { NotebookCode } from "/notebook-code.js"
import { Toolbar } from "/toolbar.js"
import { AppView } from "/app-view.js"

customElements.define('m-forms-button-group', ButtonGroup)
customElements.define('m-menu-dropdown', Dropdown)
customElements.define('m-editor-text-edit', TextEdit)
customElements.define('m-editor-code-edit', CodeEdit)
customElements.define('m-editor-file-view', FileView)
customElements.define('m-editor-file-group', FileGroup)
customElements.define('m-list-editor', ListEditor)
customElements.define('m-notebook-code', NotebookCode)
customElements.define('m-toolbar', Toolbar)
customElements.define('m-app-view', AppView)

class App {
  async run() {
    document.body.appendChild(
      document.createElement(
        'm-app-view'
      )
    )
  }
}

new App().run()
```

`thumbnail.svg`

```svg
<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <style>
    svg {
      background-color: #eee;
    }
    .color1 {
      fill: #f2dbd8;
    }
    .color2 {
      fill: #466d1d;
    }
    .text {
      fill: #000;
      opacity: 30%;
    }
  </style>
  <rect x="0" y="0" width="128" height="18" class="color1" />
  <rect x="5" y="4" width="45" height="10" class="text" />
  <rect x="5" y="22" width="70" height="10" class="text" />
  <rect x="20" y="37" width="89" height="10" class="text" />
  <rect x="5" y="52" width="5" height="10" class="text" />
  <g transform="translate(0 67)">
    <rect x="0" y="0" width="128" height="18" class="color1" />
    <rect x="5" y="4" width="45" height="10" class="text" />
    <rect x="5" y="22" width="40" height="10" class="text" />
    <rect x="20" y="37" width="40" height="10" class="text" />
    <rect x="20" y="52" width="50" height="10" class="text" />
  </g>
</svg>
```
