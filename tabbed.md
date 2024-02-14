# Tabbed

This is a tabbed notebook view. Each of the files is given a tab, which can be closed or renamed, and there is a menu to select a file to add a new tab. Tabs can also be reordered.

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
    this.headerEl.addEventListener('click-add-left', e => { this.handleAdd(e, 'left') })
    this.headerEl.addEventListener('click-add-right', e => { this.handleAdd(e, 'right') })
    this.headerEl.addEventListener('click-move-left', e => { this.handleMove(e, 'left') })
    this.headerEl.addEventListener('click-move-right', e => { this.handleMove(e, 'right') })
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
        gap: 3px;
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
    const tabEl = document.createElement('m-editor-file-tab-view')
    const contentEl = document.createElement('m-editor-file-content-view')
    tabEl.contentEl = contentEl
    tabEl.fileCount = this.fileCount
    if (name !== undefined) {
      tabEl.name = name
    }
    contentEl.codeMirror = this.codeMirror
    if (data !== undefined) {
      contentEl.data = data
    }
    this.headerEl.appendChild(tabEl)
    this.contentEl.appendChild(contentEl)
    this.fileCount.value += 1
    return tabEl
  }

  handleAdd(e, direction) {
    const tabEl = document.createElement('m-editor-file-tab-view')
    const contentEl = document.createElement('m-editor-file-content-view')
    tabEl.contentEl = contentEl
    tabEl.fileCount = this.fileCount
    contentEl.codeMirror = this.codeMirror
    const position = direction == 'left' ? 'beforebegin' : 'afterend'
    e.target.insertAdjacentElement(position, tabEl)
    e.target.contentEl.insertAdjacentElement(position, contentEl)
    this.fileCount.value += 1
    tabEl.selected = true
  }

  handleMove(e, direction) {
    const siblingEl = (
      direction == 'left' ?
      e.target.previousElementSibling :
      e.target.nextElementSibling
    )
    if (siblingEl) {
      const position = direction == 'left' ? 'beforebegin' : 'afterend'
      siblingEl.insertAdjacentElement(position, e.target)
    }
    const contentSiblingEl = (
      direction == 'left' ?
      e.target.contentEl.previousElementSibling :
      e.target.contentEl.nextElementSibling
    )
    if (contentSiblingEl) {
      const position = direction == 'left' ? 'beforebegin' : 'afterend'
      contentSiblingEl.insertAdjacentElement(position, e.target.contentEl)
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

`file-tab-view.js`

```js
export class FileTabView extends HTMLElement {
  icons = {
    menu: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-three-dots" viewBox="0 0 16 16">
        <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
      </svg>
    `,
  }

  textEn = {
    addLeft: 'Add left',
    addRight: 'Add right',
    moveLeft: 'Move left',
    moveRight: 'Move right',
    delete: 'Delete',
  }

  textEs = {
    addLeft: 'Añadir izquierda',
    addRight: 'Añadir derecha',
    moveLeft: 'Mover izquierda',
    moveRight: 'Mover derecha',
    delete: 'Borrar',
  }

  constructor() {
    super()
    this.language = navigator.language
    this.attachShadow({mode: 'open'})
    this.codeMirror = true
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
    this.addEventListener('click', () => { this.selected = true })
    this.addEventListener('focus', () => { this.selected = true })
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
        padding: 3px 0;
        border-radius: 5px;
        background-color: rgb(212,212,216);
      }
      :host(.selected) div.header {
        background-color: rgb(15,118,110);
        color: #e7e7e7;
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
    this.menu.add(this.text.addLeft, () => {
      this.dispatchEvent(new CustomEvent(
        'click-add-left', {bubbles: true}
      ))
    })
    this.menu.add(this.text.addRight, () => {
      this.dispatchEvent(new CustomEvent(
        'click-add-right', {bubbles: true}
      ))
    })
    if (this.previousElementSibling) {
      this.menu.add(this.text.moveLeft, () => {
        this.dispatchEvent(new CustomEvent(
          'click-move-left', {bubbles: true}
        ))
      })
    }
    if (this.nextElementSibling) {
      this.menu.add(this.text.moveRight, () => {
        this.dispatchEvent(new CustomEvent(
          'click-move-right', {bubbles: true}
        ))
      })
    }
    if (this.fileCount.value > 1) {
      this.menu.add(this.text.delete, () => {
        this.contentEl.remove()
        this.remove()
        this.fileCount.value -= 1
      })
    }
    this.menu.open(this.menuBtn)
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

  get selected() {
    return this.classList.contains('selected')
  }

  set selected(value) {
    if (this.selected !== value) {
      if (value) {      
        this.classList.add('selected')
      } else {
        this.classList.remove('selected')
      }
      for (const el of [...this.parentElement.children].filter(el => el !== this)) {
        el.selected = false
      }
      if (this.contentEl) {
        this.contentEl.selected = value
      }
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

`file-content-view.js`

```js
export class FileContentView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.codeMirror = true
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: none;
        flex-direction: column;
        align-items: stretch;
      }
      :host(.selected) {
        display: flex;
      }
    `
    this.shadowRoot.appendChild(style)
  }

  set codeMirror(value) {
    this._codeMirror = value
    const tagName = (
      this.codeMirror ?
      'm-editor-code-edit' : 'm-editor-text-edit'
    )
    this.editEl = document.createElement(tagName)
    this.shadowRoot.replaceChildren(this.editEl)
  }

  get codeMirror() {
    return this._codeMirror
  }

  get selected() {
    return this.classList.contains('selected')
  }

  set selected(value) {
    if (this.selected !== value) {
      if (value) {      
        this.classList.add('selected')
      } else {
        this.classList.remove('selected')
      }
    }
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
    const first = this.el.headerEl.firstElementChild
    if (first) {
      first.selected = true
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

  fence(text, info = '') {
    const matches = Array.from(text.matchAll(new RegExp('^\\s*(`+)', 'gm')))
    const maxCount = matches.map(m => m[1].length).toSorted((a, b) => a - b).at(-1) ?? 0
    const quotes = '`'.repeat(Math.max(maxCount + 1, 3))
    return `\n${quotes}${info}\n${text}\n${quotes}\n`
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
        const info = (block.info ?? '').trim().length > 0 ? block.info.trim() : undefined
        const extMatch = block.name.match(/\.([\w-]+)/)
        const ext = extMatch ? extMatch[1] : undefined
        result += `\`${block.name}\`\n` + this.fence(file.data, info ?? ext ?? '')
      } else {
        result += `\n`
      }
      position = block.blockRange[1]
    }
    result += notebook.slice(position)
    if (remaining.length > 0) {
      result = result.trimEnd()
    }
    for (const file of remaining) {
      const extMatch = (file.name ?? '').match(/\.([\w-]+)/)
      const ext = extMatch ? extMatch[1] : undefined
      result += `\n\n\`${file.name}\`\n${this.fence(file.data, ext ?? '')}`
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
import { FileTabView } from "/file-tab-view.js"
import { FileContentView } from "/file-content-view.js"
import { FileGroup } from "/file-group.js"
import { ListEditor } from "/list-editor.js"
import { NotebookCode } from "/notebook-code.js"
import { Toolbar } from "/toolbar.js"
import { AppView } from "/app-view.js"

customElements.define('m-forms-button-group', ButtonGroup)
customElements.define('m-menu-dropdown', Dropdown)
customElements.define('m-editor-text-edit', TextEdit)
customElements.define('m-editor-code-edit', CodeEdit)
customElements.define('m-editor-file-tab-view', FileTabView)
customElements.define('m-editor-file-content-view', FileContentView)
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
    .active {
      fill: rgb(15,118,110);
    }
    .inactive {
      fill: rgb(212,212,216);
    }
    .text {
      fill: #000;
      opacity: 30%;
    }
  </style>
  <rect x="5" y="5" width="35" height="12" class="active" />
  <rect x="43" y="5" width="30" height="12" class="inactive" />
  <rect x="76" y="5" width="37" height="12" class="inactive" />
  <rect x="5" y="22" width="70" height="10" class="text" />
  <rect x="20" y="37" width="59" height="10" class="text" />
  <rect x="20" y="52" width="49" height="10" class="text" />
  <rect x="20" y="67" width="89" height="10" class="text" />
  <rect x="35" y="82" width="79" height="10" class="text" />
  <rect x="20" y="97" width="5" height="10" class="text" />
  <rect x="5" y="112" width="5" height="10" class="text" />
</svg>
```
