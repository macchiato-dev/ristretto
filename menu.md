# Menu

`dropdown.js`

```js
export class Dropdown extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.dialogEl = document.createElement('dialog')
    this.dialogEl.addEventListener('click', e => {
      const rect = this.dialogEl.getBoundingClientRect()
      const clickedInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      )
      const isDialog = e.target === this.dialogEl
      if (isDialog && !clickedInDialog) {
        this.close()
      }
    })
    this.shadowRoot.appendChild(this.dialogEl)
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      dialog {
        min-width: 200px;
        border: 1px solid rgba(0, 0, 0, 0.3);
        border-radius: 6px;
        box-shadow: 0 3px 7px rgba(0, 0, 0, 0.3);
      }
      dialog {
        background: #222;
        color: #ddd;
        padding: 3px;
        margin-top: var(--anchor-bottom);
        margin-bottom: auto;
        margin-left: var(--anchor-left);
        margin-right: auto;
        position: static;
      }
      dialog.hflip {
        margin-left: auto;
        margin-right: var(--anchor-right);
      }
      dialog.vflip {
        margin-top: auto;
        margin-bottom: var(--anchor-top);
      }
      dialog.invisible {
        opacity: 0;
      }
      dialog[open] {
        display: flex;
        flex-direction: column;
      }
      dialog::backdrop {
        opacity: 0;
        top: 0;
        left: 0;
        margin: 0;
        padding: 0;
        height: var(--window-height);
        height: var(--window-width);
      }
      button {
        background: #222;
        font-size: 16px;
        border: none;
        color: inherit;
        padding: 8px 10px;
        text-align: left;
      }
    `
    this.shadowRoot.append(style)
  }

  open(anchor) {
    const rect = anchor.getBoundingClientRect()
    const style = this.shadowRoot.host.style
    style.setProperty(
      '--anchor-left', `${rect.left}px`
    )
    style.setProperty(
      '--anchor-right', `${anchor.offsetParent.clientWidth - rect.right}px`
    )
    style.setProperty(
      '--anchor-top',
      `${anchor.offsetParent.clientHeight - rect.top}px`
    )
    style.setProperty(
      '--anchor-bottom',
      `${rect.bottom}px`
    )
    style.setProperty(
      '--window-height', `${window.height}px`
    )
    style.setProperty(
      '--window-width', `${window.width}px`
    )
    this.dialogEl.classList.add('invisible')
    this.dialogEl.showModal()
    const menuRect = this.dialogEl.getBoundingClientRect()
    const hflip = rect.left + menuRect.width > anchor.offsetParent.clientWidth
    if (hflip) {
      this.dialogEl.classList.add('hflip')
      if (rect.left - menuRect.width < 0) {
        style.setProperty('--anchor-right', '5px')
      }
    } else {
      this.dialogEl.classList.remove('hflip')
    }
    const vflip = rect.top + menuRect.height > anchor.offsetParent.clientHeight
    if (vflip) {
      this.dialogEl.classList.add('vflip')
      if (rect.top - menuRect.height < 0) {
        style.setProperty('--anchor-top', '5px')
      }
    } else {
      this.dialogEl.classList.remove('vflip')
    }
    this.dialogEl.classList.remove('invisible')
  }

  close() {
    this.dialogEl.close()
  }

  clear() {
    this.dialogEl.replaceChildren()
  }

  add(text, handler = undefined) {
    const btn = document.createElement('button')
    btn.innerText = text
    this.dialogEl.appendChild(btn)
    btn.addEventListener('click', () => {
      this.close()
      if (handler !== undefined) {
        handler()
      }
    })
  }
}
```

`ExampleView.js`

```js
export class ExampleView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    const buttons = ['start', 'center', 'end'].map(v => (
      ['start', 'center', 'end'].map(h => {
        const btn = document.createElement('button')
        btn.innerText = '⬇️'
        btn.addEventListener('click', () => this.openMenu(btn))
        const btnWrap = document.createElement('div')
        btnWrap.classList.add(`v-${v}`)
        btnWrap.classList.add(`h-${h}`)
        btnWrap.append(btn)
        return btnWrap
      })
    )).flat()
    this.menu = document.createElement('m-menu-dropdown')
    this.shadowRoot.append(...buttons, this.menu)
  }

  connectedCallback() {
    const globalStyle = document.createElement('style')
    globalStyle.textContent = `
      body {
        margin: 0;
        padding: 0;
        background-color: #55391b;
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
      :host {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        grid-template-rows: 1fr 1fr 1fr;
        width: 100vw;
        height: 100vh;
        margin: 0;
        padding: 10px;
        color: #bfcfcd;
        background: #fff;
      }
      div {
        display: flex;
        flex-direction: column;
      }
      .v-start {
        justify-content: flex-start;
      }
      .v-center {
        justify-content: center;
      }
      .v-end {
        justify-content: flex-end;
      }
      .h-start {
        align-items: flex-start;
      }
      .h-center {
        align-items: center;
      }
      .h-end {
        align-items: flex-end;
      }
    `
    this.shadowRoot.append(style)
  }

  openMenu(btn) {
    this.menu.clear()
    for (const name of [
      'Test Item A', 'Item with long text here', 'Test Item A', 'Test Item A', 'Test Item A'
    ]) {
      this.menu.add(name, () => null)
    }
    this.menu.open(btn)
  }
}
```


`app.js`

```js
import {Dropdown} from '/dropdown.js'
import {ExampleView} from '/ExampleView.js'

customElements.define('m-menu-dropdown', Dropdown)
customElements.define('example-view', ExampleView)

async function setup() {
  document.body.append(document.createElement('example-view'))
}

setup()
```
