# JSON Tree

`file-tree.js`

```js
export class FileTree extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      ul {
        list-style-type: none;
        padding-inline-start: 15px;
      }
      li.active > .item {
        background: #fff5;
      }
    `
    this.shadowRoot.append(style)
    this.shadowRoot.addEventListener('click', e => {
      this.shadowRoot.querySelector('li.active').classList.remove('active')
      const el = e.target.closest('li')
      el.classList.add('active')
      this.dispatchEvent(new CustomEvent('select-item'), {bubbles: true})
    })
  }

  renderObject(ul, data, parents) {
    ul.replaceChildren(...Object.entries(data).map(([key, value]) => {
      const li = document.createElement('li')
      const item = document.createElement('div')
      item.classList.add('item')
      li.append(item)
      if (typeof value === 'object' && value !== null) {
        item.innerText = key
        item.dataset.path = JSON.stringify([...parents, key])
        const child = document.createElement('ul')
        li.append(child)
        this.renderObject(child, value, [...parents, key])
      } else {
        item.innerText = key
        item.dataset.path = JSON.stringify([...parents, key])
      }
      return li
    }))
  }

  set data(data) {
    const ul = document.createElement('ul')
    this.renderObject(ul, data, [])
    ul.querySelector('li').classList.add('active')
    this.shadowRoot.replaceChildren(ul)
  }

  get selected() {
    const el = this.shadowRoot.querySelector('li.active > .item')
    return el ? JSON.parse(el.dataset.path) : undefined
  }

  set selected(path) {
    const el = this.shadowRoot.querySelector('li.active')
    if (el) {
      el.classList.remove('active')
    }
    if (path !== undefined) {
      const pathStr = JSON.stringify(path)
      const el = [...this.shadowRoot.querySelectorAll('li > .item')].find(el => (
        el.dataset.path === pathStr
      ))
      if (el) {
        el.closest('li').classList.add('active')
      }
    }
  }
}
```

`app-view.js`

```js
export class AppView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.dataTable = document.createElement('file-tree')
    this.shadowRoot.append(this.dataTable)
    this.dataTable.data = this.data
  }

  connectedCallback() {
    const globalStyle = document.createElement('style')
    globalStyle.textContent = `
      body {
        margin: 0;
        padding: 0;
        color: #ffffffbb;
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
    `
    this.shadowRoot.append(style)
  }

  get data() {
    if (!this._data) {
      for (const block of readBlocksWithNames(__source)) {
        if (block.name.endsWith('.json')) {
          return JSON.parse(__source.slice(...block.contentRange))
        }
      }
    }
    return this._data
  }
}
```

`app.js`

```js
import {FileTree} from '/file-tree.js'
import {AppView} from '/app-view.js'

customElements.define('file-tree', FileTree)
customElements.define('app-view', AppView)

async function setup() {
  const appView = document.createElement('app-view')
  document.body.append(appView)
}

await setup()
```

`thumbnail.svg`

```svg
<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" fill="#111">
  <style>
    svg {
      background-color: #000;
    }
    .color1 {
      fill: #78c;
    }
    .color2 {
      fill: #aaa;
    }
  </style>
  <g transform="translate(10, 20)">
    <rect x="20" y="20" width="60" height="20" class="color1" />
    <rect x="90" y="20" width="60" height="20" class="color1" />
    <rect x="160" y="20" width="60" height="20" class="color1" />
  </g>
  <g transform="translate(10, 50)">
    <rect x="20" y="20" width="60" height="20" class="color2" />
    <rect x="90" y="20" width="60" height="20" class="color2" />
    <rect x="160" y="20" width="60" height="20" class="color2" />
  </g>
  <g transform="translate(10, 80)">
    <rect x="20" y="20" width="60" height="20" class="color2" />
    <rect x="90" y="20" width="60" height="20" class="color2" />
    <rect x="160" y="20" width="60" height="20" class="color2" />
  </g>
  <g transform="translate(10, 110)">
    <rect x="20" y="20" width="60" height="20" class="color2" />
    <rect x="90" y="20" width="60" height="20" class="color2" />
    <rect x="160" y="20" width="60" height="20" class="color2" />
  </g>
  <g transform="translate(10, 140)">
    <rect x="20" y="20" width="60" height="20" class="color2" />
    <rect x="90" y="20" width="60" height="20" class="color2" />
    <rect x="160" y="20" width="60" height="20" class="color2" />
  </g>
  <g transform="translate(10, 170)">
    <rect x="20" y="20" width="60" height="20" class="color2" />
    <rect x="90" y="20" width="60" height="20" class="color2" />
    <rect x="160" y="20" width="60" height="20" class="color2" />
  </g>
</svg>
```
