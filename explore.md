# Explore

This is an interface to explore different notebooks for different types of content.

`FileCard.js`

```js
export default class FileCard extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.iconEl = document.createElement('div')
    this.iconEl.classList.add('icon')
    this.nameEl = document.createElement('div')
    this.shadowRoot.append(this.iconEl, this.nameEl)
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
        width: 160px;
        padding: 10px 0px;
        font-family: monospace;
        font-weight: 700;
        font-size: 12px;
        border: 2px solid transparent;
      }
      :host([selected]) {
        border-color: blue;
      }
      .icon {
        width: 128px;
        height: 128px;
        background: #bbb;
        display: flex;
        flex-direction: column;
        align-items: stretch;
      }
      .icon img {
        flex-grow: 1;
      }
    `
    this.shadowRoot.append(style)
  }

  get name() {
    return this.nameEl.innerText
  }

  set name(name) {
    this.nameEl.innerText = name
  }

  get filename() {
    return this.name.endsWith('.md') ? this.name : `${this.name}.md`
  }

  set image(data) {
    this.iconEl.replaceChildren(Object.assign(
      document.createElement('img'), {src: data}
    ))
  }
}

customElements.define('file-card', FileCard)
```

`FileCardList.js`

```js
export default class FileCardList extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.headerEl = document.createElement('h2')
    this.listEl = document.createElement('div')
    this.listEl.classList.add('list')
    this.listEl.addEventListener('click', e => this.childClicked(e))
    this.shadowRoot.append(this.headerEl, this.listEl)
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      .list {
        display: flex;
        flex-direction: row;
        gap: 10px;
        color: #bfcfcd;
        background-color: #2b172a;
        padding: 20px;
        border-radius: 10px;
      }
    `
    this.shadowRoot.append(style)
  }

  childClicked(e) {
    if (e.target !== this.listEl && !e.target.hasAttribute('selected')) {
      this.listEl.querySelectorAll('[selected]')?.forEach?.(el => {
        el.removeAttribute('selected')
      })
      e.target.setAttribute('selected', '')
      this.dispatchEvent(new CustomEvent('select-item'), {bubbles: true})
    }
  }

  get name() {
    return this.headerEl.innerText
  }

  set name(value) {
    this.headerEl.innerText = value
  }

  get items() {
    return this.listEl.children
  }

  set items(value) {
    this.listEl.replaceChildren(...value)
  }

  get selectedItem() {
    return this.listEl.querySelector('[selected]')
  }
}

customElements.define('file-card-list', FileCardList)
```

`ExploreApp.js`

```js
export default class ExploreApp extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.dataTemplates = [
      'colors.json', 'image.png', 'example-notebook.md'
    ]
    this.notebookTemplates = {
      'colors.json': [
        'palette.md',
        'shapes.md',
      ],
      'image.png': [
        'transform.md',
        'histogram.md',
      ],
      'example-notebook.md': [
        'list.md',
        'tabbed.md',
        'overlay.md',
      ],
    }
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
    this.selectPane = document.createElement('div')
    this.selectPane.append(this.dataSelect, this.notebookSelect)
    this.selectPane.classList.add('select')
    this.viewPane = document.createElement('div')
    this.viewPane.classList.add('view-pane')
    this.displayNotebook()
    this.shadowRoot.append(this.selectPane, this.viewPane)
  }

  connectedCallback() {
    const globalStyle = document.createElement('style')
    globalStyle.textContent = `
      body {
        margin: 0;
        padding: 0;
        background-color: #55391b;
      }
    `
    document.head.append(globalStyle)
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr;
        gap: 10px;
        min-height: 100vh;
        margin: 0;
        padding: 0;
        color: #bfcfcd;
      }
      div.select {
        display: flex;
        flex-direction: column;
        padding: 10px;
      }
      div.view-pane {
        display: flex;
        flex-direction: column;
        padding: 10px;
      }
      div.view-pane iframe {
        flex-grow: 1;
        border: none;
        padding: 10px;
        border-radius: 10px;
        background-color: #2b172a;
      }
    `
    this.shadowRoot.append(style)
    this.initImages(this.dataSelect.items)
  }

  dataUrl(name, data) {
    const ext = name.match(/\.(\w+)$/).at(1) ?? 'png'
    const mime = 'image/' + ({svg: 'svg+xml', jpg: 'jpeg'}[ext] ?? ext)
    const urlData = ext === 'svg' ? btoa(data) : data.replaceAll(/\s+/g, '')
    return `data:${mime};base64,${urlData}`
  }

  *blocksWithNames(src) {
    for (const block of readBlocks(src)) {
      const name = src.slice(0, block.blockRange[0]).match(
        new RegExp('\\n\\s*\\n\\s*`([^`]+)`\\s*\\n\\s*$')
      ).at(1)
      yield {...block, name}
    }
  }

  findImage(path) {
    const parts = path.split('/')
    for (const block of this.blocksWithNames(__source)) {
      if (parts.at(0) === block.name) {
        const blockSrc = __source.slice(...block.contentRange)
        for (const innerBlock of this.blocksWithNames(blockSrc)) {
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
    for (const block of readBlocks(src)) {
      const name = src.slice(0, block.blockRange[0]).match(
        new RegExp('\\n\\s*\\n\\s*`([^`]+)`\\s*\\n\\s*$')
      ).at(1)
      const item = itemsByFile[name]
      if (item !== undefined) {
        const blockSrc = src.slice(...block.contentRange)
        let thumbnail
        for (const block of readBlocks(blockSrc)) {
          const name = blockSrc.slice(0, block.blockRange[0]).match(
            new RegExp('\\s*`([^`]+)`\\s*$')
          ).at(1)
          if (
            thumbnail === undefined && name && name.match(/\.(png|jpe?g|svg|webm)/) ||
            name.startsWith('thumbnail.')
          ) {
            thumbnail = [name, block.contentRange]
          }
        }
        if (thumbnail !== undefined) {
          const name = thumbnail[0]
          const data = blockSrc.slice(...thumbnail[1]).replaceAll(
            new RegExp(`\\$\\{image\\('([^']+)'\\)\\}`, 'g'),
            (_, m) => {
              const img = this.findImage(m)
              return img ? this.dataUrl(...img) : m
            }
          )
          item.image = this.dataUrl(name, data)
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
      const src = __source
      let entrySrc, notebookSrc = ''
      const notebookFiles = [this.dataSelect.selectedItem?.filename, this.notebookSelect.selectedItem?.name]
      const notebookEditorFiles = ['codemirror-bundle.md', 'loader.md']
      let hasEntry = false
      for (const block of readBlocksWithNames(src)) {
        if (block.name === 'entry.js') {
          entrySrc = src.slice(...block.blockRange)
        } else if (notebookFiles.includes(block.name)) {
          const blockSrc = src.slice(...block.contentRange)
          for (const subBlock of readBlocksWithNames(blockSrc)) {
            if (subBlock.name === 'notebook.json') {
              console.log('found notebook.json')
            }
          }
          notebookSrc += "\n\n" + blockSrc
        } else if (
          notebookEditorFiles.includes(block.name) &&
          this.dataSelect.selectedItem?.filename === 'example-notebook.md'
        ) {
          notebookSrc += `\n\n\`${block.name}\`\n\n` + src.slice(...block.blockRange)
          hasEntry = true
        }
      }
      const messageText = notebookSrc + (hasEntry ? '' : `\n\n\`entry.js\`\n\n${entrySrc}\n`)
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

customElements.define('explore-app', ExploreApp)
```

`setup.js`

```js
async function setup() {
  document.body.append(document.createElement('explore-app'))
}

setup()
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
    if (block.name && (block.name.endsWith('.js') && block.name !== 'entry.js')) {
      const blockSrc = src.slice(...block.contentRange)
      await import(`data:text/javascript;base64,${btoa(blockSrc)}`)
    }
  }
}

run(__source)
```

