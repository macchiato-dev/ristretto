# App Redirect Dialog

`AppRedirectDialog.js`

```js
export class AppRedirectDialog extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.dontShowAgain = false
    this.dialogEl = document.createElement('dialog')
    const title = document.createElement('h1')
    title.innerText = 'Notebook Data Found'
    const text1 = document.createElement('p')
    text1.innerText = (
      'The previous site at this domain, a side by side markdown editing notebook, ' +
      'has been replaced with a new page about the macchiato.dev project.'
    )
    const text2 = document.createElement('p')
    text2.innerText = 'The notebook has moved to:'
    const link = document.createElement('a')
    link.setAttribute('href', 'https://notebook.macchiato.dev/')
    link.setAttribute('target', '_blank')
    link.innerText = 'https://notebook.macchiato.dev/'
    const linkRow = document.createElement('div')
    linkRow.append(link)
    linkRow.classList.add('link')
    const text3 = document.createElement('p')
    text3.innerText = "Any data stored in the browser's local storage area related to the notebook may be found there."
    const dontShowCheckRow = document.createElement('div')
    const checkLabel = document.createElement('label')
    const checkInput = document.createElement('input')
    checkInput.setAttribute('type', 'checkbox')
    const checkTextEl = document.createElement('span')
    checkTextEl.innerText = "Don't show this dialog again"
    checkLabel.append(checkInput, checkTextEl)
    checkInput.checked = this.dontShowAgain
    checkInput.addEventListener('input', ({target: {checked}}) => {
      this.dontShowAgain = checked
    })
    dontShowCheckRow.append(checkLabel)
    const btn = document.createElement('button')
    btn.innerText = 'Close'
    btn.addEventListener('click', () => {
      if (this.dontShowAgain) {
        this.dispatchEvent(new CustomEvent('dont-show-again', {bubbles: true}))
      }
      this.dialogEl.close()
    })
    const btnRow = document.createElement('div')
    btnRow.classList.add('btn-row')
    btnRow.append(btn)
    this.dialogEl.append(title, text1, text2, linkRow, text3, dontShowCheckRow, btnRow)
    this.shadowRoot.append(this.dialogEl)
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      dialog {
        margin-top: 5vh;
        margin-left: 5vw;
        margin-right: 5vw;
        background: #ccc;
        border: 5px solid #222;
        border-radius: 5px;
        color: #111;
        max-height: 60vh;
        overflow: auto;
      }
      a {
        color: #115;
        font-size: 140%;
      }
      .btn-row {
        display: flex;
        justify-content: center;
      }
    `
    this.shadowRoot.appendChild(style)
  }

  run(data) {
    if (data.notebookPresent && !data.showNotebookMessageIsFalse) {
      this.dialogEl.showModal()
    }
  }
}
```

`ExampleApp.js`

```js
export class ExampleApp extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.params = {notebookPresent: false, showNotebookMessageIsFalse: false}
    const inputRows = ['notebookPresent', 'showNotebookMessageIsFalse'].map(name => {
      const el = document.createElement('div')
      const label = document.createElement('label')
      const input = document.createElement('input')
      input.setAttribute('type', 'checkbox')
      const nameEl = document.createElement('span')
      nameEl.innerText = name
      label.append(input, nameEl)
      input.addEventListener('input', ({target: {checked}}) => {
        this.params[name] = checked
      })
      el.append(label)
      return el
    })
    const buttonRow = document.createElement('div')
    const btn = document.createElement('button')
    btn.innerText = 'Run'
    btn.addEventListener('click', () => {
      this.message.innerText = ''
      this.run()
    })
    buttonRow.append(btn)
    this.message = document.createElement('p')
    this.dialog = document.createElement('app-redirect-dialog')
    this.dialog.addEventListener('dont-show-again', () => {
      this.message.innerText = "Don't show again."
    })
    this.shadowRoot.append(...inputRows, buttonRow, this.dialog, this.message)
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      :host {
        color: #eee;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
    `
    this.shadowRoot.appendChild(style)
  }

  run() {
    this.dialog.run(this.params)
  }
}
```

`app.js`

```js
import {AppRedirectDialog} from '/AppRedirectDialog.js'
import {ExampleApp} from '/ExampleApp.js'

customElements.define('app-redirect-dialog', AppRedirectDialog)
customElements.define('example-app', ExampleApp)

const el = document.createElement('example-app')
document.body.appendChild(el)
```
