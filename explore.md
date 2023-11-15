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
        height: 160px;
        font-family: monospace;
        font-weight: 700;
        font-size: 12px;
      }
      .icon {
        width: 128px;
        height: 128px;
        background: #bbb;
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
    this.listEl.querySelector('[selected]')?.forEach?.(el => {
      el.removeAttribute('selected')
    })
    e.target.setAttribute('selected', '')
  }

  get name() {
    return this.headerEl.innerText
  }

  set name(value) {
    this.headerEl.innerText = value
  }

  set items(value) {
    this.listEl.replaceChildren(...value)
  }

  get items() {
    this.listEl.children
  }
}

customElements.define('file-card-list', FileCardList)
```

`app.js`

```js
async function setup() {
  const data = {
    data: {
      name: 'Data',
      templates: [
        'colors.json', 'cat.png', 'example-notebook.md'
      ]
    },
    notebooks: {
      name: 'Notebooks',
      templates: [
        'colors.json', 'cat.png', 'example-notebook.md'
      ]
    },
  }
  document.body.append(...(Object.entries(data)).map(([key, group]) => {
    const el = document.createElement('file-card-list')
    el.name = group.name
    el.items = group.templates.map(template => {
      const el = document.createElement('file-card')
      el.name = template
      return el
    })
    return el
  }))
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
  for (const block of readBlocks(src)) {
    const match = src.slice(0, block.blockRange[0]).match(
      /\n\s*\n\s*`([^`]+)`\s*\n\s*$/
    )
    if (match && match[1] !== 'entry.js') {
      const blockSrc = src.slice(...block.contentRange)
      await import(`data:text/javascript;base64,${btoa(blockSrc)}`)
    }
  }
}

run(window.__source)
```