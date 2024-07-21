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

`NotebookView.js`

```js
export class NotebookView extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    this.notebookPane = document.createElement('aside')
    this.notebookPane.innerText = this.notebook
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
    notebookView.notebook = files['my-component.md']
    notebookView.devNotebook = files['my-component.dev.md']
    notebookView.testNotebook = files['my-component.test.md']
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

`my-component.md`

````md
# My Component
````

`my-component.dev.md`

````md
# My Component: Dev
````

`my-component.test.md`

````md
# My Component: Test
````

`````

`app.js`

```js
import {SplitView} from '/split-pane/split-view.js'
import {NotebookView} from '/NotebookView.js'
import {ExampleView} from '/ExampleView.js'

customElements.define('split-view', SplitView)
customElements.define('notebook-view', NotebookView)
customElements.define('example-view', ExampleView)

const el = document.createElement('example-view')
document.body.appendChild(el)
```
