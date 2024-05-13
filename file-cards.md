# File Cards

This is a component for lists of cards representing files, that have an icon and a filename.

`notebook.json`

```json
{
  "dataFiles": [
    ["colors.json.md", "thumbnail.svg"]
  ]
}
```

`FileCard.js`

```js
export class FileCard extends HTMLElement {
  static observedAttributes = ['selected']

  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.iconEl = document.createElement('div')
    this.iconEl.classList.add('icon')
    this.nameEl = document.createElement('div')
    this.shadowRoot.append(this.iconEl, this.nameEl)
    this.addEventListener('focus', () => {
      if (this.scrollIntoViewIfNeeded) {
        this.scrollIntoViewIfNeeded()
      } else {
        this.scrollIntoView?.()
      }
    })
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        min-width: 128px;
        min-height: 128px;
        font-family: monospace;
        font-weight: 700;
        font-size: 10.5px;
        border: 2px solid transparent;
        user-select: none;
      }
      :host(:focus-visible), :host(:focus-visible[selected]) {
        outline: none;
        border: 2px solid color-mix(in srgb, blue, white 40%);
      }
      :host([selected]) {
        border-color: blue;
      }
      .icon {
        width: 84px;
        height: 84px;
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
    this.updateTabIndex()
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

  attributeChangedCallback(name, oldValue, newValue) {
    this.updateTabIndex()
  }

  updateTabIndex() {
    this.tabIndex = this.hasAttribute('selected') ? 0 : -1
  }
}
```

`FileCardList.js`

```js
export class FileCardList extends HTMLElement {
  icons = {
    left: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-three-dots" viewBox="0 0 24 24">
        <path d="m14 17l-5-5l5-5z"/>
      </svg>
    `,
    right: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-three-dots" viewBox="0 0 24 24">
        <path d="M10 17V7l5 5z"/>
      </svg>
    `,
  }

  constructor() {
    super()
    this.leftBtn = document.createElement('button')
    this.leftBtn.innerHTML = this.icons.left
    this.leftBtn.addEventListener('click', () => {
      this.listEl.scroll({
        left: Math.max(0, this.listEl.scrollLeft - Math.floor(this.listEl.clientWidth * 0.85)),
        behavior: 'smooth',
      })
    })
    this.rightBtn = document.createElement('button')
    this.rightBtn.innerHTML = this.icons.right
    this.rightBtn.addEventListener('click', () => {
      this.listEl.scroll({
        left: Math.min(
          this.listEl.scrollWidth - this.listEl.clientWidth,
          this.listEl.scrollLeft + Math.floor(this.listEl.clientWidth * 0.85)
        ),
        behavior: 'smooth',
      })
    })
    this.attachShadow({mode: 'open'})
    this.headerEl = document.createElement('h2')
    const listWrapEl = document.createElement('div')
    listWrapEl.classList.add('list-wrap')
    this.listEl = document.createElement('div')
    this.listEl.classList.add('list')
    this.listEl.addEventListener('click', e => this.childClicked(e.target))
    this.listEl.addEventListener('keydown', e => {
      if (e.which === 13) {
        this.childClicked(e.target)
      }
      if (e.which == 37) {
        const prev = e.target.previousElementSibling
        if (prev) {
          prev.focus()
          this.childClicked(prev)
        }
      }
      if (e.which == 39) {
        const next = e.target.nextElementSibling
        if (next) {
          next.focus()
          this.childClicked(next)
        }
      }
    })
    this.listEl.addEventListener('scroll', () => {
      this.updateArrows()
    })
    this.listResizeObserver = new ResizeObserver(() => {
      this.updateArrows()
    })
    this.listResizeObserver.observe(this.listEl)
    listWrapEl.append(this.leftBtn, this.listEl, this.rightBtn)
    // listWrapEl.append(this.listEl)
    this.shadowRoot.append(this.headerEl, listWrapEl)
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      .list-wrap {
        display: flex;
        flex-direction: row;
        gap: 0px;
        color: #bfcfcd;
        background-color: #2b172a;
        padding: 5px 2px;
        border-radius: 10px;
        overflow-x: auto;
        align-items: center;
      }
      .list {
        flex-grow: 1;
        display: flex;
        flex-direction: row;
        gap: 8px;
        color: #bfcfcd;
        background-color: #2b172a;
        padding: 6px 0;
        border-radius: 10px;
        overflow-x: scroll;
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      .list::-webkit-scrollbar {
        display: none;
      }
      button {
        all: unset;
      }
      button svg {
        color: #bfcfcd;
        width: 32px;
        height: 32px;
      }
      button:disabled svg {
        color: #888;
      }
    `
    this.shadowRoot.append(style)
    setTimeout(() => {
      this.updateArrows()
    }, 10)
  }

  childClicked(target) {
    if (target !== this.listEl && !target.hasAttribute('selected')) {
      this.listEl.querySelectorAll('[selected]')?.forEach?.(el => {
        el.removeAttribute('selected')
      })
      target.setAttribute('selected', '')
      this.dispatchEvent(new CustomEvent('select-item'), {bubbles: true})
    }
  }

  updateArrows() {
    const listEl = this.listEl
    if (listEl.scrollLeft < 3) {
      this.leftBtn.setAttribute('disabled', '')
    } else {
      this.leftBtn.removeAttribute('disabled')
    }
    if (listEl.scrollLeft + listEl.offsetWidth > listEl.scrollWidth - 20) {
      this.rightBtn.setAttribute('disabled', '')
    } else {
      this.rightBtn.removeAttribute('disabled')
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
        el.image = `data:image/svg+xml;base64,${btoa(Macchiato.data['colors.json/thumbnail.svg'])}`
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
