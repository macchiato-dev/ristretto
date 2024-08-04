# Notebook View

This is a hybrid notebook and playground view. It's designed to support editing code blocks in a tabbed code view while viewing the content surrounding the code block in the Markdown notebook.

A view of the Markdown is being developed here. It may be moved out to a separate notebook, or perhaps components of it will be moved out but this notebook will have its own custom view component for Markdown.

TODO:

- [x] render links in Markdown
- [x] render TODO list in Markdown (at least partially)
- [x] create a new notebook for the tab components
- [x] make tabs open or switch upon clicking code block
- [x] make tabs draggable including scrolling on hover and draggable to other tab lists
- [ ] add tabs and code icon to sidebar pane
- [ ] make code icon switch left side to notebook source
- [ ] add tabs and editors to notebook source
- [ ] add individual content panes to sidebar
- [ ] make tabs draggable to a blank pane
- [ ] make it so default view opened is on bottom for app view and add code icon for opening code view (differentiated in tab)
- [ ] add main, dev, test tab and code/download buttons to sidebar
- [ ] make context menu open on right click
- [ ] give tabs close buttons

`notebook.json`

```json
{
  "bundleFiles": [
    ["codemirror-bundle.md", "codemirror-bundle.js"]
  ],
  "importFiles": [
    ["split-pane.md", "split-view.js"],
    ["tabs-new.md", "TabItem.js"],
    ["tabs-new.md", "TabList.js"],
    ["tabs-new.md", "TabGroup.js"],
    ["code-edit-new.md", "CodeEdit.js"]
  ]
}
```

This is a view of Markdown. It has an outer reader that starts with the beginning of a non-empty line. It reads named code blocks, un-named code blocks, lists, blockquotes, and finally, paragraphs.

It will need to read sub-blocks, for lists and blockquotes, and such.

Each block will optionally store its ranges for scrolling as well as error handling (currently it doesn't).

The inner reader reads inline content. This will use regexes to skip over the inline code blocks and the escaped characters. It will probably use [String.replace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace) with [String.repeat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/repeat), replacing them with some syntactically insignificant text, to skip over them, while saving the ranges. After that, the regexes will find the ranges for other inline features. CodeMirror calls these features *marks*. Once it has processed the inline content, it can be rendered, using the original text and the feature data with its ranges.

`MarkdownView.js`

```js
export class MarkdownCodeBlock extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.el = document.createElement('div')
    this.shadowRoot.append(this.el)
  }

  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
  }

  get name() {
    return this.el.innerText
  }

  set name(value) {
    this.el.innerText = value
  }

  static get styles() {
    let s; return s ?? (v => { s = new CSSStyleSheet(); s.replaceSync(v); return s })(this.stylesCss)
  }

  static stylesCss = `
    :host {
      overflow-y: auto;
      color: #eee;
    }
    div {
      padding: 5px 10px;
      cursor: pointer;
      border: 2px solid #ccc4;
      border-radius: 5px;
    }
  `
}

export class MarkdownView extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    this.shadowRoot.append(...[...this.groupBlocks(this.readBlocks(this.value))].map(block => {
      if (typeof block === 'string') {
        const headerMatch = block.match(/^(#{1,6}) /)
        const el = document.createElement(headerMatch ? `h${headerMatch[1].length}` : 'p')
        const content = block.slice(headerMatch?.[0]?.length ?? 0)
        el.append(...[...this.readInline(content)].map(block => {
          if (block.type === 'link') {
            const el = document.createElement('a')
            el.href = block.href
            el.innerText = block.value
            return el
          } else {
            return block
          }
        }))
        return el
      } else {
        const el = document.createElement('markdown-code-block')
        el.name = block.name
        el.addEventListener('click', () => {
          this.dispatchEvent(new CustomEvent('fileClick', {bubbles: true, detail: {name: el.name}}))
        })
        return el
      }
    }))
    this.shadowRoot.addEventListener('click', e => {
      if (e.target.tagName === 'A') {
        parent.postMessage(['link', e.target.href], '*')
        e.preventDefault()
        return false
      }
    })
  }

  *groupBlocks(iter) {
    let prevBlock = undefined
    for (const block of iter) {
      if (typeof block !== 'string' && block.type === 'code') {
        const match = prevBlock.match?.(/^`([^`]+)`\s*$/)
        if (match) {
          block.name = match[1]
          prevBlock = undefined
        }
      }
      if (prevBlock !== undefined) {
        yield prevBlock
      }
      prevBlock = block
    }
    if (prevBlock !== undefined) {
      yield prevBlock
    }
  }

  *readBlocks(input) {
    let s = this.constructor.trimBlankLines(input)
    for (let i=0; i < 100000; i++) {  // instead of while (true) to prevent it from crashing 💥
      const codeBlockStart = s.match(/^(`{3,})([^\n]*)/s)
      if (codeBlockStart) {
        const codeBlockEnd = s.slice(codeBlockStart[0].length).match(
          new RegExp(`\n${codeBlockStart[1]}`, 's')
        )
        if (codeBlockEnd) {
          yield {type: 'code', value: s.slice(codeBlockStart.length + 1, codeBlockStart[0].length + codeBlockEnd.index)}
          s = s.slice(codeBlockStart[0].length + codeBlockEnd.index + codeBlockEnd[0].length)
        }
      } else if (s.match(/^- /)) {
        const match = s.match(/\n/)
        if (match) {
          yield s.slice(0, match.index)
        }
        s = match ? this.constructor.trimBlankLines(s.slice(match.index)) : ''
      } else {
        const match = s.match(/\n[^\S\r\n]*\r?\n/)
        if (match) {
          yield this.constructor.removeExtraSpace(s.slice(0, match.index).trim())
          s = this.constructor.trimBlankLines(s.slice(match.index))
        } else {
          const block = this.constructor.trimBlankLines(s).trimEnd()
          if (block !== '') {
            yield this.constructor.removeExtraSpace(block)
          }
          break
        }
      }
    }
  }

  *readInline(input) {
    const result = []
    let s = input
    for (let i=0; i < 100000; i++) {
      const linkMatch = s.match(/\[([^\]]*)\]\(([^\)]*)\)/)
      if (linkMatch) {
        if (linkMatch.index > 0) {
          yield s.slice(0, linkMatch.index)
        }
        yield {type: 'link', href: linkMatch[2], value: linkMatch[1]}
        s = s.slice(linkMatch.index + linkMatch[0].length)
      } else {
        if (s.length > 0) {
          yield s
        }
        break;
      }
    }
  }

  static trimBlankLines(s) {
    return s.replace(/^(?:[^\S\r\n]*\r?\n)*/, '')
  }

  static removeExtraSpace(s) {
    return s.replaceAll(/\r?\n/g, ' ').replaceAll(/[ \t]+/g, ' ')
  }

  static get styles() {
    let s; return s ?? (v => { s = new CSSStyleSheet(); s.replaceSync(v); return s })(this.stylesCss)
  }

  static stylesCss = `
    :host {
      padding: 5px 10px;
      overflow-y: auto;
      color: #eee;
    }
    a {
      color: #aae;
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
  `
}
```

`ContentView.js`

```js
export class ContentView extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    this.split = document.createElement('split-view')
    this.split.vertical = true
    this.split.addEventListener('split-view-resize', e => {
      const y = e.detail.offsetY - this.offsetTop
      this.style.setProperty('--top-height', `${y}px`)
    })
    this.top = document.createElement('div')
    this.top.classList.add('top')
    this.topTabList = document.createElement('tab-list')
    this.top.append(this.topTabList)
    this.bottom = document.createElement('div')
    this.bottom.classList.add('bottom')
    this.bottomTabList = document.createElement('tab-list')
    this.bottom.append(this.bottomTabList)
    this.shadowRoot.append(main, this.split, this.notebookPane)
    this.shadowRoot.append(this.top, this.split, this.bottom)
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

`NotebookSourceView.js`

```js
export class NotebookSourceView extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          
        }
      `)
    }
    return this._styles
  }
}
```

`SidebarView.js`

```js
export class SidebarView extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    this.tabList = document.createElement('tab-list')
    this.tabList.tabs = ['main', 'dev', 'test'].map(name => {
      const el = document.createElement('tab-item')
      el.name = name
      return el
    })
    this.tabList.tabs[0].selected = true
    this.notebookPane = document.createElement('markdown-view')
    this.notebookPane.value = this.notebook
    this.shadowRoot.addEventListener('fileClick', e => {
      this.dispatchEvent(new CustomEvent('fileClick', {bubbles: true, detail: {...e.detail}}))
    })
    this.shadowRoot.append(this.tabList, this.notebookPane)
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: grid;
          grid-template-columns: 1fr min-content;
          grid-template-rows: minmax(20px, max-content) 1fr;
          box-sizing: border-box;
          color: #d7d7d7;
        }

        tab-list {
          padding: 3px;
        }

        markdown-view {
          grid-row: 2;
          grid-columns: 1 / 2;
          overflow: auto;
        }
      `)
    }
    return this._styles
  }
}
```

This is the notebook view. It shows content tabs in the main area and has the rendered notebook in the sidebar. When the code icon in the sidebar with the rendered notebooks is clicked, it hides the content tabs and shows the source tabs for the markdown files. When these are closed, the content tabs will be updated, if it has changed. There will be a history tab that includes everything in the notebook set. It will be able to preview and restore any history item.

`NotebookView.js`

```js
import {TabGroup} from '/tabs-new/TabGroup.js'

export class NotebookView extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    this.sidebarView = document.createElement('sidebar-view')
    this.sidebarView.notebook = this.notebook
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
    this.top = document.createElement('div')
    this.top.classList.add('top')
    this.tabGroup = new TabGroup()
    this.topTabList = document.createElement('tab-list')
    this.top.append(this.topTabList)
    this.bottom = document.createElement('div')
    this.bottom.classList.add('bottom')
    this.bottomTabList = document.createElement('tab-list')
    this.bottom.append(this.bottomTabList)
    main.append(this.top, this.mainSplit, this.bottom)
    this.shadowRoot.addEventListener('fileClick', ({detail: {name}}) => {
      const allTabs = this.topTabList.tabLists.map(tabList => [...(tabList.tabs || [])]).flat()
      const tab = allTabs.find(tab => tab.name === name)
      if (tab !== undefined) {
        tab.selected = true
      } else {
        const tab = document.createElement('tab-item')
        tab.name = name
        this.topTabList.tabs = [...(this.topTabList.tabs ?? []), tab]
        tab.selected = true
      }
    })
    this.shadowRoot.append(main, this.split, this.sidebarView)
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: grid;
          max-height: 100vh;
          border: 3px solid #273737;
          grid-template-columns: var(--main-width, 2fr) auto 1fr;
          grid-template-rows: 1fr;
          box-sizing: border-box;
          color: #d7d7d7;
        }
        sidebar-view {
          max-height: 100vh;
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
    notebookView.notebook = __source.split('---\n\n**notebook**')[1]
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

`app.js`

```js
import {SplitView} from '/split-pane/split-view.js'
import {TabItem} from '/tabs-new/TabItem.js'
import {TabList} from '/tabs-new/TabList.js'
import {MarkdownView, MarkdownCodeBlock} from '/MarkdownView.js'
import {ContentView} from '/ContentView.js'
import {NotebookSourceView} from '/NotebookSourceView.js'
import {SidebarView} from '/SidebarView.js'
import {NotebookView} from '/NotebookView.js'
import {ExampleView} from '/ExampleView.js'

customElements.define('split-view', SplitView)
customElements.define('tab-item', TabItem)
customElements.define('tab-list', TabList)
customElements.define('markdown-view', MarkdownView)
customElements.define('markdown-code-block', MarkdownCodeBlock)
customElements.define('sidebar-view', SidebarView)
customElements.define('notebook-view', NotebookView)
customElements.define('example-view', ExampleView)

const el = document.createElement('example-view')
document.body.appendChild(el)
```

## License

Icon svg in `icons`: [google material-design-icons, Apache 2.0](https://github.com/google/material-design-icons/blob/master/LICENSE)

Other content: [Apache 2.0](https://codeberg.org/macchiato/ristretto/src/branch/main/LICENSE)
