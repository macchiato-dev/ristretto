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
    ["split-pane.md", "split-view.js"]
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
    this.closable = true
    this.attachShadow({mode: 'open'})
    this.mainEl = document.createElement('div')
    this.mainEl.classList.add('main')
    this.shadowRoot.appendChild(this.mainEl)
    this.nameEl = document.createElement('label')
    this.nameEl.classList.add('name')
    this.mainEl.append(this.nameEl)
  }

  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    if (!this.classList.contains('drag')) {
      this.initEvents()
    }
    if (this.closable) {
      const closeButton = document.createElement('button')
      closeButton.innerText = '✕'
      closeButton.classList.add('close')
      closeButton.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('tabClose', {composed: true}))
      })
      this.mainEl.append(closeButton)
    }
  }

  initEvents() {
    this.mainEl.addEventListener('pointerdown', e => {
      if (e.isPrimary && !e.target.classList.contains('close')) {
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
          this.classList.add('drag-source')
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
      this.classList.remove('drag-source')
      this.tabList.dragItem.classList.remove('dragging')
      if (this.moved) {
        if (this.hoverTab) {
          if (this.hoverTab.tagName === 'TAB-ITEM') {
            const hoverIndex = [...this.parentElement.children].indexOf(this.hoverTab)
            const myIndex = [...this.parentElement.children].indexOf(this)
            if (hoverIndex === -1) {
              const sourceTabList = this.tabList
              const destTabList = this.tabList.tabLists.find(tl => tl.appendDropArea === this.hoverTab)
              const changeSelected = this.selected
              const otherTabToSelect = changeSelected ? (this.previousElementSibling ?? this.nextElementSibling) : undefined
              if (otherTabToSelect) {
                otherTabToSelect.selected = true
              }
              this.hoverTab.insertAdjacentElement('beforebegin', this)
              if (changeSelected) {
                this.selected = true
              }
              if (sourceTabList !== destTabList && sourceTabList.listEl.children.length === 0) {
                sourceTabList.dispatchEvent(new CustomEvent('tabSelect', {bubbles: true, composed: true}))
              }
            } else {
              const position = (hoverIndex > myIndex) ? 'afterEnd' : 'beforeBegin'
              this.hoverTab.insertAdjacentElement(position, this)
            }
          } else {
            const sourceTabList = this.tabList
            const destTabList = this.tabList.tabLists.find(tl => tl.appendDropArea === this.hoverTab)
            const changeSelected = this.selected && (destTabList !== sourceTabList)
            const moveToEmpty = destTabList !== sourceTabList && destTabList.listEl.children.length === 0
            const otherTabToSelect = changeSelected ? (this.previousElementSibling ?? this.nextElementSibling) : undefined
            destTabList.listEl.insertAdjacentElement('beforeEnd', this)
            if (changeSelected) {
              this.selected = true
              if (otherTabToSelect) {
                otherTabToSelect.selected = true
              }
            } else if (moveToEmpty) {
              this.selected = true
            }
            if (sourceTabList !== destTabList && sourceTabList.listEl.children.length === 0) {
              sourceTabList.dispatchEvent(new CustomEvent('tabSelect', {bubbles: true, composed: true}))
            }
            if (changeSelected && moveToEmpty) {
              this.dispatchEvent(new CustomEvent('tabSelect', {bubbles: true, composed: true}))
            }
          }
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

  findHoverTab(e) {
    for (const tabList of this.tabList.tabLists) {
      const tabsFromPoint = tabList.tabsFromPoint(e.clientX, e.clientY)
      const hoverTab = tabsFromPoint.find(el => el !== this)
      if (hoverTab !== undefined) {
        return hoverTab
      }
    }
  }

  async moveLoop() {
    this.moveLoopActive = true
    for await (const e of this.pointerMoveEvents()) {
      const hoverTab = this.findHoverTab(e)
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
  }

  set name(name) {
    this.nameEl.innerText = name
  }

  get name() {
    return this.nameEl.innerText
  }

  get selected() {
    return this.hasAttribute('selected')
  }

  set selected(value) {
    const selectedTabs = (
      this.tabList !== undefined ? [...this.tabList.listEl.querySelectorAll(':scope > tab-item[selected]')] : []
    ).filter(el => el !== this)
    if (value !== this.selected || (value === true && selectedTabs.length > 0)) {
      if (value === true) {
        if (!this.classList.contains('drag')) {
          for (const tab of selectedTabs) {
            tab.selected = false
          }
        }
        this.setAttribute('selected', '')
        if (!this.classList.contains('drag')) {
          this.dispatchEvent(new CustomEvent('tabSelect', {bubbles: true, composed: true}))
        }
      } else {
        this.removeAttribute('selected')
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
          min-width: 50px;
          text-align: center;
        }
        div.main button.close {
          unset: all;
          font-size: 11px;
          margin-bottom: -2px;
          padding: 4px;
          color: #bbb;
          font-weight: bold;
        }
        div.main button.close:hover {
          color: white;
        }
        @media (hover: hover) {
          div.main button.close {
            display: none;
          }
        }
        :host([selected]) div.main {
          background-color: var(--bg-selected, #0e544f);
          color: var(--fg-selected, #e7e7e7);
        }
        :host(:hover) div.main {
          background-color: var(--bg-hover, #52525b);
          color: var(--fg-hover, #c7c7c7);
          position: relative;
        }
        :host(:hover:not(.drag-source)) div.main:has(button.close) .name {
          mask-image: linear-gradient(to left, transparent 12px, var(--fg-hover, #c7c7c7) 30px);
        }
        :host(:hover:not(.drag-source)) div.main button.close {
          position: absolute;
          right: 4px;
          display: block;
        }
        :host([selected]:hover) div.main {
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
        :host([selected]) svg {
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
          z-index: 1000;
        }
      `)
    }
    return this._styles
  }
}
```

This is a sequential list of tabs, that appear next to each other. It contains TabGroup, which enables tabs to be dragged from one tab list to another.

`TabList.js`

```js
export class TabList extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.listEl = document.createElement('div')
    this.listEl.classList.add('list')
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
        padding: 3px;
        padding-right: 0;
      }
      .list:empty {
        padding-left: 0;
        padding-right: 0;
        min-height: 28px;
      }
    `
    this.shadowRoot.append(style)
  }

  tabsFromPoint(x, y) {
    return [
      ...this.shadowRoot.elementsFromPoint(x, y),
      ...(this.appendDropArea ? this.appendDropArea.getRootNode().elementsFromPoint(x, y) : [])
    ].filter(el => (
      (el !== this.dragItem && el.tagName === 'TAB-ITEM') || el === this.appendDropArea
    ))
  }

  get tabs() {
    return this.listEl.children
  }

  set tabs(value) {
    this.listEl.replaceChildren(...value)
  }

  get tabLists() {
    return this.tabGroup?.tabLists ?? [this]
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
        this._dragging = Date.now() + 50
      }
    }
  }

  static TabGroup = class {
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
        this._dragging = Date.now() + 50
      }
    }
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
    this.split = document.createElement('split-view')
    this.split.vertical = true
    this.split.addEventListener('split-view-resize', e => {
      const y = e.detail.offsetY - this.offsetTop
      this.style.setProperty('--top-area-height', `${y}px`)
    })
    const {TabGroup} = customElements.get('tab-list')
    this.tabGroup = new TabGroup()
    this.topTabList = this.createTabs(5, 'A')
    this.topTabBlankArea = document.createElement('div')
    this.topTabBlankArea.classList.add('drop')
    this.topTabList.appendDropArea = this.topTabBlankArea
    this.topTabList.tabGroup = this.tabGroup
    this.topAreaHeader = document.createElement('div')
    this.topAreaHeader.classList.add('header')
    this.topAreaHeader.append(this.topTabList, this.topTabBlankArea)
    this.topArea = document.createElement('top-area')
    this.topArea.append(this.topAreaHeader)
    this.bottomTabList = this.createTabs(5, 'B')
    this.bottomTabBlankArea = document.createElement('div')
    this.bottomTabBlankArea.classList.add('drop')
    this.bottomTabList.appendDropArea = this.bottomTabBlankArea
    this.bottomTabList.tabGroup = this.tabGroup
    this.bottomAreaHeader = document.createElement('div')
    this.bottomAreaHeader.classList.add('header')
    this.bottomAreaHeader.append(this.bottomTabList, this.bottomTabBlankArea)
    this.bottomArea = document.createElement('bottom-area')
    this.bottomArea.append(this.bottomAreaHeader)
    this.bottomTabList.tabGroup = this.tabGroup
    this.tabGroup.tabLists = [this.topTabList, this.bottomTabList]
    this.shadowRoot.append(this.topArea, this.split, this.bottomArea)
    this.addEventListener('tabClose', e => {
      const tab = e.composedPath()[0]
      const toSelect = tab.selected ? (tab.previousElementSibling ?? tab.nextElementSibling ?? undefined) : undefined
      e.composedPath()[0].remove()
      if (toSelect !== undefined) {
        toSelect.selected = true
      }
    })
  }

  createTabs(n, prefix) {
    const tabList = document.createElement('tab-list')
    const tabs = Array(n).fill('').map((_, i) => {
      const el = document.createElement('tab-item')
      el.name = `Tab ${prefix}${i + 1}`
      if (i === 0) {
        el.selected = true
      }
      if (i % 2 === 1) {
        el.closable = false
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
          grid-template-rows: var(--top-area-height, 50%) min-content 1fr;
          box-sizing: border-box;
          color: #d7d7d7;
          height: 80vh;
        }
        *, *:before, *:after {
          box-sizing: inherit;
        }
        tab-list {
          grid-row: 1;
          grid-column: 1;
        }
        split-view {
          background: #273737;
        }
        :host > split-view {
          min-height: 3px;
        }
        .top-area, .bottom-area {
          display: grid;
          grid-template-columns: 1fr;
          grid-template-rows: min-content 1fr;
        }
        .header {
          display: grid;
          grid-template-columns: max-content 1fr;
        }
        .drop {
          padding: 3px;
          grid-row: 1;
          grid-column: 2;
          background-clip: content-box;
        }
        .drop.drag-hover {
          background-color: #8889;
          border-radius: 8px;
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
import {TabItem} from '/TabItem.js'
import {TabList} from '/TabList.js'
import {ExampleView} from '/ExampleView.js'

customElements.define('split-view', SplitView)
customElements.define('tab-item', TabItem)
customElements.define('tab-list', TabList)
customElements.define('example-view', ExampleView)

async function setup() {
  document.body.append(document.createElement('example-view'))
}

setup()
```
