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

  set image(data) {
    const img = document.createElement('img')
    img.src = `data:image/png;base64,${data.replaceAll(/\s*/g, '')}`
    this.iconEl.replaceChildren(img)
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

  setImage(name, value) {
    for (const item of this.items) {
      if (item.name === name) {
        item.image = value
      }
    }
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
      'colors.json', 'cat.png', 'example-notebook.md'
    ]
    this.notebookTemplates = {
      'colors.json': [
        'palette.md',
        'shapes.md',
      ],
      'cat.png': [
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
      }
      div.select {
        display: flex;
        flex-direction: column;
        padding: 10px;
      }
      div.view-pane {
        display: flex;
        flex-direction: column;
      }
      div.view-pane iframe {
        flex-grow: 1;
        border: none;
      }
    `
    this.shadowRoot.append(style)
    this.initImages()
  }

  initImages() {
    const src = __source
    for (const block of readBlocks(src)) {
      const match = src.slice(0, block.blockRange[0]).match(
        /\n\s*\n\s*`([^`]+)`\s*\n\s*$/
      )
      if (match && match[1] === 'images.md') {
        const blockSrc = src.slice(...block.contentRange)
        for (const block of readBlocks(blockSrc)) {
          const match = blockSrc.slice(0, block.blockRange[0]).match(
            /\s*`([^`]+)`\s*$/
          )
          const imageSrc = blockSrc.slice(...block.contentRange)
          this.dataSelect.setImage(match[1], imageSrc)
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
  }

  displayNotebook() {
    this.viewFrame = document.createElement('iframe')
    this.viewFrame.sandbox = 'allow-scripts'
    this.viewFrame.srcdoc = 'Palette here'
    this.viewPane.replaceChildren(this.viewFrame)
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

async function run(src) {
  globalThis.readBlocks = readBlocks
  for (const block of readBlocks(src)) {
    const match = src.slice(0, block.blockRange[0]).match(
      /\n\s*\n\s*`([^`]+)`\s*\n\s*$/
    )
    if (match && match[1].endsWith('.js') && match[1] !== 'entry.js') {
      const blockSrc = src.slice(...block.contentRange)
      await import(`data:text/javascript;base64,${btoa(blockSrc)}`)
    }
  }
}

run(__source)
```

