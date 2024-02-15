# File Cards

This is a component for lists of cards representing files, that have an icon and a filename.

`notebook.json`

```json
{
  "importData": [
    ["colors.json.md", "thumbnail.svg"]
  ]
}
```

`FileCard.js`

```js
export class FileCard extends HTMLElement {
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
        gap: 12px;
        min-width: 140px;
        padding: 10px 0px;
        font-family: monospace;
        font-weight: 700;
        font-size: 11px;
        border: 2px solid transparent;
      }
      :host([selected]) {
        border-color: blue;
      }
      .icon {
        width: 96px;
        height: 96px;
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
```

`FileCardList.js`

```js
export class FileCardList extends HTMLElement {
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
        overflow-x: auto;
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
```



`app.js`

```js
import {FileCard} from '/FileCard.js'
import {FileCardList} from '/FileCardList.js'
import {ExampleApp} from '/ExampleApp.js'

customElements.define('file-card', FileCard)
customElements.define('file-card-list', FileCardList)
customElements.define('example-app', ExampleApp)

async function setup() {
  document.body.append(document.createElement('example-app'))
}

setup()
```

`ExampleApp.js`

```js
export class ExampleApp extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.dataTemplates = [
      'new.md', 'colors.json', 'image.png', 'example-notebook.md'
    ]
    this.notebookTemplates = {
      'new.md': [
        'create.md',
      ],
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
    })
    this.notebookSelect = document.createElement('file-card-list')
    this.notebookSelect.name = 'Notebook'
    this.updateNotebookItems()
    this.notebookSelect.addEventListener('select-item', e => {
    })
    this.selectPane = document.createElement('div')
    this.selectPane.append(this.dataSelect, this.notebookSelect)
    this.selectPane.classList.add('select')
    this.viewPane = document.createElement('div')
    this.viewPane.classList.add('view-pane')
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
        height: 100vh;
        margin: 0;
        padding: 0;
        color: #bfcfcd;
      }
      @media (max-width: 600px) {
        :host {
          height: auto;
          grid-template-columns: 1fr;
          grid-template-rows: auto 100vh;
        }
      }
      div.select {
        display: flex;
        flex-direction: column;
        padding: 10px;
        overflow-y: auto;
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
}
```
