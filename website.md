# Website

`notebook.json`

```json
{
  "bundleFiles": [
    ["codemirror-bundle.md", "codemirror-bundle.js"]
  ],
  "importFiles": [
    ["loader.md", "builder.js"],
    ["forms.md", "button-group.js"],
    ["code-edit.md", "code-edit.js"],
    ["menu.md", "dropdown.js"]
  ]
}
```

`overview.md`

```
# Overview

## Play

- Explore Ristretto, a web app with example data and components that work with each type of data
- Examine the iframe sandbox container which controls access to outside resources
- Upload data and interact with it using the included components
- Customize the components and build your own

## Build

- Set up playgrounds with tabbed, gist-style, and directory tree layouts
- Make API requests, function calls, and database queries with testing
- Write notebooks containing prose with embedded components
- Create chat interfaces to use with a chatbot, other people, or an AI

## Embed

- Integrate a tiny web component that wraps an iframe which loads content from Markdown
- Use different form factors, including tiny view that opens to full overlay window
- Have it load minimal data for viewing, and more data for editing
- Integrate services using Message Channels
- Save your edits using your own backend stack
```

`notebook-code.js`

```js
export class NotebookCode extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    const toolbar = document.createElement('div')
    toolbar.classList.add('toolbar')
    const selectContainer = document.createElement('div')
    const iconContainer = document.createElement('div')
    const closeBtn = document.createElement(
      'button'
    )
    closeBtn.innerHTML = this.icons.close
    closeBtn.addEventListener('click', () => {
      this.onHide()
    })
    iconContainer.append(closeBtn)
    iconContainer.classList.add('icon-container')
    toolbar.append(selectContainer, iconContainer)
    const editorContainer = document.createElement('div')
    editorContainer.classList.add('editor-container')
    this.editor = document.createElement('m-editor-code-edit')
    this.editor.fileType = 'md'
    editorContainer.append(this.editor)
    this.shadowRoot.append(toolbar, editorContainer)
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: grid;
        grid-template-rows: auto 1fr;
      }
      .toolbar {
        background: #111;
        color: #e7e7e7;
        display: grid;
        grid-template-columns: 1fr auto;
        padding: 3px;
      }
      .icon-container {
        display: flex;
      }
      .icon-container button {
        background: inherit;
        color: inherit;
        border: none;
      }
      .icon-container svg {
        height: 20px;
        width: 20px;
      }
      .editor-container {
        display: flex;
        flex-direction: column;
        align-items: flex;
        overflow-y: scroll;
      }
      .editor-container m-editor-code-edit {
        flex-grow: 1;
      }
    `
    this.shadowRoot.append(style)
  }

  set value(value) {
    this.editor.value = value
  }

  get value() {
    return this.editor.value
  }

  icons = {
    close: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/>
      </svg>
    `,
  }
}
```



`toolbar.js`

```js
export class Toolbar extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    const selectContainer = document.createElement('div')
    const iconContainer = document.createElement('div')
    const codeBtn = document.createElement(
      'button'
    )
    codeBtn.innerHTML = this.icons.code
    codeBtn.addEventListener('click', () => {
      this.onShowNotebookCode()
    })
    iconContainer.append(codeBtn)
    iconContainer.classList.add('icon-container')
    this.shadowRoot.append(selectContainer, iconContainer)
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      :host {
        background: #111;
        color: #e7e7e7;
        display: grid;
        grid-template-columns: 1fr auto;
        padding: 3px;
      }
      .icon-container {
        display: flex;
      }
      .icon-container button {
        background: inherit;
        color: inherit;
        border: none;
      }
      .icon-container svg {
        height: 20px;
        width: 20px;
      }
    `
    this.shadowRoot.append(style)
  }

  icons = {
    code: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6l6 6zm5.2 0l4.6-4.6l-4.6-4.6L16 6l6 6l-6 6z" />
      </svg>
    `,
  }
}
```

`app-view.js`

```js
import {Builder} from '/loader/builder.js'

export class AppView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.depsConfig = {bundleFiles: [], importFiles: []}
    this.notebook = this.getBlockContent('notebook.md') ?? (
      `\n\n\`app.js\`\n\n${this.fence(`document.body.innerText = 'hello'`)}`
    )
    this.loaded = false
    this.toolbar = document.createElement('m-toolbar')
    this.toolbar.onShowNotebookCode = () => {
      this.showNotebookCode()
    }
    this.viewFrame = document.createElement('iframe')
    this.viewFrame.sandbox = 'allow-scripts'
    this.shadowRoot.append(this.toolbar, this.editor, this.viewFrame)
    this.shadowRoot.addEventListener('code-input', (e) => {
      this.handleInput()
    })
    this.shadowRoot.addEventListener('input', (e) => {
      this.handleInput()
    })
  }

  connectedCallback() {
    const style = document.createElement('style')
    const globalStyle = document.createElement('style')
    globalStyle.textContent = `
      body {
        margin: 0;
        padding: 0;
      }
      html, body {
        margin: 0;
        padding: 0;
      }
      html {
        box-sizing: border-box;
      }
      *, *:before, *:after {
        box-sizing: inherit;
      }
    `
    document.head.append(globalStyle)
    style.textContent = `
      :host {
        display: grid;
        grid-template-rows: auto 1fr;
        grid-template-columns: 1fr;
        height: 100vh;
      }
      iframe {
        width: 100%;
        height: 100%;
        padding: 0;
        border: none;
      }
      .notebook-code {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
      }
    `
    this.shadowRoot.append(style)
    this.renderView()
  }

  renderView() {
    const viewFrame = document.createElement('iframe')
    viewFrame.sandbox = 'allow-scripts'
    this.shadowRoot.appendChild(viewFrame)
    this.viewFrame.remove()
    this.viewFrame = viewFrame
    this.displayNotebook()
  }

  fence(text, info = '') {
    const matches = Array.from(text.matchAll(new RegExp('^\\s*(`+)', 'gm')))
    const maxCount = matches.map(m => m[1].length).toSorted((a, b) => a - b).at(-1) ?? 0
    const quotes = '`'.repeat(Math.max(maxCount + 1, 3))
    return `\n${quotes}${info}\n${text}\n${quotes}\n`
  }

  async buildNotebook(notebook, files) {
    return ''
  }

  async showNotebookCode() {
    const value = await this.buildNotebook()
    if (!this.notebookCodeEl) {
      this.notebookCodeEl = document.createElement('m-notebook-code')
      this.notebookCodeEl.classList.add('notebook-code')
      this.notebookCodeEl.initialValue = value
      this.notebookCodeEl.value = value
      this.notebookCodeEl.onHide = () => {
        this.hideNotebookCode()
      }
      this.shadowRoot.append(this.notebookCodeEl)
    }
  }

  async hideNotebookCode() {
    if (this.notebookCodeEl) {
      if (this.notebookCodeEl.value.trim() !== this.notebookCodeEl.initialValue.trim()) {
        
      }
      this.notebookCodeEl.remove()
      this.notebookCodeEl = undefined
    }
  }
}
```

`app.js`

```js
import { ButtonGroup } from "/forms/button-group.js"
import { Dropdown } from "/menu/dropdown.js"
import { CodeEdit } from "/code-edit/code-edit.js"
import { NotebookCode } from "/notebook-code.js"
import { Toolbar } from "/toolbar.js"
import { AppView } from "/app-view.js"

customElements.define('m-forms-button-group', ButtonGroup)
customElements.define('m-menu-dropdown', Dropdown)
customElements.define('m-editor-code-edit', CodeEdit)
customElements.define('m-notebook-code', NotebookCode)
customElements.define('m-toolbar', Toolbar)
customElements.define('m-app-view', AppView)

class App {
  async run() {
    document.body.appendChild(
      document.createElement(
        'm-app-view'
      )
    )
  }
}

new App().run()
```
