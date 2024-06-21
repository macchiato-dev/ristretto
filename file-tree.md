# File Tree

This displays a tree of files.

`notebook.json`

```json
{
  "dataFiles": [
    ["files.json.md", "files.json"]
  ]
}
```

`file-tree.js`

```js
export class FileTree extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
  }

  icons = {
    expand: `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="6 2 12 14">
        <path fill="currentColor" d="M10 17V7l5 5z"/>
      </svg>
    `,
    collapse: `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="6 2 12 14">
        <path fill="currentColor" d="m12 15l-5-5h10z"/>
      </svg>
    `,
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      ul {
        list-style-type: none;
        padding-inline-start: 0;
      }
      li li .item {
        padding-left: 15px;
      }
      li li li .item {
        padding-left: 30px;
      }
      li li li li .item {
        padding-left: 45px;
      }
      li li li li li .item {
        padding-left: 60px;
      }
      li li li li li li .item {
        padding-left: 75px;
      }
      li li li li li li li .item {
        padding-left: 90px;
      }
      li li li li li li li li .item {
        padding-left: 105px;
      }
      li.active > .item {
        background: var(--bg-selected, #fff5);
      }
      button {
        all: unset;
        opacity: 0;
        padding-right: 3px;
      }
      li.has-children > .item > button {
        opacity: 1.0;
      }
      li.collapsed > ul {
        display: none;
      }
    `
    this.shadowRoot.append(style)
    this.shadowRoot.addEventListener('click', e => {
      const li = e.target.closest('li')
      this.shadowRoot.querySelector('li.active').classList.remove('active')
      li.classList.add('active')
      this.dispatchEvent(new CustomEvent('select-item'), {bubbles: true})
      if (e.target.closest('button') && li.classList.contains('has-children')) {
        this.toggleExpand(li)
      }
    })
  }

  toggleExpand(li) {
    const btn = li.querySelector(':scope > .item > button')
    li.classList.toggle('collapsed')
    if (li.classList.contains('collapsed')) {
      btn.innerHTML = this.icons.expand
    } else {
      btn.innerHTML = this.icons.collapse
    }
  }

  renderObject(ul, data, parents) {
    ul.replaceChildren(...Object.entries(data).map(([key, value]) => {
      const li = document.createElement('li')
      const item = document.createElement('div')
      const expand = document.createElement('button')
      expand.innerHTML = this.icons.collapse
      const name = document.createElement('span')
      item.classList.add('item')
      item.append(expand, name)
      li.append(item)
      if (typeof value === 'object' && value !== null) {
        name.innerText = key
        li.classList.add('has-children')
        item.dataset.path = JSON.stringify([...parents, key])
        const child = document.createElement('ul')
        li.append(child)
        this.renderObject(child, value, [...parents, key])
      } else {
        name.innerText = key
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
        if (block.name !== 'notebook.json' && block.name.endsWith('.json')) {
          this._data = JSON.parse(__source.slice(...block.contentRange))
          return this._data
        }
      }
      for (const block of readBlocksWithNames(__source)) {
        if (block.name === 'files.json.md') {
          const blockContent = __source.slice(...block.contentRange)
          for (const subBlock of readBlocksWithNames(blockContent)) {
            if (subBlock.name === 'files.json') {
              this._data = JSON.parse(blockContent.slice(...subBlock.contentRange))
              return this._data
            }
          }
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
