# Menu

`dropdown.js`

```js
export class Dropdown extends HTMLElement {
  constructor() {
    super()
    this.alignX = 'right'
    this.alignY = 'bottom'
    this.offsetX = 0
    this.offsetY = 5
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
      :host {
        font-family: ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif;
      }
      dialog {
        border-radius: 6px;
        border: none;
        box-shadow: rgba(25, 25, 25, 0.15) 1.95px 1.95px 2.6px;
      }
      dialog {
        background: #373740e7;
        color: #b7b7b7;
        padding: 3px;
        margin-left: var(--dialog-left);
        margin-right: var(--dialog-right);
        margin-top: var(--dialog-top);
        margin-bottom: var(--dialog-bottom);
        position: static;
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
        all: unset;
        font-size: 16px;
        border: none;
        color: inherit;
        padding: 5px 8px;
        text-align: left;
      }
      button:hover {
        background: #99b3;
        color: #d7d7d7;
      }
    `
    this.shadowRoot.append(style)
  }

  open(anchor) {
    const _rect = anchor.getBoundingClientRect()
    const rect = {
      left: _rect.left - this.offsetX,
      right: _rect.right + this.offsetX,
      width: _rect.width + 2 * this.offsetX,
      top: _rect.top - this.offsetY,
      bottom: _rect.bottom + this.offsetY,
      height: _rect.height + 2 * this.offsetY,
    }
    this.dialogEl.classList.add('invisible')
    this.dialogEl.showModal()
    const menuRect = this.dialogEl.getBoundingClientRect()
    const style = this.shadowRoot.host.style
    const fitsLeft = rect.left + menuRect.width + 5 < window.innerWidth
    const fitsRight = rect.right - menuRect.width - 5 > 0
    if (this.alignX === 'center') {
      const center = Math.round(rect.left + rect.width / 2)
      const leftSpace = center - menuRect.width / 2 - 5
      const rightSpace = window.innerWidth - center - menuRect.width / 2 - 5
      if (leftSpace < rightSpace) {
        style.setProperty('--dialog-left', `${Math.max(5, leftSpace)}px`)
        style.setProperty('--dialog-right', 'auto')
      } else {
        style.setProperty('--dialog-left', 'auto')
        style.setProperty('--dialog-right', `${Math.max(5, rightSpace)}px`)
      }
    } else if (
      (this.alignX === 'left' && (fitsLeft || !fitsRight)) ||
      (this.alignX === 'right' && (!fitsRight && fitsLeft))
    ) {
      style.setProperty('--dialog-left', `${Math.max(5, rect.left)}px`)
      style.setProperty('--dialog-right', 'auto')
    } else if (this.alignX === 'left' || this.alignX == 'right') {
      style.setProperty('--dialog-left', 'auto')
      style.setProperty('--dialog-right', `${Math.max(5, window.innerWidth - rect.right)}px`)
    } else {
      style.setProperty('--dialog-left', 'auto')
      style.setProperty('--dialog-right', 'auto')
    }
    const fitsTop = rect.bottom + menuRect.height + 5 < window.innerHeight
    const fitsBottom = rect.top - menuRect.height - 5 > 0
    if (
      (this.alignY === 'top' && (fitsTop || !fitsBottom)) ||
      (this.alignY === 'bottom' && (!fitsBottom && fitsTop))
    ) {
      style.setProperty('--dialog-top', `${rect.bottom}px`)
      style.setProperty('--dialog-bottom', 'auto')
    } else if (this.alignY === 'top' || this.alignY == 'bottom') {
      style.setProperty('--dialog-top', 'auto')
      style.setProperty('--dialog-bottom', `${fitsBottom ? window.innerHeight - rect.top : 5}px`)
    } else {
      style.setProperty('--dialog-left', 'auto')
      style.setProperty('--dialog-right', 'auto')
    }
    style.setProperty(
      '--window-height', `${window.innerHeight}px`
    )
    style.setProperty(
      '--window-width', `${window.innerWidth}px`
    )
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
        background: #000;
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
    //this.menu.alignX = 'center'
    //this.menu.offsetY = 0
    for (const name of [
      'Test Item A', 'Item with long text here', 'Test Item B', 'Test Item C', 'Test Item D'
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
