# Explore

This is an interface to explore different notebooks for different types of content.

`notebook.json`

```json
{
  "importFiles": [
    ["loader.md", "builder.js"],
    ["file-cards.md", "FileCard.js"],
    ["file-cards.md", "FileCardList.js"],
    ["split-pane.md", "split-view.js"]
  ]
}
```

TODO: to the right of where it says Data, add a pill switcher ( My Files | Examples ), also a filter icon to filter them. When creating a new one, upon editing, add it to the end of My Files, switch to My Files, and smooth scroll to select it.

The page by default will have Examples selected, but if you resume an instance by dragging the Markdown to the file drop zone, it will go back to having whatever was selected, selected.

The Markdown for an instance will be saved in SessionStorage, and upon reloading, such as after a crash, an option will be given to download it, try running it again, or discard it (with confirmation).

`ExploreApp.js`

```js
import {Builder} from '/loader/builder.js'

export class ExploreApp extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.notebookTemplates = {
      'colors.json': [
        'palette.md',
        'shapes.md',
      ],
      'image.png': [
        'image-filters.md',
        'histogram.md',
      ],
      'example-notebook.md': [
        'list.md',
        'tabbed.md',
        // 'overlay.md',  # TODO
      ],
      'planets.csv': [
        'table.md',
        'data-cards.md',
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
    this.selectTabs = document.createElement('div')
    this.selectTabs.append(...['Explore', 'Source'].map(name => {
      const el = document.createElement('a')
      el.innerText = name
      if (name === 'Explore') {
        el.classList.add('active')
      }
      el.addEventListener('click', () => {
        for (const child of el.parentElement.children) {
          child.classList.remove('active')
        }
        for (const [tabName, el] of [
          ['Explore', this.exploreView], ['Source', this.sourceView]
        ]) {
          if (tabName === name) {
            el.classList.add('active')
          } else {
            el.classList.remove('active')
          }
        }
        el.classList.add('active')
      })
      return el
    }))
    this.selectTabs.classList.add('select-tabs')
    this.exploreView = document.createElement('div')
    this.exploreView.append(this.dataSelect, this.notebookSelect)
    this.exploreView.classList.add('explore', 'tab-content', 'active')
    this.sourceView = document.createElement('div')
    this.sourceView.classList.add('source', 'tab-content')
    this.sourceView.innerText = 'Source'
    this.selectPane = document.createElement('div')
    this.selectPane.append(this.selectTabs, this.exploreView, this.sourceView)
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
    this.displayNotebook()
    this.shadowRoot.append(this.selectPane, this.split, this.viewPane)
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
    this.initImages(this.dataSelect.items)
    addEventListener('message', async e => {
      if (e.source === this.viewFrame?.contentWindow) {
        const [cmd, ...args] = e.data
        const port = e.ports[0]
        if (cmd === 'getDeps') {
          const [notebookSrc] = args
          const builder = new Builder({src: notebookSrc, parentSrc: __source})
          const deps = builder.getDeps()
          port.postMessage(deps)
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
      const notebookFile = this.notebookSelect.selectedItem?.name
      const dataFile = this.dataSelect.selectedItem?.filename
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
          dataSrc += `\n\n\`${block.name}\`\n\n` + src.slice(...block.contentRange)
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
}
```

`app.js`

```js
import {SplitView} from '/split-pane/split-view.js'
import {FileCard} from '/file-cards/FileCard.js'
import {FileCardList} from '/file-cards/FileCardList.js'
import {ExploreApp} from '/ExploreApp.js'

customElements.define('split-view', SplitView)
customElements.define('file-card', FileCard)
customElements.define('file-card-list', FileCardList)
customElements.define('explore-app', ExploreApp)

async function setup() {
  const exploreApp = document.createElement('explore-app')
  exploreApp.setAttribute('draggable', 'false')
  document.body.append(exploreApp)
}

setup()
```
