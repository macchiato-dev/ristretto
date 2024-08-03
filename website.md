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
  ],
  "dataFiles": [
    ["font.woff2.md", "font.woff2"]
  ]
}
```

`overview.md`

```md
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
    this.loaded = false
    this.toolbar = document.createElement('m-toolbar')
    this.toolbar.onShowNotebookCode = () => {
      this.showNotebookCode()
    }
    this.viewFrame = document.createElement('iframe')
    this.viewFrame.sandbox = 'allow-scripts'
    this.renderView()
    this.shadowRoot.append(this.toolbar, this.viewFrame)
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

  pages = {
    '/': 'pages/index.html',
  }

  renderPage(path = '/', output = false) {
    const pageFile = this.pages[path]
    const data = {
      'layout.html': null,
      'style.css': null,
      'app-redirect-dialog.js': null,
      [pageFile]: null,
    }
    for (const block of readBlocksWithNames(__source)) {
      if (block.name in data) {
        data[block.name] = __source.slice(...block.contentRange)
      }
    }
    let page = data['layout.html']
    page = page.replace(
      '/* {{style}} */',
      data['style.css'].replace(
        /(,)(\).*\{\{font\}\})/,
        (match, p1, p2) => {
          return p1 + Macchiato.data['font.woff2/font.woff2'].replaceAll(/\s+/g, '') + p2
        }
      )
    )
    if (path === '/' && output) {
      page = page.replace('// {{script}}', data['app-redirect-dialog.js'])
    }
    page = page.replace('<!-- {{content}} -->', data[pageFile])
    return page
  }

  renderView() {
    const viewFrame = document.createElement('iframe')
    viewFrame.sandbox = 'allow-scripts'
    viewFrame.srcdoc = this.renderPage()
    this.shadowRoot.appendChild(viewFrame)
    this.viewFrame.remove()
    this.viewFrame = viewFrame
  }

  fence(text, info = '') {
    const matches = Array.from(text.matchAll(new RegExp('^\\s*(`+)', 'gm')))
    const maxCount = matches.map(m => m[1].length).toSorted((a, b) => a - b).at(-1) ?? 0
    const quotes = '`'.repeat(Math.max(maxCount + 1, 3))
    return `\n${quotes}${info}\n${text}\n${quotes}\n`
  }

  async buildNotebook() {
    const pages = Object.entries(this.pages).map(([path, file]) => (
      `\`${file.replace('pages/', '')}\`\n${this.fence(this.renderPage(path, true), 'html')}`
    ))
    return '# Output\n\n' + pages.join('\n') + '\n\n'
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

`layout.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" type="image/png" href="/favicon.png" />
<style>
/* {{style}} */
</style>
<script type="module">
// {{script}}
</script>
</head>
<body>
  <main>
    <!-- {{content}} -->
  </main>
  <aside>
    <nav aria-label="primary">
      <ul>
        <li><a href="/">Home</a></li>
      </ul>
    </nav>
  </aside>
  <app-redirect-dialog></app-redirect-dialog>
</body>
</html>
```


`style.css`

```css
body {
  background: #2d1d0e;
  display: flex;
  flex-direction: row-reverse;
  align-items: stretch;
  margin: 0;
  padding: 0;
  color: #eee;
  min-height: 100vh;
  box-sizing: border-box;
  font-family: sans-serif;
}
*, *::before, *::after {
  box-sizing: inherit;
}
main {
  flex-grow: 1;
}
aside {
  width: 280px;
  background-color: #57391b;
}
nav ul {
  list-style-type: none;
  padding: 0;
}
nav {
  padding: 20px;
  font-size: 24px;
}
nav a {
  color: inherit;
  text-decoration: none;
}
nav a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}
@font-face {
  font-family: 'Mohave';
  font-display: block;
  src: url(data:application/octet-stream;base64,) format(woff2) /* {{font}} */;
}
h1 {
  color: #fff596;
  text-align: center;
  font-size: 48px;
  letter-spacing: 2px;
  font-family: Mohave;
}
```


`app-redirect-dialog.js`

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
        margin-left: auto;
        margin-right: auto;
        background: #ccc;
        border: 5px solid #222;
        border-radius: 5px;
        color: #111;
        max-height: 60vh;
        max-width: 85vh;
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

customElements.define('app-redirect-dialog', AppRedirectDialog)

document.addEventListener('DOMContentLoaded', () => {
  const notebookPresent = !!localStorage.getItem('rco/settings/color-scheme')
  if (!notebookPresent) {
    localStorage.setItem('rco/showNotebookMessage', 'false')
  }
  const showNotebookMessageIsFalse = localStorage.getItem('rco/showNotebookMessage') === 'false'
  const dialog = document.querySelector('app-redirect-dialog')
  dialog.addEventListener('dont-show-again', () => {
    localStorage.setItem('rco/showNotebookMessage', 'false')
  })
  dialog.run({notebookPresent, showNotebookMessageIsFalse})
})
```


`pages/index.html`

```html
<h1>macchiato.dev</h1>
<p></p>
```

## License

Icon svg in `icons`: [google material-design-icons, Apache 2.0](https://github.com/google/material-design-icons/blob/master/LICENSE)

Other content: [Apache 2.0](https://codeberg.org/macchiato/ristretto/src/branch/main/LICENSE)

