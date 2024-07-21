# App View

This is the main view of the app. It has a sidebar and a content view.

`notebook.json`

```json
{
  "importFiles": [
    ["storage.md", "storage.js"],
    ["loader.md", "builder.js"],
    ["file-cards.md", "FileCard.js"],
    ["file-cards.md", "FileCardList.js"],
    ["split-pane.md", "split-view.js"],
    ["file-tree.md", "file-tree.js"]
  ]
}
```

TODO: Add a page for the content of the notebook, perhaps called Project or Home.

TODO: Save the markdown for an instance in SessionStorage, and upon reloading, such as after a crash, give an option to download it, try running it again, or discard it (with confirmation).

`AppView.js`

```js
import {Builder} from '/loader/builder.js'

export class AppView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
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
    this.viewPane = document.createElement('div')
    this.viewPane.classList.add('view-pane')
    this.viewPane.setAttribute('draggable', 'false')
    this.split = document.createElement('split-view')
    this.split.addEventListener('split-view-resize', e => {
      const x = e.detail.offsetX - this.offsetLeft
      this.style.setProperty('--sidebar-width', `${x - 4}px`)
    })
    this.split.addEventListener('split-view-start', e => {
      this.viewPane.classList.add('split-move')
    })
    this.split.addEventListener('split-view-end', e => {
      this.viewPane.classList.remove('split-move')
    })
    this.split.setAttribute('draggable', 'false')
    this.shadowRoot.append(this.selectPane, this.split, this.viewPane)
    this.switchTab('Files', this.selectTabs.children[0])
  }

  connectedCallback() {
    const globalStyle = document.createElement('style')
    globalStyle.textContent = `
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
    document.head.append(globalStyle)
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: grid;
        grid-template-columns: var(--sidebar-width, 1fr) auto 1.8fr;
        grid-template-rows: 1fr;
        gap: 4px;
        height: 100vh;
        margin: 0;
        padding: 0;
        color: #bfcfcd;
      }
      div.view-pane.split-move iframe {
        pointer-events: none;
      }
      split-view {
        min-width: 4px;
      }
      div.select {
        display: flex;
        flex-direction: column;
        padding: 10px;
        padding-right: 0px;
        overflow-y: auto;
        scrollbar-color: #0000004d #0000;
      }
      div.select::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      div.select::-webkit-scrollbar-thumb {
        background-color: #0000004d;
        border-radius: 4px;
      }
      div.explore {
        display: flex;
        flex-direction: column;
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
      div.view-pane {
        display: flex;
        flex-direction: column;
        padding: 10px;
        padding-left: 0px;
      }
      div.view-pane iframe {
        flex-grow: 1;
        border: none;
        padding: 10px;
        border-radius: 10px;
        background-color: #2b172a;
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
        div.view-pane {
          padding-left: 10px;
          padding-bottom: 100px;
        }
      }
    `
    this.shadowRoot.append(style)
    addEventListener('message', async e => {
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
  }

  dataUrl(name, data) {
    const ext = name.match(/\.(\w+)$/).at(1) ?? 'png'
    const mime = 'image/' + ({svg: 'svg+xml', jpg: 'jpeg'}[ext] ?? ext)
    const urlData = ext === 'svg' ? btoa(data) : data.replaceAll(/\s+/g, '')
    return `data:${mime};base64,${urlData}`
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

  fence(text, info = '') {
    const matches = Array.from(text.matchAll(new RegExp('^\\s*(`+)', 'gm')))
    const maxCount = matches.map(m => m[1].length).toSorted((a, b) => a - b).at(-1) ?? 0
    const quotes = '`'.repeat(Math.max(maxCount + 1, 3))
    return `\n${quotes}${info}\n${text}\n${quotes}\n`
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

  displayNotebook() {
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
      const notebookFile = this.mode === 'explore' ? this.notebookSelect.selectedItem?.name : 'tabbed.md'
      const dataFile = this.mode === 'explore' ? this.dataSelect.selectedItem?.filename : this.fileTree.selected.slice(1).join('/')
      for (const block of readBlocksWithNames(src)) {
        if (block.name === notebookFile) {
          const blockSrc = src.slice(...block.contentRange)
          notebookSrc = blockSrc
        }
      }
      const builder = new Builder({src: notebookSrc, parentSrc: src})
      const depsSrc = builder.getDeps()
      for (const block of readBlocksWithNames(src)) {
        if (block.name === dataFile) {
          if (this.mode === 'explore') {
            dataSrc += `\n\n\`${block.name}\`\n\n` + src.slice(...block.contentRange)
          } else {
            dataSrc += `\n\n\`notebook.md\`\n\n` + this.fence(src.slice(...block.contentRange), 'md')
          }
        }
      }
      const messageText = `**begin deps**\n\n${depsSrc}\n\n---\n\n**begin data**\n\n${dataSrc}\n\n---\n\n**begin notebook**\n\n${notebookSrc}\n\n`
      const messageData = new TextEncoder().encode(messageText)
      this.viewFrame.contentWindow.postMessage(
        ['notebook', messageData],
        '*',
        [messageData.buffer]
      )
    })
    this.viewPane.replaceChildren(this.viewFrame)
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
    if (value === 'explore') {
      this.showExplore()
    }
  }

  async switchTab(name, el) {
    for (const child of el.parentElement.children) {
      child.classList.remove('active')
    }
    if (name === 'Files' && !this.filesView) {
      await this.initFiles()
    } else if (name === 'Explore' && !this.exploreView) {
      await this.initExplore()
    }
    for (const [tabName, el] of [
      ['Files', this.filesView], ['Explore', this.exploreView]
    ]) {
      el?.classList?.toggle('active', tabName === name)
    }
    el.classList.add('active')
    if (name === 'Explore') {
      this.mode = 'explore'
    } else {
      this.mode = 'files'
    }
    this.displayNotebook()
  }

  async initFiles() {
    this.filesView = document.createElement('div')
    this.filesView.classList.add('files', 'tab-content')
    this.fileTree = document.createElement('file-tree')
    const fileTreeData = {'System': this.systemFiles}
    this.fileTree.data = fileTreeData
    this.fileTree.selected = ['System', Object.keys(fileTreeData['System'])[0]]
    this.fileTree.addEventListener('select-item', () => {
      this.displayNotebook()
    })
    this.filesView.append(this.fileTree)
    this.selectPane.append(this.filesView)
  }

  async initExplore() {
    this.notebookTemplates = {
      'intro.md': [
        'app-content.md',
      ],
      'example-notebook.md': [
        'tabbed.md',
        'list.md',
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
      this.displayNotebook()
    })
    this.notebookSelect = document.createElement('file-card-list')
    this.notebookSelect.name = 'Notebook'
    this.updateNotebookItems()
    this.notebookSelect.addEventListener('select-item', e => {
      this.displayNotebook()
    })
    this.exploreView = document.createElement('div')
    this.exploreView.classList.add('explore', 'tab-content')
    this.exploreView.append(this.dataSelect, this.notebookSelect)
    this.selectPane.append(this.exploreView)
  }
}
```

`app.js`

```js
import {SplitView} from '/split-pane/split-view.js'
import {FileCard} from '/file-cards/FileCard.js'
import {FileCardList} from '/file-cards/FileCardList.js'
import {FileTree} from '/file-tree/file-tree.js'
import {Storage} from '/storage/storage.js'
import {AppView} from '/AppView.js'

customElements.define('split-view', SplitView)
customElements.define('file-card', FileCard)
customElements.define('file-card-list', FileCardList)
customElements.define('file-tree', FileTree)
customElements.define('app-view', AppView)

async function setup() {
  const appView = document.createElement('app-view')
  appView.storage = new Storage()
  appView.setAttribute('draggable', 'false')
  document.body.append(appView)
}

setup()
```
