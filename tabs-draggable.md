# Tabs

This is a component for tabs.

`notebook.json`

```json
{
  "dataFiles": [
    ["colors.json.md", "thumbnail.svg"]
  ],
  "importFiles": [
    ["menu.md", "dropdown.js"]
  ]
}
```

`TabItem.js`

```js
export class TabItem extends HTMLElement {
  constructor() {
    super()
    this.language = navigator.language
    this.attachShadow({mode: 'open'})
    this.codeMirror = true
    this.headerEl = document.createElement('div')
    this.headerEl.classList.add('header')
    this.shadowRoot.appendChild(this.headerEl)
    this.nameEl = document.createElement('label')
    this.nameEl.classList.add('name')
    this.nameEl.setAttribute('spellcheck', 'false')
    this.headerEl.appendChild(this.nameEl)
    this.menuBtn = document.createElement('button')
    this.menuBtn.innerHTML = this.icons.menu
    this.headerEl.appendChild(this.menuBtn)
    this.menu = document.createElement('m-menu-dropdown')
    this.shadowRoot.appendChild(this.menu)
  }

  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]

    if (!this.classList.contains('drag')) {
      this.nameEl.addEventListener('input', e => {
        this.contentEl.name = this.name
      })
      this.nameEl.addEventListener('blur', () => {
        this.nameEl.removeAttribute('contenteditable')
        if (this.isNew) {
          this.selected = true
          this.isNew = false
        }
      })
      this.nameEl.addEventListener('keydown', e => {
        if (e.which === 13) {
          e.preventDefault()
          const isNew = this.isNew
          this.nameEl.blur()
          if (isNew) {
            this.dispatchEvent(new CustomEvent(
              'ready-to-edit', {bubbles: true}
            ))
          }
          return false
        }
      })
      this.nameEl.addEventListener('pointerdown', e => {
        if (!(this.menuBtn.contains(e.target) || this.menu.contains(e.target))) {
          this.nameEl.setPointerCapture(e.pointerId)
          e.preventDefault()
          this.pointerDown = true
          this.moved = false
          const rect = this.getBoundingClientRect()
          this.offsetX = e.clientX - rect.left
          this.offsetY = e.clientY - rect.top
        }
      })
      this.nameEl.addEventListener('pointermove', e => {
        if (!this.moved) {
          this.moved = true
          if (this.pointerDown) {
            this.tabList.dragItem.name = this.name
            this.tabList.dragItem.selected = this.selected
            this.tabList.dragItem.classList.add('dragging')
          }
        }
        if (this.pointerDown) {
          this.tabList.dragItem.setDragPosition(
            e.clientX - this.offsetX, e.clientY - this.offsetY
          )
          const hoverTab = [
            ...this.tabList.shadowRoot.elementsFromPoint(e.clientX, e.clientY)
          ].find(el => (
            el !== this.tabList.dragItem && el.tagName === 'TAB-ITEM'
          ))
          if (this.hoverTab !== hoverTab) {
            if (this.hoverTab) {
              this.hoverTab.classList.remove('drop-hover')
            }
            if (hoverTab) {
              hoverTab.classList.add('drop-hover')
            }
            this.hoverTab = hoverTab
          }
        }
      })
      this.nameEl.addEventListener('pointerup', e => {
        this.tabList.dragItem.classList.remove('dragging')
        if (!this.moved) {
          this.selected = true
        }
        this.moved = false
        this.pointerDown = false
      })
      this.nameEl.addEventListener('lostpointercapture', e => {
        this.tabList.dragItem.classList.remove('dragging')
        if (this.hoverTab) {
          this.hoverTab.classList.remove('drop-hover')
          this.hoverTab = undefined
        }
      })
      this.menuBtn.addEventListener('click', e => {
        this.openMenu()
      })
    }
  }

  openMenu() {
    this.menu.clear()
    this.menu.add(this.text.addLeft, () => {
      this.dispatchEvent(new CustomEvent(
        'click-add', {bubbles: true, detail: {direction: 'left'}}
      ))
    })
    this.menu.add(this.text.addRight, () => {
      this.dispatchEvent(new CustomEvent(
        'click-add', {bubbles: true, detail: {direction: 'right'}}
      ))
    })
    if (this.previousElementSibling) {
      this.menu.add(this.text.moveLeft, () => {
        this.dispatchEvent(new CustomEvent(
          'click-move', {bubbles: true, detail: {direction: 'left'}}
        ))
      })
    }
    if (this.nextElementSibling) {
      this.menu.add(this.text.moveRight, () => {
        this.dispatchEvent(new CustomEvent(
          'click-move', {bubbles: true, detail: {direction: 'right'}}
        ))
      })
    }
    if (this.nextElementSibling || this.previousElementSibling) {
      this.menu.add(this.text.delete, () => {
        (this.previousElementSibling ?? this.nextElementSibling).selected = true
        this.contentEl.remove()
        this.remove()
      })
    }
    this.menu.add(this.text.rename, () => {
      this.rename()
    })
    this.menu.open(this.menuBtn)
  }

  rename() {
    this.nameEl.setAttribute('contenteditable', '')
    const range = document.createRange()
    const sel = window.getSelection()
    range.setStart(this.nameEl, this.nameEl.childNodes.length)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
    this.nameEl.focus()
  }

  set name(name) {
    this.nameEl.innerText = name
    //this.setFileType(name)
  }

  get name() {
    return this.nameEl.innerText
  }

  get selected() {
    return this.classList.contains('selected')
  }

  set selected(value) {
    if (value) {      
      this.classList.add('selected')
    } else {
      this.classList.remove('selected')
    }
    if (!this.classList.contains('drag')) {
      this.contentEl.selected = value
      if (value) {
        for (const el of [...(this.parentElement?.children ?? [])].filter(el => el !== this)) {
          el.selected = false
        }
      }
    }
  }

  setDragPosition(x, y) {
    this.style.setProperty('--drag-left', `${x}px`)
    this.style.setProperty('--drag-top', `${y}px`)
  }

  icons = {
    menu: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="10 0 14 24">
        <path fill="currentColor" d="M12 16a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2a2 2 0 0 1 2-2m0-6a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2a2 2 0 0 1 2-2m0-6a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2a2 2 0 0 1 2-2"/>
      </svg>
    `,
  }

  textEn = {
    addLeft: 'Add left',
    addRight: 'Add right',
    moveLeft: 'Move left',
    moveRight: 'Move right',
    rename: 'Rename',
    delete: 'Delete',
  }

  textEs = {
    addLeft: 'Añadir izquierda',
    addRight: 'Añadir derecha',
    moveLeft: 'Mover izquierda',
    moveRight: 'Mover derecha',
    rename: 'Cambiar nombre',
    delete: 'Borrar',
  }

  get language() {
    return this._language
  }

  set language(language) {
    this._language = language
    this.text = this.langEs ? this.textEs : this.textEn
  }

  get langEs() {
    return /^es\b/.test(this.language)
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: flex;
          flex-direction: column;
          align-items: stretch;
        }
        :host(.drag) {
          position: absolute;
          top: var(--drag-top, 0px);
          left: var(--drag-left, 0px);
          display: none;
        }
        :host(.drag.dragging) {
          display: block;
        }
        div.header {
          display: flex;
          flex-direction: row;
          align-items: stretch;
          padding-left: 3px 0;
          border-radius: var(--radius, 5px);
          color: var(--fg, #070707);
          background-color: var(--bg, rgb(212,212,216));
          align-items: center;
        }
        :host(.selected) div.header {
          background-color: var(--bg-selected, rgb(15,118,110));
          color: var(--fg-selected, #e7e7e7);
        }
        :host(.drop-hover) div.header, :host(.selected.drop-hover) div.header {
          background-color: var(--bg-drop-hover, rgb(122, 122, 126));
          color: var(--fg, #070707);
        }
        div.header > * {
          background: inherit;
          color: inherit;
          border: none;
        }
        .name {
          flex-grow: 1;
          padding: 0 5px;
          font: inherit;
          font-family: monospace;
          outline: none;
          white-space: nowrap;
        }
        div.header button svg {
          margin-bottom: -3px;
        }
        div.content {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-height: 5px;
        }
        div.content.collapsed > * {
          display: none;
        }
        label {
          padding: 0;
          margin: 0;
        }
        button {
          padding: 0 4px;
          border-radius: 5px;
        }
        svg {
          height: 24px;
          width: 10px;
          margin-right: -3px;
          opacity: 33%;
        }
        :host(.selected) svg {
          opacity: 75%;
        }
      `)
    }
    return this._styles
  }
}
```

`TabList.js`

```js
export class TabList extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.listEl = document.createElement('div')
    this.listEl.classList.add('list')
    this.listEl.addEventListener('click', e => this.childClicked(e))
    this.listEl.addEventListener('click-add', e => { this.handleAdd(e) })
    this.listEl.addEventListener('click-move', e => { this.handleMove(e) })
    this.dragItem = document.createElement('tab-item')
    this.dragItem.classList.add('drag')
    this.shadowRoot.append(this.listEl, this.dragItem)
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      :host {
        overflow-x: auto;
      }
      .list {
        display: flex;
        flex-direction: row;
        gap: 3px;
        color: #111;
        overflow-x: auto;
        scrollbar-width: thin;
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

  handleAdd(e) {
    const direction = e.detail.direction
    const tabEl = document.createElement('tab-item')
    const contentEl = this.createContentEl(tabEl)
    tabEl.contentEl = contentEl
    tabEl.tabList = this
    contentEl.codeMirror = this.codeMirror
    const position = direction == 'left' ? 'beforebegin' : 'afterend'
    e.target.insertAdjacentElement(position, tabEl)
    e.target.contentEl.insertAdjacentElement(position, contentEl)
    setTimeout(() => {
      tabEl.isNew = true
      tabEl.nameEl.setAttribute('contenteditable', '')
      tabEl.nameEl.focus()
    }, 50)
  }

  handleMove(e) {
    const direction = e.detail.direction
    const siblingEl = (
      direction == 'left' ?
      e.target.previousElementSibling :
      e.target.nextElementSibling
    )
    if (siblingEl) {
      const position = direction == 'left' ? 'beforebegin' : 'afterend'
      siblingEl.insertAdjacentElement(position, e.target)
    }
    const contentSiblingEl = (
      direction == 'left' ?
      e.target.contentEl.previousElementSibling :
      e.target.contentEl.nextElementSibling
    )
    if (contentSiblingEl) {
      const position = direction == 'left' ? 'beforebegin' : 'afterend'
      contentSiblingEl.insertAdjacentElement(position, e.target.contentEl)
    }
  }

  get items() {
    return this.listEl.children
  }

  set items(value) {
    for (const tabItem of value) {
      tabItem.tabList = this
    }
    this.listEl.replaceChildren(...value)
  }

  get selectedItem() {
    return this.listEl.querySelector('[selected]')
  }
}
```

`ExampleView.js`

```js
export class ExampleView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.tabList = document.createElement('tab-list')
    const tabItems = Array(20).fill('').map((_, i) => {
      const el = document.createElement('tab-item')
      el.name = `Tab ${i}`
      el.contentEl = document.createElement('example-item')
      el.contentEl.name = el.name
      if (i === 0) {
        el.selected = true
        el.contentEl.selected = true
      }
      return el
    })
    this.tabList.items = tabItems
    this.tabList.createContentEl = tabEl => {
      return document.createElement('example-item')
    }
    this.tabContent = document.createElement('div')
    this.tabContent.append(...tabItems.map(tabItem => tabItem.contentEl))
    this.shadowRoot.append(this.tabList, this.tabContent)
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
        grid-template-columns: 1fr;
        grid-template-rows: 1fr;
        margin: 0;
        padding: 10px;
        color: #bfcfcd;
        background: #fff;
      }
    `
    this.shadowRoot.append(style)
  }
}
```

`ExampleItem.js`

```js
export class ExampleItem extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.p = document.createElement('p')
    this.shadowRoot.append(this.p)
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: none;
      }
      :host(.selected) {
        display: block;
      }
    `
    this.shadowRoot.append(style)
  }

  set selected(value) {
    if (value) {
      this.classList.add('selected')
    } else {
      this.classList.remove('selected')
    }
  }

  set name(value) {
    this.p.innerText = value
  }

  get name() {
    return this.p.innerText
  }
}
```

`app.js`

```js
import {Dropdown} from "/menu/dropdown.js"
import {TabItem} from '/TabItem.js'
import {TabList} from '/TabList.js'
import {ExampleItem} from '/ExampleItem.js'
import {ExampleView} from '/ExampleView.js'

customElements.define('m-menu-dropdown', Dropdown)
customElements.define('tab-item', TabItem)
customElements.define('tab-list', TabList)
customElements.define('example-item', ExampleItem)
customElements.define('example-view', ExampleView)

async function setup() {
  document.body.append(document.createElement('example-view'))
}

setup()
```
