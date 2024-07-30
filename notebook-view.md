# Notebook View

This is a hybrid notebook and playground view.

`notebook.json`

```json
{
  "importFiles": [
    ["split-pane.md", "split-view.js"]
  ]
}
```

`MarkdownView.js`

```js
export class MarkdownView extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    this.shadowRoot.append(...[...this.groupBlocks(this.readBlocks(this.value))].map(block => {
      if (typeof block === 'string') {
        const headerMatch = block.match(/^(#{1,6}) /)
        const el = document.createElement(headerMatch ? `h${headerMatch[1].length}` : 'p')
        el.innerText = block.slice(headerMatch?.[0]?.length ?? 0)
        return el
      } else {
        return `A code block element goes here.`
      }
    }))
  }

  *groupBlocks(iter) {
    for (const block of iter) {
      yield block
    }
  }

  *readBlocks(input) {
    let s = input
    for (let i=0; i < 100000; i++) {  // instead of while (true) to prevent it from crashing 💥
      const codeBlockStart = s.match(/^(?:\s*\n)?(`{3,})([^\n]*)/s)
      if (codeBlockStart) {
        const codeBlockEnd = s.slice(codeBlockStart[0].length).match(
          new RegExp(`\n${codeBlockStart[1]}`, 's')
        )
        if (codeBlockEnd) {
          yield ['code', s.slice(codeBlockStart.length + 1, codeBlockStart[0].length + codeBlockEnd.index)]
          s = s.slice(codeBlockStart[0].length + codeBlockEnd.index + codeBlockEnd[0].length)
        }
      } else {
        s = s.trim()
        const index = s.indexOf('\n\n')
        if (index !== -1) {
          yield s.slice(0, index).trim()
          s = s.slice(index)
        } else {
          const block = s.trim()
          if (block !== '') {
            yield block
          }
          break
        }
      }
    }
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          padding: 5px 10px;
        }
        h1, h2, h3, h4, h5, h6 {
          font-family: sans-serif;
          font-weight: 500;
          margin: 5px 0;
        }
        h1 { font-size: 24px; }
        h2 { font-size: 21px; }
        h3 { font-size: 19px; }
        h4 { font-size: 17px; }
        h5 { font-size: 15px; font-weight: 700; }
        h6 { font-size: 12px; font-weight: 700; }
      `)
    }
    return this._styles
  }
}
```

`NotebookView.js`

```js
export class NotebookView extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    this.notebookPane = document.createElement('markdown-view')
    this.notebookPane.value = this.notebook
    this.split = document.createElement('split-view')
    this.split.addEventListener('split-view-resize', e => {
      const x = e.detail.offsetX - this.offsetLeft
      this.style.setProperty('--main-width', `${x}px`)
    })
    const main = document.createElement('main')
    this.mainSplit = document.createElement('split-view')
    this.mainSplit.vertical = true
    this.mainSplit.addEventListener('split-view-resize', e => {
      const y = e.detail.offsetY - this.offsetTop
      this.style.setProperty('--top-height', `${y}px`)
    })
    const top = document.createElement('div')
    top.classList.add('top')
    const bottom = document.createElement('div')
    bottom.classList.add('bottom')
    main.append(top, this.mainSplit, bottom)
    this.shadowRoot.append(main, this.split, this.notebookPane)
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: grid;
          height: 100vh;
          border: 3px solid #273737;
          grid-template-columns: var(--main-width, 2fr) auto 1fr;
          box-sizing: border-box;
          color: #d7d7d7;
        }
        split-view {
          background: #273737;
        }
        :host > split-view {
          min-width: 3px;
        }
        main split-view {
          min-height: 3px;
        }
        main {
          display: grid;
          grid-template-rows: var(--top-height, 1fr) auto 1fr;
        }
      `)
    }
    return this._styles
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
    const notebookView = document.createElement('notebook-view')
    const blocks = Array.from(readBlocksWithNames(__source))
    const example = __source.slice(...blocks.find(({name}) => name === 'example.md').contentRange)
    const exampleBlocks = Array.from(readBlocksWithNames(example))
    const files = Object.fromEntries(exampleBlocks.map(block => ([
      block.name,
      example.slice(...block.contentRange)
    ])))
    notebookView.notebook = files['data-cards.md']
    notebookView.devNotebook = files['data-cards.dev.md']
    notebookView.testNotebook = files['data-cards.test.md']
    this.shadowRoot.append(notebookView)
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: grid;
          height: 100vh;
          grid-template-columns: 1fr;
          grid-template-rows: 1fr;
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

`example.md`

`````md
# Example Notebook

The main notebook, the dev notebook, and the test notebook appear here.

`data-cards.md`

````md
# Data Cards

This renders some data cards.

`data-cards.js`

```js
export class DataCards extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
  }

  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
  }

  set data(data) {
    this.shadowRoot.replaceChildren(...data.slice(1).map(row => {
      const el = document.createElement('div')
      el.classList.add('card')
      const title = document.createElement('div')
      title.classList.add('title')
      title.innerText = row[0]
      const info = data[0].slice(1).map((name, i) => {
        const item = document.createElement('div')
        item.innerText = `${name}: ${row[i + 1]}`
        return item
      })
      el.append(title, ...info)
      return el
    }))
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          padding: 20px;
        }
        .card {
          background-color: #bbb;
          padding: 20px;
          border-radius: 10px;
        }
        .card .title {
          font-size: 20px;
          font-weight: bold;
        }
      `)
    }
    return this._styles
  }
}
```

The above code uses adoptedStyleSheets.

````

`data-cards.dev.md`

````md
# Data Cards: Dev


`app-view.js`

```js
export class AppView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.dataTable = document.createElement('data-cards')
    this.shadowRoot.append(this.dataTable)
    const data = this.data
    const rows = this.data.split("\n").map(row => Array.from(row.matchAll(/([^",]+)|"([^"]*)"[,$]/g)).map(m => m[2] ?? m[1]))
    this.dataTable.data = rows
  }

  connectedCallback() {
    const globalStyle = document.createElement('style')
    globalStyle.textContent = `
      body {
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

    const style = document.createElement('style')
    style.textContent = `
    `
    this.shadowRoot.append(style)
  }

  get data() {
    if (!this._data) {
      for (const block of readBlocksWithNames(__source)) {
        if (block.name === 'planets.csv') {
          this._data = __source.slice(...block.contentRange)
          return this._data
        }
      }
      for (const block of readBlocksWithNames(__source)) {
        if (block.name === 'planets.csv.md') {
          const blockContent = __source.slice(...block.contentRange)
          for (const subBlock of readBlocksWithNames(blockContent)) {
            if (subBlock.name === 'planets.csv') {
              this._data = blockContent.slice(...subBlock.contentRange)
              return this._data
            }
          }
        }
      }
    }
    return this._data
  }
}
```

`app.js`

```js
import {DataCards} from '/data-cards.js'
import {AppView} from '/app-view.js'

customElements.define('data-cards', DataCards)
customElements.define('app-view', AppView)

async function setup() {
  const appView = document.createElement('app-view')
  document.body.append(appView)
}

await setup()
```
````

`data-cards.test.md`

````md
# Data Cards: Test
````

`````

`app.js`

```js
import {SplitView} from '/split-pane/split-view.js'
import {MarkdownView} from '/MarkdownView.js'
import {NotebookView} from '/NotebookView.js'
import {ExampleView} from '/ExampleView.js'

customElements.define('split-view', SplitView)
customElements.define('markdown-view', MarkdownView)
customElements.define('notebook-view', NotebookView)
customElements.define('example-view', ExampleView)

const el = document.createElement('example-view')
document.body.appendChild(el)
```
