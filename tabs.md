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
  icons = {
    menu: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-three-dots" viewBox="0 0 16 16">
        <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
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
      this.dispatchEvent(new CustomEvent(
        'tab-update', {detail: {property: 'name'}, bubbles: true}
      ))
    })
    this.nameEl.addEventListener('blur', () => {
      this.nameEl.removeAttribute('contenteditable')
    })
    this.nameEl.addEventListener('keydown', e => {
      if (e.which === 13) {
        e.preventDefault()
        this.nameEl.blur()
        return false
      }
    })
    this.headerEl.appendChild(this.nameEl)
    this.menuBtn = document.createElement('button')
    this.menuBtn.innerHTML = this.icons.menu
    this.menuBtn.addEventListener('click', () => {
      this.openMenu()
    })
    this.headerEl.appendChild(this.menuBtn)
    this.menu = document.createElement(
      'm-menu-dropdown'
    )
    this.shadowRoot.appendChild(this.menu)
    this.addEventListener('click', () => { this.selected = true })
    this.addEventListener('focus', () => { this.selected = true })
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
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
        border-radius: 5px;
        background-color: rgb(212,212,216);
        align-items: center;
      }
      :host(.selected) div.header {
        background-color: rgb(15,118,110);
        color: #e7e7e7;
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
      }
      svg {
        height: 24px;
        width: 20px;
      }
    `
    this.shadowRoot.appendChild(style)
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
        this.contentEl.remove()
        this.remove()
      })
    }
    this.menu.add(this.text.rename, () => {
      this.nameEl.setAttribute('contenteditable', '')
      const range = document.createRange()
      const sel = window.getSelection()
      range.setStart(this.nameEl, this.nameEl.childNodes.length)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
      this.nameEl.focus()
    })
    this.menu.open(this.menuBtn)
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
    if (this.selected !== value) {
      if (value) {      
        this.classList.add('selected')
      } else {
        this.classList.remove('selected')
      }
      /*for (const el of [...this.parentElement.children].filter(el => el !== this)) {
        el.selected = false
      }*/
      if (this.contentEl) {
        this.contentEl.selected = value
      }
    }
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
    const contentEl = document.createElement('m-editor-file-content-view')
    tabEl.contentEl = contentEl
    contentEl.codeMirror = this.codeMirror
    const position = direction == 'left' ? 'beforebegin' : 'afterend'
    e.target.insertAdjacentElement(position, tabEl)
    //e.target.contentEl.insertAdjacentElement(position, contentEl)
    setTimeout(() => {
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
    this.listEl.replaceChildren(...value)
  }

  get selectedItem() {
    return this.listEl.querySelector('[selected]')
  }
}
```

`ExampleApp.js`

```js
export class ExampleApp extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.tabList = document.createElement('tab-list')
    this.tabList.items = ['One', 'Two', 'Three'].map(name => {
      const el = document.createElement('tab-item')
      el.name = name
      if (name === 'One') {
        el.selected = true
      }
      return el
    })
    this.shadowRoot.append(this.tabList)
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

`app.js`

```js
import {Dropdown} from "/menu/dropdown.js"
import {TabItem} from '/TabItem.js'
import {TabList} from '/TabList.js'
import {ExampleApp} from '/ExampleApp.js'

customElements.define('m-menu-dropdown', Dropdown)
customElements.define('tab-item', TabItem)
customElements.define('tab-list', TabList)
customElements.define('example-app', ExampleApp)

async function setup() {
  document.body.append(document.createElement('example-app'))
}

setup()
```
