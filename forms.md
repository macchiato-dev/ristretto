# Forms

`button-group.js`

```js
export class ButtonGroup extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: flex;
        flex-direction: row-reverse;
        gap: 5px;
      }
      button {
        font-size: 16px;
        font-family: sans-serif;
        font-weight: normal;
        background: #111;
        color: #eee;
        margin: 0;
        border: none;
        padding: 5px 10px;
        border-radius: 3px;
      }
    `
    this.shadowRoot.appendChild(style)
  }

  addButton(text, cls, handler) {
    const el = document.createElement('button')
    el.innerText = text
    el.classList.add(cls)
    el.addEventListener('click', handler)
    this.shadowRoot.appendChild(el)
    return el
  }

  addPrimary(text, handler) {
    this.primary = this.addButton(
      text, 'primary', handler
    )
  }

  addCancel(text, handler) {
    this.cancel = this.addButton(
      text, 'cancel', handler
    )
  }
}
```