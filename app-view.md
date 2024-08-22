# App View

This is the main view of the app. It has a sidebar and a content view. Within the sidebar there is a list of files and an explore view.

TODO:

- [x] Add list of tabs
- [x] Style tabs
- [x] Allow italic preview tabs (in tabs-new)
- [ ] Open document clicked in sidebar in preview tab
- [ ] Add two initial tabs with content and make it switch between content
- [ ] Upon clicking a preview tab, make tab non-preview
- [ ] Upon editing a preview tab, make tab non-preview
- [ ] Make it pull deps content from content in tabs, controlled by option in notebook.json
- [ ] Make tab content show in sidebar
- [ ] Make content in sidebar be deletable
- [ ] Make it store edited content in session (set up postmessage in host)
- [ ] Make sidebar collapsible
- [ ] Make sidebar responsive
- [ ] Make notebook-view responsive

`notebook.json`

```json
{
  "importFiles": [
    ["notebook-view.md", "MarkdownCodeBlock.js"],
    ["notebook-view.md", "MarkdownView.js"],
    ["loader.md", "builder.js"],
    ["file-cards.md", "FileCard.js"],
    ["file-cards.md", "FileCardList.js"],
    ["split-pane.md", "split-view.js"],
    ["file-tree.md", "file-tree.js"],
    ["tabs-new.md", "TabList.js"],
    ["tabs-new.md", "TabItem.js"]
  ],
  "includeFiles": [
    "app-view.md",
    "_welcome.md",
    "intro.md",
    "app-content.md",
    "planets.csv.md",
    "table.md",
    "editable-data-table.md",
    "data-cards.md",
    "notebook-view.md",
    "code-edit-new.md",
    "tabs-new.md",
    "codemirror-bundle.md",
    "font.woff2.md"
  ]
}
```

This displays a document. There is one per tab. It renders a document in a sandboxed iframe.

`DocView.js`

```js
export class DocView extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    addEventListener('message', async e => {
      const {Builder} = this.constructor
      if (e.source === this.viewFrame?.contentWindow) {
        const [cmd, ...args] = e.data
        const port = e.ports[0]
        if (cmd === 'getDeps') {
          const [notebookSrc] = args
          const builder = new Builder({src: notebookSrc, parentSrc: __source})
          const deps = builder.getDeps()
          port.postMessage(deps)
        } else if (['download', 'link'].includes(cmd)) {
          parent.postMessage(e.data, '*')
        }
      }
    })
    if (this.notebookFile !== undefined && this.dataFile !== undefined) {
      this.displayNotebook()
    }
  }

  fence(text, info = '') {
    const matches = Array.from(text.matchAll(new RegExp('^\\s*(`+)', 'gm')))
    const maxCount = matches.map(m => m[1].length).toSorted((a, b) => a - b).at(-1) ?? 0
    const quotes = '`'.repeat(Math.max(maxCount + 1, 3))
    return `\n${quotes}${info}\n${text}\n${quotes}\n`
  }

  displayNotebook() {
    const {Builder} = this.constructor
    this.viewFrame = document.createElement('iframe')
    this.viewFrame.sandbox = 'allow-scripts'
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
  <title>doc</title>
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
      const src = __source
      let dataSrc = '', notebookSrc = ''
      for (const block of readBlocksWithNames(src)) {
        if (block.name === this.notebookFile) {
          const blockSrc = src.slice(...block.contentRange)
          notebookSrc = blockSrc
        }
      }
      const builder = new Builder({src: notebookSrc, parentSrc: src})
      const depsSrc = builder.getDeps()
      for (const block of readBlocksWithNames(src)) {
        if (block.name === this.dataFile) {
          if (this.mode === 'explore') {
            dataSrc += `\n\n\`${block.name}\`\n\n` +
              src.slice(...block.contentRange)
          } else {
            dataSrc += `\n\n\`notebook.md\`\n\n` +
              this.fence(src.slice(...block.contentRange), 'md')
          }
        }
      }
      const messageText = `**begin deps**\n\n${depsSrc}\n\n---\n\n` +
        `**begin data**\n\n${dataSrc}\n\n---\n\n**notebook**\n\n${notebookSrc}\n\n`
      const messageData = new TextEncoder().encode(messageText)
      this.viewFrame.contentWindow.postMessage(
        ['notebook', messageData],
        '*',
        [messageData.buffer]
      )
    })
    this.shadowRoot.replaceChildren(this.viewFrame)
  }

  get mode() {
    return this._mode
  }

  set mode(value) {
    this._mode = value
    if (this.shadowRoot) {
      this.displayNotebook()
    }
  }

  get notebookFile() {
    return this._notebookFile
  }

  set notebookFile(value) {
    this._notebookFile = value
    if (this.shadowRoot) {
      this.displayNotebook()
    }
  }

  get dataFile() {
    return this._dataFile
  }

  set dataFile(value) {
    this._dataFile = value
    if (this.shadowRoot) {
      this.displayNotebook()
    }
  }

  static init({Builder}) {
    this.Builder = Builder
    return this
  }

  static get styles() {
    let s; return s ?? (
      v => { s = new CSSStyleSheet(); s.replaceSync(v); return s }
    )(this.stylesCss)
  }

  static stylesCss = `
    iframe {
      background-color: #2b172a;
      width: 100%;
      height: 100%;
      border: none;
    }
  `
}
```

This is the explore view. It has some example documents in different formats, and notebooks that can do something with each document.

`ExploreView.js`

```js
export class ExploreView extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
  }

  init() {
    this.notebookTemplates = {
      'intro.md': [
        'app-content.md',
      ],
      'example-notebook.md': [
        'tabbed.md',
        'list.md',
        'notebook-view.md',
        // 'overlay.md',  # TODO
      ],
      'planets.csv': [
        'table.md',
        'data-cards.md',
        'editable-data-table.md',
      ],
      'colors.json': [
        'palette.md',
        'shapes.md',
      ],
      'image.png': [
        'image-filters.md',
        'histogram.md',
      ],
      'font.woff2': [
        'heading.md',
      ],
      'wiki-response.json': [
        'json-tree.md',
      ],
      'files.json': [
        'file-tree.md',
        'json-tree.md',
      ],
    }
    this.dataTemplates = Object.keys(this.notebookTemplates)
    this.dataSelect = document.createElement('file-card-list')
    this.dataSelect.name = 'Data'
    this.dataSelect.items = this.dataTemplates.map((template, i) => {
      const el = document.createElement('file-card')
      el.name = template
      if (i === 0) {
        el.setAttribute('selected', true)
      }
      return el
    })
    this.dataSelect.addEventListener('select-item', e => {
      this.updateNotebookItems()
      this.dispatchEvent(new CustomEvent('selectNotebook'))
    })
    this.initImages(this.dataSelect.items)
    this.notebookSelect = document.createElement('file-card-list')
    this.notebookSelect.name = 'Notebook'
    this.updateNotebookItems()
    this.notebookSelect.addEventListener('select-item', e => {
      this.dispatchEvent(new CustomEvent('selectNotebook'))
    })
    this.shadowRoot.append(this.dataSelect, this.notebookSelect)
  }

  initImages(items) {
    const src = __source
    const itemsByFile = Object.fromEntries(
      [...items].map(item => {
        return [item.filename, item]
      })
    )
    for (const block of readBlocksWithNames(src)) {
      const item = itemsByFile[block.name]
      if (item !== undefined) {
        const blockSrc = src.slice(...block.contentRange)
        let thumbnail
        for (const subBlock of readBlocksWithNames(blockSrc)) {
          if (
            thumbnail === undefined && (subBlock.name || '').match(/\.(png|jpe?g|svg|webm)/) ||
            subBlock.name?.startsWith?.('thumbnail.')
          ) {
            thumbnail = subBlock
          }
        }
        if (thumbnail !== undefined) {
          const data = blockSrc.slice(...thumbnail.contentRange).replaceAll(
            new RegExp(`\\$\\{image\\('([^']+)'\\)\\}`, 'g'),
            (_, m) => {
              const img = this.findImage(m)
              return img ? this.dataUrl(...img) : m
            }
          )
          item.image = this.dataUrl(thumbnail.name, data)
        }
      }
    }
  }

  findImage(path) {
    const parts = path.split('/')
    for (const block of readBlocksWithNames(__source)) {
      if (parts.at(0) === block.name) {
        const blockSrc = __source.slice(...block.contentRange)
        for (const innerBlock of readBlocksWithNames(blockSrc)) {
          if (parts.at(1) === innerBlock.name) {
            return [innerBlock.name, blockSrc.slice(...innerBlock.contentRange)]
          }
        }
      }
    }
  }

  updateNotebookItems() {
    this.notebookSelect.items = this.notebookTemplates[
      this.dataSelect.selectedItem.name
    ].map((template, i) => {
      const el = document.createElement('file-card')
      el.name = template
      if (i === 0) {
        el.setAttribute('selected', true)
      }
      return el
    })
    this.initImages(this.notebookSelect.items)
  }

  dataUrl(name, data) {
    const ext = name.match(/\.(\w+)$/).at(1) ?? 'png'
    const mime = 'image/' + ({svg: 'svg+xml', jpg: 'jpeg'}[ext] ?? ext)
    const urlData = ext === 'svg' ? btoa(data) : data.replaceAll(/\s+/g, '')
    return `data:${mime};base64,${urlData}`
  }

  static get styles() {
    let s; return s ?? (
      v => { s = new CSSStyleSheet(); s.replaceSync(v); return s }
    )(this.stylesCss)
  }

  static stylesCss = `
    
  `
}
```

The AppView has the layout and manages the state of the app.

`AppView.js`

```js
export class AppView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.mode = 'files'
    this.selectTabs = document.createElement('div')
    this.selectTabs.append(...['Files', 'Explore'].map(name => {
      const el = document.createElement('a')
      el.innerText = name
      if (name === 'Files') {
        el.classList.add('active')
      }
      el.addEventListener('click', () => {
        this.switchTab(name, el)
      })
      return el
    }))
    this.selectTabs.classList.add('select-tabs')
    this.selectPane = document.createElement('div')
    this.selectPane.append(this.selectTabs)
    this.selectPane.classList.add('select')
    this.selectPane.setAttribute('draggable', 'false')
    this.previewDocView = document.createElement('doc-view')
    this.previewDocView.classList.add('preview')
    this.previewDocView.mode = this.mode
    this.previewDocView.notebookFile = 'notebook-view.md'
    this.previewDocView.dataFile = '_welcome.md'
    this.tabList = document.createElement('tab-list')
    this.tabList.tabs = ['New Tab', '_welcome.md'].map(name => {
      const el = document.createElement('tab-item')
      el.name = name
      if (el.name === '_welcome.md') {
        el.preview = true
      }
      return el
    })
    this.tabList.tabs[0].selected = true
    this.tabList.tabs[1].docView = this.previewDocView
    this.contentPane = document.createElement('div')
    this.contentPane.append(this.tabList, this.previewDocView)
    this.contentPane.classList.add('content-pane')
    this.contentPane.setAttribute('draggable', 'false')
    this.split = document.createElement('split-view')
    this.split.addEventListener('split-view-resize', e => {
      const x = e.detail.offsetX - this.offsetLeft
      this.style.setProperty(
        `--${this.classList.contains('explore') ? 'explore-' : ''}sidebar-width`,
        `${x}px`
      )
    })
    this.split.setAttribute('draggable', 'false')
    this.shadowRoot.append(this.selectPane, this.split, this.contentPane)
    this.switchTab('Files', this.selectTabs.children[0])
  }

  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    if (![...document.adoptedStyleSheets].includes(this.constructor.globalStyles)) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, this.constructor.globalStyles]
    }
  }

  get selectedNotebook() {
    return this.notebookSelect
  }

  get systemFiles() {
    const result = {}
    for (const block of readBlocksWithNames(__source)) {
      if (block.name.endsWith('.md')) {
        const parts = block.name.split('/')
        const dirs = parts.slice(0, -1)
        const file = parts.at(-1)
        let parent = result
        for (const dir of dirs) {
          if (!(dir in parent)) {
            parent[dir] = {}
          }
          parent = parent[dir]
        }
        parent[file] = true
      }
    }
    function sortNested(result) {
      return Object.fromEntries(Object.entries(result).map(([k, v]) => (
        [k, (typeof v === 'object' && v !== null && !Array.isArray(v)) ? sortNested(v) : v]
      )).toSorted((a, b) => a[0].localeCompare(b[0])))
    }
    return sortNested(result)
  }

  get mode() {
    return this._mode
  }

  set mode(value) {
    this._mode = value
  }

  async switchTab(name, el) {
    for (const child of el.parentElement.children) {
      child.classList.remove('active')
    }
    this.classList.toggle('explore', name === 'Explore')
    if (name === 'Files' && !this.filesView) {
      await this.initFiles()
    } else if (name === 'Explore' && !this.exploreView) {
      this.exploreView = document.createElement('explore-view')
      this.exploreView.addEventListener('selectNotebook', () => {
        this.displayPreview()
      })
      this.selectPane.append(this.exploreView)
      await this.exploreView.init()
      this.exploreView.classList.add('tab-content')
    }
    for (const [tabName, el] of [
      ['Files', this.filesView], ['Explore', this.exploreView]
    ]) {
      el?.classList?.toggle('active', tabName === name)
    }
    el.classList.add('active')
    if (name === 'Explore') {
      this.mode = 'explore'
      this.previewDocView.mode = this.mode
      this.displayPreview()
    } else {
      this.mode = 'files'
      this.previewDocView.mode = this.mode
    }
  }

  async initFiles() {
    this.filesView = document.createElement('div')
    this.filesView.classList.add('files', 'tab-content')
    this.fileTree = document.createElement('file-tree')
    const fileTreeData = {'System': this.systemFiles}
    this.fileTree.data = fileTreeData
    this.fileTree.selected = ['System', Object.keys(fileTreeData['System'])[0]]
    this.fileTree.addEventListener('select-item', () => {
      this.displayPreview()
    })
    this.filesView.append(this.fileTree)
    this.selectPane.append(this.filesView)
  }

  displayPreview() {
    this.previewDocView.notebookFile = this.mode === 'explore' ?
      this.exploreView.notebookSelect.selectedItem?.name :
      'notebook-view.md'
    this.previewDocView.dataFile = this.mode === 'explore' ?
      this.exploreView.dataSelect.selectedItem?.filename :
      this.fileTree.selected.slice(1).join('/')
    this.previewDocView.mode = this.mode
  }

  static get globalStyles() {
    let s; return s ?? (
      v => { s = new CSSStyleSheet(); s.replaceSync(v); return s }
    )(this.globalStylesCss)
  }

  static get styles() {
    let s; return s ?? (
      v => { s = new CSSStyleSheet(); s.replaceSync(v); return s }
    )(this.stylesCss)
  }

  static globalStylesCss = `
    body {
      margin: 0;
      padding: 0;
      background-color: #55391b;
    }
    html {
      box-sizing: border-box;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
  `

  static stylesCss = `
    :host {
      display: grid;
      grid-template-columns: var(--sidebar-width, 280px) auto 1.8fr;
      grid-template-rows: 1fr;
      height: 100vh;
      margin: 0;
      padding: 0;
      color: #bfcfcd;
    }
    :host(.explore) {
      grid-template-columns: var(--explore-sidebar-width, 1fr) auto 1.8fr;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    split-view {
      min-width: 5px;
    }
    div.select {
      display: flex;
      flex-direction: column;
      padding: 10px;
      padding-right: 0px;
      scrollbar-color: #0000004d #0000;
      align-items: stretch;
      height: 100vh;
    }
    div.select::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    div.select::-webkit-scrollbar-thumb {
      background-color: #0000004d;
      border-radius: 4px;
    }
    explore-view, div.files {
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding-right: 8px;
    }
    div.select-tabs {
      display: flex;
      flex-direction: row;
      gap: 5px;
      padding: 5px;
    }
    div.select-tabs a {
      flex-grow: 1;
      text-align: center;
      font-family: sans-serif;
      font-size: 14px;
      padding: 5px;
      cursor: pointer;
    }
    div.select-tabs a.active {
      color: #d1cf3b;
      background: #00000040;
    }
    div.select .tab-content {
      display: none;
    }
    div.select .tab-content.active {
      display: flex;
    }
    div.content-pane {
      padding: 5px;
      padding-left: 0px;
      display: grid;
      grid-template-rows: min-content 1fr;
      grid-template-columns: 1fr;
      gap: 5px;
    }
    doc-view {
      flex-grow: 1;
      border: none;
      padding: 10px;
      border-radius: 10px;
      background-color: #2b172a;
    }
    tab-list {
      background-color: #2b172a;
      padding: 2px;
      border-radius: 8px;
      --bg: #3a2a10;
      --bg-hover: color-mix(in srgb, #3a2a10, #eda 5%);
      --fg: #aaa;
      --fg-hover: #ccc;
      --bg-selected: #65491b;
      --bg-selected-hover: color-mix(in srgb, #55391b, #eda 10%);
      --fg-selected: #d1cf3b;
      --fg-selected-hover: color-mix(in srgb, #d1cf3b, #eee 10%);
    }
    @media (max-width: 600px) {
      :host {
        height: auto;
        grid-template-columns: 1fr;
        grid-template-rows: auto 100vh;
        gap: 12px;
      }
      split-view {
        display: none;
      }
      div.select {
        padding-right: 10px;
      }
      div.content-pane {
        padding-left: 10px;
        padding-bottom: 100px;
      }
      div.view-pane {
        
      }
    }
  `
}
```

`app.js`

```js
import {MarkdownView} from '/notebook-view/MarkdownView.js'
import {MarkdownCodeBlock} from '/notebook-view/MarkdownCodeBlock.js'
import {SplitView} from '/split-pane/split-view.js'
import {FileCard} from '/file-cards/FileCard.js'
import {FileCardList} from '/file-cards/FileCardList.js'
import {FileTree} from '/file-tree/file-tree.js'
import {TabItem} from '/tabs-new/TabItem.js'
import {TabList} from '/tabs-new/TabList.js'
import {DocView} from '/DocView.js'
import {AppView} from '/AppView.js'
import {ExploreView} from '/ExploreView.js'
import {Builder} from '/loader/builder.js'

customElements.define('markdown-view', MarkdownView)
customElements.define('markdown-code-block', MarkdownCodeBlock)
customElements.define('split-view', SplitView)
customElements.define('file-card', FileCard)
customElements.define('file-card-list', FileCardList)
customElements.define('file-tree', FileTree)
customElements.define('tab-item', TabItem)
customElements.define('tab-list', TabList)
customElements.define('doc-view', DocView.init({Builder}))
customElements.define('app-view', AppView)
customElements.define('explore-view', ExploreView)

async function setup() {
  const appView = document.createElement('app-view')
  appView.setAttribute('draggable', 'false')
  document.body.append(appView)
}

setup()
```
