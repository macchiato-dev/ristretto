# Notebook View

This is a hybrid notebook and playground view. It's designed to support editing code blocks in a tabbed code view while viewing the content surrounding the code block in the Markdown notebook.

A view of the Markdown is being developed here. It may be moved out to a separate notebook, or perhaps components of it will be moved out but this notebook will have its own custom view component for Markdown.

TODO:

- [x] render links in Markdown
- [x] render TODO list in Markdown (at least partially)
- [x] create a new notebook for the tab components
- [x] make tabs open or switch upon clicking code block
- [x] make tabs draggable including scrolling on hover and draggable to other tab lists
- [x] add tabs and code icon to sidebar pane
- [x] make code icon switch left side to notebook source
- [x] add tabs and editors to notebook source
- [x] add individual content panes to sidebar
- [ ] make files open, not just tabs, when clicking a file
- [ ] make content files show according to selected tab
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
  ],
  "updateFrequency": 8000
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
    this.counter = 0
    this.attachShadow({mode: 'open'})
    const div = document.createElement('div')
    this.el = document.createElement('span')
    div.append(this.el)
    this.shadowRoot.append(div)
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

  get content() {
    return this._content
  }

  set content(value) {
    this._content = value
  }

  static get styles() {
    let s; return s ?? (v => { s = new CSSStyleSheet(); s.replaceSync(v); return s })(this.stylesCss)
  }

  static stylesCss = `
    :host {
      color: #eee;
      box-sizing: border-box;
    }
    *, *:before, *:after {
      box-sizing: inherit;
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
  constructor() {
    super()
    this.codeBlockData = []
    this.codeBlockViews = new WeakMap()
  }

  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    this.render()
    this.shadowRoot.addEventListener('click', e => {
      if (e.target.tagName === 'A') {
        parent.postMessage(['link', e.target.href], '*')
        e.preventDefault()
        return false
      }
    })
  }

  render() {
    const blocks = Array.from(this.updateCodeBlocks(this.groupBlocks(this.readBlocks(this.value))))
    this.shadowRoot.replaceChildren(...blocks.map(block => {
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
        const el = this.codeBlockViews.get(block)
        if (el !== undefined) {
          el.name = block.name
          el.content = block.content
          return el
        } else {
          const el = document.createElement('markdown-code-block')
          el.name = block.name
          el.content = block.content
          el.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('fileClick', {bubbles: true, detail: el}))
          })
          this.codeBlockViews.set(block, el)
          return el
        }
      }
    }))
  }

  *updateCodeBlocks() {
    let codeBlockData = [...this.codeBlockData]
    let updatedCodeBlocks = []
    for (const block of this.groupBlocks(this.readBlocks(this.value))) {
      if (block?.type === 'code' && block.name !== undefined) {
        const codeBlock = codeBlockData.find(cb => cb.name === block.name) ?? codeBlockData.find(cb => cb.content === block.content)
        if (codeBlock) {
          codeBlock.name = block.name
          codeBlock.content = block.content
          yield codeBlock
          codeBlockData.splice(codeBlockData.indexOf(codeBlock), 1)
          updatedCodeBlocks.push(codeBlock)
        } else {
          yield block
          updatedCodeBlocks.push(block)
        }
      } else {
        yield block
      }
    }
    this.codeBlockData = [...updatedCodeBlocks, ...codeBlockData]
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
      const codeBlockStart = s.match(/^(`{3,})([^\n]*)\n/s)
      if (codeBlockStart) {
        const codeBlockEnd = s.slice(codeBlockStart.index + codeBlockStart[0].length).match(
          new RegExp(`\n${codeBlockStart[1]}`, 's')
        )
        if (codeBlockEnd) {
          yield {
            type: 'code',
            content: s.slice(
              codeBlockStart.index + codeBlockStart[0].length,
              codeBlockStart.index + codeBlockStart[0].length + codeBlockEnd.index
            )
          }
          s = s.slice(
            codeBlockStart.index + codeBlockStart[0].length + codeBlockEnd.index + codeBlockEnd[0].length
          )
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

  set value(value) {
    this._value = value
    Array.from(this.updateCodeBlocks())
    if (this.shadowRoot) {
      if (this.renderTimeout === undefined) {
        this.renderTimeout = setTimeout(() => {
          this.renderTimeout = undefined
          this.render()
        }, 1000)
      }
    }
  }

  get value() {
    return this._value
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
      overflow: auto;
      scrollbar-color: #49cff1 #0000;
      scrollbar-width: thin;
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
  constructor() {
    super()
    this.codeViews = {}
  }

  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    this.split = document.createElement('split-view')
    this.split.vertical = true
    this.split.addEventListener('split-view-resize', e => {
      const y = e.detail.offsetY - this.offsetTop
      this.style.setProperty('--top-area-height', `${y}px`)
    })
    this.topArea = document.createElement('div')
    this.topArea.classList.add('top-area')
    this.topTabList = document.createElement('tab-list')
    this.topArea.append(this.topTabList)
    this.bottomArea = document.createElement('div')
    this.bottomArea.classList.add('bottom-area')
    this.bottomTabList = document.createElement('tab-list')
    this.bottomArea.append(this.bottomTabList)
    this.addEventListener('fileClick', ({detail: markdownCodeBlock}) => {
      const allTabs = this.topTabList.tabLists.map(tabList => [...(tabList.tabs || [])]).flat()
      let tab = allTabs.find(tab => tab.name === markdownCodeBlock.name)
      if (tab !== undefined) {
        tab.selected = true
      } else {
        tab = document.createElement('tab-item')
        tab.name = markdownCodeBlock.name
        this.topTabList.tabs = [...(this.topTabList.tabs ?? []), tab]
        tab.selected = true
      }
      this.showTab(tab, markdownCodeBlock)
    })
    this.shadowRoot.append(this.topArea, this.split, this.bottomArea)
  }

  showTab(tab, markdownCodeBlock = undefined) {
    const area = tab.tabList === this.bottomTabList ? this.bottomArea : this.topArea
    if (!(tab.name in this.codeViews)) {
      const el = document.createElement('code-edit')
      el.fileType = tab.name.match(/\.([^.]+)/)[1]
      el.dark = true
      el.value = markdownCodeBlock.content
      el.addEventListener('codeInput', () => {
        this.dispatchEvent(new CustomEvent('codeInput', {detail: {name}}))
      })
      this.codeViews[tab.name] = el
      area.append(el)
    }
    tab.selected = true
    for (const t of tab.tabList.tabs) {
      this.codeViews[t.name].classList.toggle('selected', t === tab)
    }
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: grid;
          grid-template-rows: var(--top-area-height, 50%) min-content 1fr;
          box-sizing: border-box;
          color: #d7d7d7;
        }
        tab-list {
          padding: 3px;
        }
        split-view {
          background: #273737;
        }
        :host > split-view {
          min-height: 3px;
        }
        .top-area, .bottom-area {
          display: grid;
          grid-template-columns: 1fr;
          grid-template-rows: min-content 1fr;
        }
        code-edit {
          overflow: auto;
        }
        code-edit:not(.selected) {
          display: none;
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
    this.tabList = document.createElement('tab-list')
    this.tabList.tabs = this.notebooks.map(({name}) => {
      const el = document.createElement('tab-item')
      el.name = name
      return el
    })
    this.tabList.tabs[0].selected = true
    this.tabList.addEventListener('select-item', () => {
      const selectedTab = this.tabList.shadowRoot.querySelector('.selected')
      const selectedView = Object.values(this.codeViews).find(el => el.classList.contains('selected'))
      selectedView.classList.remove('selected')
      this.codeViews[selectedTab.name].classList.add('selected')
    })
    this.codeViews = Object.fromEntries(this.notebooks.map(({name, content}) => {
      const el = document.createElement('code-edit')
      el.fileType = 'md'
      el.lineWrapping = true
      el.lineNumbers = false
      el.dark = true
      el.value = content
      el.addEventListener('codeInput', () => {
        this.dispatchEvent(new CustomEvent('codeInput', {detail: {name}}))
      })
      return [name, el]
    }))
    this.codeViews[this.notebooks[0].name].classList.add('selected')
    this.shadowRoot.append(this.tabList, ...Object.values(this.codeViews))
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: grid;
          grid-template-rows: min-content 1fr;
          grid-template-columns: 1fr;
        }
        tab-list {
          padding: 3px;
        }
        code-edit {
          overflow: auto;
        }
        code-edit:not(.selected) {
          display: none;
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
  constructor() {
    super()
    this.timeouts = {}
  }

  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    this.tabList = document.createElement('tab-list')
    this.tabList.tabs = this.notebooks.map(({name}) => {
      const el = document.createElement('tab-item')
      el.name = name
      return el
    })
    this.tabList.tabs[0].selected = true
    this.tabList.addEventListener('select-item', () => {
      const selectedTab = this.tabList.shadowRoot.querySelector('.selected')
      const selectedView = Object.values(this.markdownViews).find(el => el.classList.contains('selected'))
      selectedView.classList.remove('selected')
      this.markdownViews[selectedTab.name].classList.add('selected')
    })
    this.notebooksByName = Object.fromEntries(this.notebooks.map(notebook => [notebook.name, notebook]))
    this.markdownViews = Object.fromEntries(this.notebooks.map(({name, content}) => {
      const el = document.createElement('markdown-view')
      el.value = content
      return [name, el]
    }))
    this.markdownViews[this.notebooks[0].name].classList.add('selected')
    this.shadowRoot.addEventListener('fileClick', ({detail}) => {
      this.dispatchEvent(new CustomEvent('fileClick', {bubbles: true, detail}))
    })
    this.notebookSourceView.addEventListener('codeInput', ({detail: {name}}) => {
      this.notebooksByName[name].content = this.notebookSourceView.codeViews[name].value
      this.markdownViews[name].value = this.notebooksByName[name].content
    })
    const iconContainer = document.createElement('div')
    const downloadBtn = document.createElement('button')
    downloadBtn.innerHTML = this.icons.download
    downloadBtn.addEventListener('click', () => {
      
    })
    const codeBtn = document.createElement('button')
    codeBtn.innerHTML = this.icons.code
    codeBtn.addEventListener('click', () => {
      codeBtn.classList.toggle('on')
      const parent = this.getRootNode().host
      parent.classList.toggle('source')
    })
    iconContainer.append(downloadBtn, codeBtn)
    iconContainer.classList.add('icon-container')
    this.shadowRoot.append(this.tabList, iconContainer, ...Object.values(this.markdownViews))
  }

  icons = {
    download: `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
        <path fill="currentColor" d="M4 22v-2h16v2zm8-4L5 9h4V2h6v7h4z"/>
      </svg>
    `,
    code: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6l6 6zm5.2 0l4.6-4.6l-4.6-4.6L16 6l6 6l-6 6z" />
      </svg>
    `,
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: grid;
          grid-template-columns: 1fr min-content;
          grid-template-rows: minmax(20px, min-content) 1fr;
          box-sizing: border-box;
          color: #d7d7d7;
          padding-bottom: 3px;
        }
        *, *:before, *:after {
          box-sizing: inherit;
        }
        tab-list {
          padding: 3px;
        }
        markdown-view {
          grid-row: 2;
          grid-column: 1 / span 2;
        }
        markdown-view:not(.selected) {
          display: none;
        }
        .icon-container {
          display: flex;
          gap: 2px;
          padding: 2px 5px;
        }
        .icon-container button {
          all: inherit;
          padding: 3px 3px;
          color: #a7a7a7;
          border: none;
          cursor: pointer;
          border-radius: 5px;
        }
        .icon-container button:hover {
          color: #d7d7d7;
        }
        .icon-container button.on {
          background: #ccc7;
          color: #d7d7d7;
        }
        .icon-container button.on:hover {
          background: #ccc8;
          color: #f7f7f7;
        }
        .icon-container svg {
          height: 20px;
          width: 20px;
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
    this.sidebarView.notebooks = this.notebooks
    this.split = document.createElement('split-view')
    this.split.addEventListener('split-view-resize', e => {
      const x = e.detail.offsetX - this.offsetLeft
      this.style.setProperty('--main-width', `${x}px`)
    })
    this.contentView = document.createElement('content-view')
    this.notebookSourceView = document.createElement('notebook-source-view')
    this.notebookSourceView.notebooks = this.notebooks
    this.sidebarView.notebookSourceView = this.notebookSourceView
    this.sidebarView.contentView = this.contentView
    this.contentView.sidebarView = this.sidebarView
    this.notebookSourceView.sidebarView = this.sidebarView
    this.shadowRoot.addEventListener('fileClick', ({detail}) => {
      this.contentView.dispatchEvent(new CustomEvent('fileClick', {detail}))
    })
    this.shadowRoot.append(this.contentView, this.notebookSourceView, this.split, this.sidebarView)
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: grid;
          grid-template-columns: var(--main-width, 2fr) auto 1fr;
          grid-template-rows: 1fr;
          color: #d7d7d7;
          box-sizing: border-box;
        }
        *, *:before, *:after {
          box-sizing: inherit;
        }
        content-view {
          height: 100vh;
          max-height: 100vh;
          border: 3px solid #273737;
          border-right: none;
        }
        :host(.source) content-view {
          display: none;
        }
        notebook-source-view {
          height: 100vh;
          max-height: 100vh;
          border: 3px solid #273737;
          border-right: none;
        }
        :host(:not(.source)) notebook-source-view {
          display: none;
        }
        sidebar-view {
          height: 100vh;
          max-height: 100vh;
          border: 3px solid #273737;
          border-left: none;
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
    notebookView.notebooks = [
      {
        name: 'main',
        content: __source.split('---\n\n**notebook**')[1].trim(),
      },
      {
        name: 'dev',
        content: '',
      },
      {
        name: 'test',
        content: '',
      },
    ]
    this.shadowRoot.append(notebookView)
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: grid;
          grid-template-columns: 1fr;
          grid-template-rows: 1fr;
          box-sizing: border-box;
        }
        *, *:before, *:after {
          box-sizing: inherit;
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
          display: grid;
          margin: 0;
          max-height: 100vh;
          grid-template-columns: 1fr;
          grid-template-rows: 1fr;
          box-sizing: border-box;
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
import {CodeEdit} from "/code-edit-new/CodeEdit.js"

customElements.define('split-view', SplitView)
customElements.define('tab-item', TabItem)
customElements.define('tab-list', TabList)
customElements.define('code-edit', CodeEdit)
customElements.define('markdown-view', MarkdownView)
customElements.define('markdown-code-block', MarkdownCodeBlock)
customElements.define('content-view', ContentView)
customElements.define('notebook-source-view', NotebookSourceView)
customElements.define('sidebar-view', SidebarView)
customElements.define('notebook-view', NotebookView)
customElements.define('example-view', ExampleView)

const el = document.createElement('example-view')
document.body.appendChild(el)
```

## License

Icon svg in `icons`: [google material-design-icons, Apache 2.0](https://github.com/google/material-design-icons/blob/master/LICENSE)

Other content: [Apache 2.0](https://codeberg.org/macchiato/ristretto/src/branch/main/LICENSE)
