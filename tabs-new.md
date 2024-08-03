# Tabs (New)

This is a set of components for tabs that are draggable across different lists and closable. It is being built for `notebook-view` and `app-view`.

TODO:

- [x] Add drag and drop from tabs-draggable
- [ ] Track the tab being dragged and style it differently
- [ ] Allow cancelling drag with Esc and prevent dropping from changing what is selected
- [x] Move on drag
- [ ] Allow moving to other Tab List
- [x] Remove context menu
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

This is an individual tab. It can be a tab that is used as a content container, or a tab that is being dragged. The tab that is being dragged has the `drag` class and doesn't handle events, but is just displayed while dragging.

The dragging is done manually with [pointer capture](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events), so the dragged tab is an HTML element instead of an image.

`TabItem.js`

```js
export class TabItem extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.mainEl = document.createElement('div')
    this.mainEl.classList.add('main')
    this.shadowRoot.appendChild(this.mainEl)
    this.nameEl = document.createElement('label')
    this.nameEl.classList.add('name')
    this.mainEl.appendChild(this.nameEl)
    // this.loopCounter = 1
    // this.loopEventCounter = 1
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
    this.mainEl.addEventListener('pointerdown', e => {
      if (e.isPrimary) {
        this.mainEl.setPointerCapture(e.pointerId)
        e.preventDefault()
        this.pointerDown = true
        this.moved = false
        const rect = this.getBoundingClientRect()
        this.offsetX = e.clientX - rect.left
        this.offsetY = e.clientY - rect.top
      }
    })
    this.mainEl.addEventListener('pointermove', e => {
      if (this.pointerDown) {
        if (!this.moved) {
          this.moved = true
          this.tabList.dragging = true
          this.tabList.dragItem.name = this.name
          this.tabList.dragItem.selected = this.selected
          this.tabList.dragItem.classList.add('dragging')
        }
        if (!this.moveLoopActive) {
          this.moveLoop()
        }
        this.tabList.dragItem.setDragPosition(
          e.clientX - this.offsetX, e.clientY - this.offsetY
        )
        this.pointerMoveEvent = e
      }
    })
    this.mainEl.addEventListener('pointerup', e => {
      this.tabList.dragItem.classList.remove('dragging')
      if (this.moved) {
        if (this.hoverTab) {
          // TODO when dragging from outside:
          // if it's not in the first 15px or so of the last tab,
          // make the new tab the last tab, also consider for the last n tabs (3?)
          const hoverIndex = [...this.parentElement.children].indexOf(this.hoverTab)
          const myIndex = [...this.parentElement.children].indexOf(this)
          const position = (hoverIndex > myIndex) ? 'afterEnd' : 'beforeBegin'
          this.hoverTab.insertAdjacentElement(position, this)
        }
      } else if (!this.tabList.dragging) {
        this.selected = true
      }
      this.moved = false
      this.pointerDown = false
      this.tabList.dragging = false
    })
    this.mainEl.addEventListener('lostpointercapture', e => {
      this.pointerMoveEvent = undefined
      this.tabList.dragItem.classList.remove('dragging')
      if (this.hoverTab) {
        this.hoverTab.classList.remove('drag-hover')
        this.hoverTab = undefined
      }
      this.tabList.dragging = false
    })
  }

  async *pointerMoveEvents() {
    if (this.pointerMoveEvent) {
      const {pointerMoveEvent} = this
      this.pointerMoveEvent = undefined
      yield pointerMoveEvent
    }
    for (let i=0; i < 100000; i++) {
      await this.constructor.delay(25)
      if (this.pointerMoveEvent) {
        const {pointerMoveEvent} = this
        this.pointerMoveEvent = undefined
        yield pointerMoveEvent
      } else {
        return
      }
    }
  }

  async moveLoop() {
    this.moveLoopActive = true
    for await (const e of this.pointerMoveEvents()) {
      // this.loopEventCounter += 1
      const hoverTab = [
        ...this.tabList.shadowRoot.elementsFromPoint(e.clientX, e.clientY)
      ].find(el => (
        el !== this.tabList.dragItem && el !== this && el.tagName === 'TAB-ITEM'
      ))
      if (this.hoverTab !== hoverTab) {
        if (this.hoverTab) {
          this.hoverTab.classList.remove('drag-hover')
        }
        if (hoverTab) {
          hoverTab.classList.add('drag-hover')
        }
        this.hoverTab = hoverTab
      }
    }
    this.moveLoopActive = false
    // this.loopCounter += 1
    // console.log(`${this.name} loop counter: ${this.loopCounter} events: ${this.loopEventCounter}`)
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
    return this.getRootNode().host
  }

  setDragPosition(x, y) {
    this.style.setProperty('--drag-left', `${x}px`)
    this.style.setProperty('--drag-top', `${y}px`)
  }

  static delay(ms) {
    return new Promise((resolve, _) => {
      setTimeout(resolve, ms)
    })
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
        div.main {
          display: flex;
          flex-direction: row;
          align-items: stretch;
          padding: 3px 4px;
          border-radius: var(--radius, 5px);
          color: var(--fg, #b9b9bc);
          background-color: var(--bg, #484850);
          align-items: center;
        }
        :host(.selected) div.main {
          background-color: var(--bg-selected, #0e544f);
          color: var(--fg-selected, #e7e7e7);
        }
        :host(:hover) div.main {
          background-color: var(--bg-hover, #52525b);
          color: var(--fg-hover, #c7c7c7);
        }
        :host(.selected:hover) div.main {
          background-color: var(--bg-selected-hover, #0c6860);
          color: var(--fg-selected-hover, #f7f7f7);
        }
        :host(.drag-hover) div.main {
          background-color: var(--bg-drag-hover, #64646d);
          color: var(--fg, #c7c7c7);
          pointer-events: none;
        }
        .name {
          flex-grow: 1;
          padding: 0 5px;
          font: inherit;
          font-family: ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,
          Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif;
          outline: none;
          white-space: nowrap;
          user-select: none;
        }
        div.main button svg {
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
        div.main > button {
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

This is a sequential list of tabs, that appear next to each other.

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

  get tabs() {
    return this.listEl.children
  }

  set tabs(value) {
    this.listEl.replaceChildren(...value)
  }

  get selectedItem() {
    return this.listEl.querySelector('[selected]')
  }

  get dragging() {
    if (this.tabGroup) {
      return this.tabGroup.dragging
    } else {
      if (typeof this._dragging === 'number') {
        return Date.now() < this._dragging
      } else {
        return Boolean(this._dragging)
      }
    }
  }

  set dragging(value) {
    if (this.tabGroup) {
      this.tabGroup.dragging = value
    } else {
      if (value) {
        this._dragging = true
      } else {
        this._dragging = new Date(Date.now() + 50)
      }
    }
  }
}
```

This is a group of tab lists, which enables tabs to be dragged from one tab list to another.

`TabGroup.js`

```js
export class TabGroup {
  set tabLists(value) {
    this._tabLists = value
  }

  get tabLists() {
    return this._tabLists
  }

  get tabs() {
    return this.tabLists.map(tabList => tabList.tabs).flat()
  }

  get dragging() {
    if (typeof this._dragging === 'number') {
      return Date.now() < this._dragging
    } else {
      return Boolean(this._dragging)
    }
  }

  set dragging(value) {
    if (value) {
      this._dragging = true
    } else {
      this._dragging = new Date(Date.now() + 50)
    }
  }
}
```

`ExampleView.js`

```js
import {TabGroup} from '/TabGroup.js'

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
    this.tabGroup = new TabGroup()
    this.topTabList.tabGroup = this.tabGroup
    this.bottomTabList.tabGroup = this.tabGroup
    this.tabGroup.tabLists = [this.topTabList, this.bottomTabList]
    notebookView.shadowRoot.querySelector('.top').append(this.topTabList)
    notebookView.shadowRoot.querySelector('.bottom').append(this.bottomTabList)
  }

  createTabs(n) {
    const tabList = document.createElement('tab-list')
    const tabs = Array(n).fill('').map((_, i) => {
      const el = document.createElement('tab-item')
      el.name = `Tab ${i}`
      if (i === 0) {
        el.selected = true
      }
      return el
    })
    tabList.tabs = tabs
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
