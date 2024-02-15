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
        margin-right: calc(
          100% - var(--anchor-right)
        );
        margin-left: auto;
        margin-bottom: auto;
        position: static;
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
      '--anchor-right', `${rect.right}px`
    )
    style.setProperty(
      '--anchor-bottom',
      `${window.scrollY + rect.bottom - 3}px`
    )
    style.setProperty(
      '--window-height', `${window.height}px`
    )
    style.setProperty(
      '--window-width', `${window.width}px`
    )
    this.dialogEl.showModal()
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
