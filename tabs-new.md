# Tabs (New)

This is a set of components for tabs that are draggable across different lists and closable. It is being built for `notebook-view` and `app-view`.

TODO:

- [ ] Add drag and drop from tabs-draggable
- [ ] Move context menu to example
- [ ] Support dragging with one finger to move, and dragging with two fingers or mousewheel to scroll (with arrows)
- [ ] Make it show an x on hover
- [ ] Give extra space for scrollbar if it overflows
- [ ] Roving keyboard navigation
- [ ] Return focus after rename if renamed by double-click
- [ ] Go to position on double-click
- [ ] Support New Tab icon that is included in the scrolling

`notebook.json`

```json
{
  "dataFiles": [
    ["colors.json.md", "thumbnail.svg"]
  ],
  "importFiles": [
    ["menu.md", "dropdown.js"],
    ["split-pane.md", "split-view.js"],
    ["notebook-view.md", "MarkdownView.js"],
    ["notebook-view.md", "NotebookView.js"]
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
    this.menu = document.createElement(
      'm-menu-dropdown'
    )
    this.shadowRoot.appendChild(this.menu)
  }

  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    if (!this.classList.contains('drag')) {
      this.initEvents()
    }
  }

  initEvents() {
    this.nameEl.addEventListener('input', e => {
      if (this.contentEl !== undefined) {
        this.contentEl.name = this.nameEl.innerText
      }
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

    this.nameEl.addEventListener('mousedown', e => {
      if (e.detail > 1) {
        e.preventDefault()
      }
    })
    this.nameEl.addEventListener('dblclick', e => {
      this.rename()
      e.preventDefault()
    })
    this.headerEl.addEventListener('pointerdown', e => {
      if (e.isPrimary && this.nameEl.contentEditable !== 'true' && !this.menu.contains(e.target)) {
        this.headerEl.setPointerCapture(e.pointerId)
        e.preventDefault()
        this.pointerDown = true
        this.pointerOnMenu = this.menuBtn.contains(e.target)
        this.moved = false
        const rect = this.getBoundingClientRect()
        this.offsetX = e.clientX - rect.left
        this.offsetY = e.clientY - rect.top
      }
    })
    this.headerEl.addEventListener('pointermove', e => {
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
    this.headerEl.addEventListener('pointerup', e => {
      this.tabList.dragItem.classList.remove('dragging')
      if (!this.moved) {
        if (this.pointerOnMenu) {
          this.openMenu()
        } else {
          this.selected = true            
        }
      }
      this.moved = false
      this.pointerDown = false
    })
    this.headerEl.addEventListener('lostpointercapture', e => {
      this.tabList.dragItem.classList.remove('dragging')
      if (this.hoverTab) {
        this.hoverTab.classList.remove('drop-hover')
        this.hoverTab = undefined
      }
    })
    this.menuBtn.addEventListener('click', e => {
      this.openMenu()
    })
    this.shadowRoot.addEventListener('click', e => {
      if (!(this.menuBtn.contains(e.target) || this.menu.contains(e.target))) {
        this.selected = true
      }
    })
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
        if (this.contentEl !== undefined) {
          this.contentEl.remove()
        }
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
      if (this.contentEl !== undefined) {
        this.contentEl.selected = true
      }
    } else {
      this.classList.remove('selected')
      if (this.contentEl !== undefined) {
        this.contentEl.selected = false
      }
    }
    if (value === true) {
      for (const el of [...(this.parentElement?.children ?? [])].filter(el => el !== this)) {
        el.selected = false
      }
    }
  }

  get tabList() {
    return this.parentElement.parentNode.host
  }

  setDragPosition(x, y) {
    this.style.setProperty('--drag-left', `${x}px`)
    this.style.setProperty('--drag-top', `${y}px`)
  }

  icons = {
    menu: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="10 0 14 24">
        <path fill="currentColor" d="M12 16a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2a2 2 0
        0 1 2-2m0-6a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2a2 2 0 0 1 2-2m0-6a2 2 0 0 1 2
        2a2 2 0 0 1-2 2a2 2 0 0 1-2-2a2 2 0 0 1 2-2"/>
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
        div.header {
          display: flex;
          flex-direction: row;
          align-items: stretch;
          padding-left: 3px 0;
          border-radius: var(--radius, 5px);
          color: var(--fg, #b9b9bc);
          background-color: var(--bg, #484850);
          align-items: center;
        }
        :host(.selected) div.header {
          background-color: var(--bg-selected, #0e544f);
          color: var(--fg-selected, #e7e7e7);
        }
        :host(:hover) div.header {
          background-color: var(--bg-hover, #52525b);
          color: var(--fg-hover, #c7c7c7);
        }
        :host(.selected:hover) div.header {
          background-color: var(--bg-selected-hover, #0c6860);
          color: var(--fg-selected-hover, #f7f7f7);
        }
        .name {
          flex-grow: 1;
          padding: 0 5px;
          font: inherit;
          font-family: ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,
          Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif;
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
        div.header > button {
          all: unset;
          padding: 0 4px 0 2px;
          border-radius: 5px;
        }
        svg {
          height: 24px;
          width: 10px;
          margin-right: -3px;
          opacity: 50%;
        }
        :host(.selected) svg {
          opacity: 75%;
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
      .list {
        display: flex;
        flex-direction: row;
        gap: 3px;
        color: #111;
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

  handleAdd(e) {
    const direction = e.detail.direction
    const tabEl = document.createElement('tab-item')
    if (this.createContentEl !== undefined) {
      tabEl.contentEl = this.createContentEl(tabEl)
      tabEl.contentEl.codeMirror = this.codeMirror
    }
    const position = direction == 'left' ? 'beforebegin' : 'afterend'
    e.target.insertAdjacentElement(position, tabEl)
    if (tabEl.contentEl !== undefined && e.target.contentEl !== undefined) {
      e.target.contentEl.insertAdjacentElement(position, tabEl.contentEl)
    }
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
    if (e.target.contentEl !== undefined) {
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

`ExampleView.js`

```js
export class ExampleView extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    if (![...document.adoptedStyleSheets].includes(this.constructor.globalStyles)) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, this.constructor.globalStyles]
    }
    const notebookView = document.createElement('notebook-view')
    notebookView.notebook = __source.split('---\n\n**notebook**')[1]
    this.shadowRoot.append(notebookView)
    this.topTabList = this.createTabs(10)
    this.bottomTabList = this.createTabs(2)
    notebookView.shadowRoot.querySelector('.top').append(this.topTabList)
    notebookView.shadowRoot.querySelector('.bottom').append(this.bottomTabList)
  }

  createTabs(n) {
    const tabList = document.createElement('tab-list')
    const tabItems = Array(n).fill('').map((_, i) => {
      const el = document.createElement('tab-item')
      el.name = `Tab ${i}`
      if (i === 0) {
        el.selected = true
      }
      return el
    })
    tabList.items = tabItems
    return tabList
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: grid;
          height: 100vh;
          grid-template-columns: 1fr;
          grid-template-rows: 1fr;
        }
      `)
    }
    return this._styles
  }

  static get globalStyles() {
    if (!this._globalStyles) {
      this._globalStyles = new CSSStyleSheet()
      this._globalStyles.replaceSync(`
        html {
          box-sizing: border-box;
        }
        body {
          margin: 0;
        }
        *, *:before, *:after {
          box-sizing: inherit;
        }
      `)
    }
    return this._globalStyles
  }
}
```



`app.js`

```js
import {SplitView} from '/split-pane/split-view.js'
import {MarkdownView} from '/notebook-view/MarkdownView.js'
import {NotebookView} from '/notebook-view/NotebookView.js'
import {Dropdown} from "/menu/dropdown.js"
import {TabItem} from '/TabItem.js'
import {TabList} from '/TabList.js'
import {ExampleView} from '/ExampleView.js'

customElements.define('split-view', SplitView)
customElements.define('markdown-view', MarkdownView)
customElements.define('notebook-view', NotebookView)
customElements.define('tab-item', TabItem)
customElements.define('tab-list', TabList)
customElements.define('m-menu-dropdown', Dropdown)
customElements.define('example-view', ExampleView)

async function setup() {
  document.body.append(document.createElement('example-view'))
}

setup()
```
