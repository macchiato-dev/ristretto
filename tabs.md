# Tabs

This is a component for an editable list of tabs. It has a tab list and a tab item. Currently it has a menu built into it for adding, renaming, deleting, and moving the tabs. Some basic styling is supported through CSS variables.

TODO:

- [ ] Make the contentEl optional, and make another example that controls the contentEl itself
- [ ] Make it call the add only after the name has been saved, and make it so empty can be disallowed, duplicate names can be disallowed, and so the event can return false and it can be left un-created. Make it so event is called after renaming, and so .
- [ ] Move the menu to a separate component, and update objects that depend on it
- [ ] Add optional arrows for scrolling
- [ ] Roving keyboard navigation
- [ ] Return focus after rename if renamed by double-click
- [ ] Go to position on double-click
- [ ] Support close button, optional or mobile-only dot menu, optional context menu or long press
- [ ] Support dragging with one finger to move, dragging with two fingers or mousewheel to scroll (with arrows), and long press or right click for context menu
- [ ] Support New Tab icon that is included in the scrolling

Consider a component that allows tabs to be created and named later - call them Untitled when unfocused - and make it so the list-based editor can do the same and something could be hot-switched from tab to list. Also nested layouts and split layouts could be considered here.

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
    this.headerEl.appendChild(this.nameEl)
    this.menuBtn = document.createElement('button')
    this.menuBtn.innerHTML = this.icons.menu
    this.menuBtn.addEventListener('click', e => {
      this.openMenu()
    })
    this.headerEl.appendChild(this.menuBtn)
    this.menu = document.createElement(
      'm-menu-dropdown'
    )
    this.shadowRoot.appendChild(this.menu)
    this.shadowRoot.addEventListener('click', e => {
      if (!(this.menuBtn.contains(e.target) || this.menu.contains(e.target))) {
        this.selected = true
      }
    })
  }

  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
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
          font-family: ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif;
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
    this.shadowRoot.append(this.listEl)
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
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.tabList = document.createElement('tab-list')
    const tabItems = Array(3).fill('').map((_, i) => {
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
        background: #000;
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
