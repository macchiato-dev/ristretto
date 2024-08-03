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
    ["tabs.md", "TabItem.js"],
    ["tabs.md", "TabList.js"],
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
    this.language = navigator.language
    this.attachShadow({mode: 'open'})
    this.tabListEl = document.createElement('tab-list')
    this.tabListEl.createContentEl = tabEl => {
      const fileView = document.createElement('m-editor-file-content-view')
      fileView.tabEl = tabEl
      tabEl.addEventListener('ready-to-edit', () => {
        fileView.focus()
      })
      return fileView
    }
    this.filesEl = document.createElement('div')
    this.filesEl.classList.add('files')
    this.shadowRoot.append(this.tabListEl, this.filesEl)
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        flex-grow: 1;
        height: 100%;
      }
      tab-list {
        height: 30px;
      }
      div.files {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        height: calc(100% - 30px);
      }
      div.files m-editor-file-content-view {
        flex-grow: 1;
      }
    `
    this.shadowRoot.appendChild(style)
    if (this.filesEl.childNodes.length === 0) {
      this.addFile()
    }
  }

  addFile({name, data, collapsed} = {}) {
    const tabEl = document.createElement('tab-item')
    const contentEl = document.createElement('m-editor-file-content-view')
    tabEl.contentEl = contentEl
    if (name !== undefined) {
      tabEl.name = name
      contentEl.name = name
    }
    this.tabListEl.listEl.appendChild(tabEl)
    this.filesEl.appendChild(contentEl)
    contentEl.codeMirror = this.codeMirror
    if (data !== undefined) {
      contentEl.data = data
    }
    return tabEl
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
    return [...this.filesEl.children]
  }
}
```

`file-content-view.js`

```js
export class FileContentView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.editEl = document.createElement('m-editor-code-edit')
    this.editEl.dark = true
    this.shadowRoot.replaceChildren(this.editEl)
    this._name = ''
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: none;
      }
      :host(.selected) {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
    `
    this.shadowRoot.appendChild(style)
  }

  set data(data) {
    this.editEl.value = data
  }

  get data() {
    return this.editEl.value
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

  get name() {
    return this._name
  }

  set name(value) {
    this._name = value
    this.setFileType(value)
  }

  setFileType(value) {
    let fileType
    if (value.endsWith('.js')) {
      fileType = 'js'
    } else if (value.endsWith('.html')) {
      fileType = 'html'
    } else if (value.endsWith('.css')) {
      fileType = 'css'
    } else if (value.endsWith('.json')) {
      fileType = 'json'
    } else if (value.endsWith('.md')) {
      fileType = 'md'
    }
    this.editEl.fileType = fileType
  }

  focus() {
    this.editEl.focus()
  }
}
```

`tab-editor.js`

```js
export class TabEditor extends HTMLElement {
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
        margin: 0;
        padding: 5px;
        box-sizing: border-box;
        height: 100%;
      }
    `
    this.shadowRoot.append(style)
  }

  async load(files) {
    this.el.codeMirror = true
    for (const file of files) {
      this.el.addFile(file)
    }
    const first = this.el.tabListEl.listEl.firstElementChild
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
    this.editor.fileType = 'md'
    this.editor.lineWrapping = true
    this.editor.dark = true
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
    const downloadBtn = document.createElement('button')
    downloadBtn.innerHTML = this.icons.download
    downloadBtn.addEventListener('click', () => {
      this.onDownload()
    })
    const codeBtn = document.createElement('button')
    codeBtn.innerHTML = this.icons.code
    codeBtn.addEventListener('click', () => {
      this.onShowNotebookCode()
    })
    iconContainer.append(downloadBtn, codeBtn)
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
    download: `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
        <path fill="currentColor" d="M4 22v-2h16v2zm8-4L5 9h4V2h6v7h4z"/>
      </svg>
    `,
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
    this.notebook = this.getBlockContent('notebook.md')
    if ((this.notebook ?? true) === true) {
      const defExample = `export class Test {}`
      const runExample = `for (let i=0; i < 100; i++) {
  document.body.innerHTML += '<p style="color: green">' + String(i + 1) + '</p>'
}

${"\n".repeat(50)}

document.body.innerHTML += '<p style="margin-top: 500px; color: blue">END.</p>'`
      this.notebook = Array(5).fill(0).map((v, i) => (
        `\n\n\`${i === 4 ? `app` : `File${i + 1}`}.js\`\n\n${this.fence(i === 4 ? runExample : defExample)}`
      )).join(`\n\n`)
    }
    this.loaded = false
    this.toolbar = document.createElement('m-toolbar')
    this.toolbar.onShowNotebookCode = () => {
      this.showNotebookCode()
    }
    this.toolbar.onDownload = () => {
      this.downloadNotebookCode()
    }
    this.editor = document.createElement('m-tab-editor')
    this.viewFrameWrap = document.createElement('div')
    this.viewFrameWrap.classList.add('view-frame-wrap')
    this.viewFrame = document.createElement('iframe')
    this.viewFrame.sandbox = 'allow-scripts'
    this.viewFrame.height = 30
    this.viewFrameWrap.append(this.viewFrame)
    this.shadowRoot.append(this.toolbar, this.editor, this.viewFrameWrap)
    this.shadowRoot.addEventListener('code-input', (e) => {
      this.handleInput()
    })
    this.shadowRoot.addEventListener('input', (e) => {
      this.handleInput()
    })
  }

  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    if (![...document.adoptedStyleSheets].includes(this.constructor.globalStyles)) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, this.constructor.globalStyles]
    }
    this.editor.load(this.readNotebookFiles(this.notebook))
    this.renderView()
    addEventListener('message', e => {
      if (e.source === this.viewFrame?.contentWindow) {
        parent.postMessage(e.data, '*')
      }
    })
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
    viewFrame.height = 0
    this.viewFrameWrap.appendChild(viewFrame)
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
    const src = `
<!doctype html>
<html>
<head>
  <title>preview</title>
<script type="module">
${runEntry}
</script>
</head>
<body>
</body>
</html>
`.trim()
    this.viewFrame.src = `data:text/html;base64,${btoa(src.trim())}`
    // this.viewFrame.srcdoc = src.trim()
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

  async downloadNotebookCode() {
    const value = await this.buildNotebook(this.notebook, this.editor.el.files)
    const download = {
      name: 'notebook.md',
      data: value,
      type: 'text/markdown',
    }
    parent.postMessage(['download', download], '*')
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
        this.editor = document.createElement('m-tab-editor')
        this.shadowRoot.replaceChild(this.editor, oldEditor)
        this.editor.load(this.readNotebookFiles(this.notebook))
        this.renderView()
      }
      this.notebookCodeEl.remove()
      this.notebookCodeEl = undefined
    }
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: grid;
          grid-template-rows: 30px calc(50% - 15px) 1fr;
          grid-template-columns: 100%;
          height: 100vh;
          width: 100vw;
        }
        .view-frame-wrap {
          display: flex;
          flex-direction: column;
          align-items: stretch;
        }
        iframe {
          padding: 0;
          border: none;
          overflow: inherit;
          overflow-clip-margin: inherit;
          grid-row: 3;
          grid-column: 1;
          flex-grow: 1;
        }
        .notebook-code {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        }
      `)
    }
    return this._styles
  }

  static get globalStyles() {
    if (!this._globalStyles) {
      this._globalStyles = new CSSStyleSheet()
      this._globalStyles.replaceSync(`
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
      `)
    }
    return this._globalStyles
  }
}
```

`app.js`

```js
import { ButtonGroup } from "/forms/button-group.js"
import { Dropdown } from "/menu/dropdown.js"
import { TabList } from "/tabs/TabList.js"
import { TabItem } from "/tabs/TabItem.js"
import { CodeEdit } from "/code-edit/code-edit.js"
import { FileContentView } from "/file-content-view.js"
import { FileGroup } from "/file-group.js"
import { TabEditor } from "/tab-editor.js"
import { NotebookCode } from "/notebook-code.js"
import { Toolbar } from "/toolbar.js"
import { AppView } from "/app-view.js"

customElements.define('m-forms-button-group', ButtonGroup)
customElements.define('m-menu-dropdown', Dropdown)
customElements.define('tab-list', TabList)
customElements.define('tab-item', TabItem)
customElements.define('m-editor-code-edit', CodeEdit)
customElements.define('m-editor-file-content-view', FileContentView)
customElements.define('m-editor-file-group', FileGroup)
customElements.define('m-tab-editor', TabEditor)
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

## License

Icon svg in `icons`: [google material-design-icons, Apache 2.0](https://github.com/google/material-design-icons/blob/master/LICENSE)

Other content: [Apache 2.0](https://codeberg.org/macchiato/ristretto/src/branch/main/LICENSE)

