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
- [x] make files open, not just tabs, when clicking a file
- [x] make content files show according to selected tab
- [x] make tabs draggable to a blank pane
- [ ] make it so default view opened is on bottom for app view and add code icon for opening code view (differentiated in tab)
- [x] add main, dev, test tab and code/download buttons to sidebar
- [x] give tabs close buttons
- [ ] save tab state in notebook.json

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
    this.div = document.createElement('div')
    this.nameEl = document.createElement('button')
    this.nameEl.classList.add('name')
    this.div.append(this.nameEl)
    this.shadowRoot.append(this.div)
  }

  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
  }

  get name() {
    return this.nameEl.innerText
  }

  set name(value) {
    this.nameEl.innerText = value
    if (this.name === 'app.js') {
      if (!this.viewButton) {
        this.viewButton = document.createElement('button')
        this.viewButton.innerText = '👁️'
        this.viewButton.classList.add('view')
        this.div.append(this.viewButton)
      }
    } else {
      if (this.viewButton) {
        this.viewButton.remove()
        this.viewButton = undefined
      }
    }
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
      display: flex;
      flex-direction: row;
      padding: 5px 10px;
      cursor: pointer;
      border: 2px solid #ccc4;
      border-radius: 5px;
      margin-top: 8px;
      margin-bottom: 8px;
    }
    button {
      all: unset;
    }
    .name {
      flex-grow: 1;
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
      if (block.type === 'text') {
        const headerMatch = block.content.match(/^(#{1,6}) /)
        const el = document.createElement(headerMatch ? `h${headerMatch[1].length}` : 'p')
        const content = block.content.slice(headerMatch?.[0]?.length ?? 0)
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
          el.contentRange = block.contentRange
          el.blockRange = block.blockRange
          el.info = block.info
          return el
        } else if (block.type === 'code') {
          const el = document.createElement('markdown-code-block')
          el.name = block.name
          el.content = block.content
          el.contentRange = block.contentRange
          el.blockRange = block.blockRange
          el.info = block.info
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
        const codeBlock = (
          codeBlockData.find(cb => cb.name === block.name) ??
          codeBlockData.find(cb => cb.content === block.content)
        )
        if (codeBlock) {
          codeBlock.name = block.name
          codeBlock.content = block.content
          codeBlock.contentRange = block.contentRange
          codeBlock.blockRange = block.blockRange
          codeBlock.info = block.info
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
      if (block.type === 'code' && prevBlock?.type === 'text') {
        const match = prevBlock.content.match?.(/^`([^`]+)`\s*$/)
        if (match) {
          block.name = match[1]
          block.nameBlock = prevBlock
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
    const {skipBlankLines} = this.constructor.patterns
    let pos = input.match(skipBlankLines)?.[0]?.length ?? 0
    for (let i=0; i < 100000; i++) {  // instead of while (true) to prevent it from crashing 💥
      const codeBlockStart = input.slice(pos).match(/^(`{3,})([^\n]*)\n/s)
      if (codeBlockStart) {
        const codeBlockEnd = input.slice(pos + codeBlockStart.index + codeBlockStart[0].length).match(
          new RegExp(`\n${codeBlockStart[1]}[ \t]*(?:$|\n)`)
        )
        if (codeBlockEnd) {
          yield {
            type: 'code',
            content: input.slice(
              pos + codeBlockStart.index + codeBlockStart[0].length,
              pos + codeBlockStart.index + codeBlockStart[0].length + codeBlockEnd.index,
            ),
            contentRange: [
              pos + codeBlockStart.index + codeBlockStart[0].length,
              pos + codeBlockStart.index + codeBlockStart[0].length + codeBlockEnd.index,
            ],
            range: [
              pos + codeBlockStart.index + codeBlockStart[0].length + codeBlockEnd.index,
              pos + codeBlockStart.index + codeBlockStart[0].length + codeBlockEnd.index + codeBlockEnd[0].length,
            ],
            info: codeBlockStart[1],
          }
          pos += codeBlockStart.index + codeBlockStart[0].length + codeBlockEnd.index + codeBlockEnd[0].length
          pos += input.slice(pos).match(skipBlankLines)?.[0]?.length ?? 0
          continue
        }
      }

      if (input.slice(pos).match(/^- /)) {
        const match = input.slice(pos).match(/\n/)
        if (match) {
          yield {
            type: 'text',
            content: input.slice(pos, pos + match.index),
            range: [pos, pos + match.index],
          }
          pos += match.index + (input.slice(pos + match.index).match(skipBlankLines)?.[0]?.length ?? 0)
          continue
        }
      }

      const match = input.slice(pos).match(/\n[^\S\r\n]*\r?\n/)
      if (match) {
        yield {
          type: 'text',
          content: this.constructor.removeExtraSpace(input.slice(pos, pos + match.index).trim()),
          range: [pos, pos + match.index],
        }
        pos += match.index + (input.slice(pos + match.index).match(skipBlankLines)?.[0]?.length ?? 0)
        continue
      }

      const remaining = input.slice(pos).trimEnd()
      if (remaining !== '') {
        yield {
          type: 'text',
          content: this.constructor.removeExtraSpace(remaining),
          range: [pos, input.length],
        }
      }
      break
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

  updateFromContentViews() {
    const codeBlocks = [...this.shadowRoot.children].filter(el => el.tagName === 'MARKDOWN-CODE-BLOCK').toReversed()
    let updated = this.value
    let updateCount = 0
    console.log(codeBlocks)
    for (const codeBlock of codeBlocks) {
      const currentValue = this.value.slice(...codeBlock.contentRange)
      if (codeBlock.codeEdit) {
        const newValue = codeBlock.codeEdit.value
        if (currentValue !== newValue) {
          // TODO: fence code block (allowing change in number of backquotes)
          // TODO: partial codemirror update
          updated = updated.slice(0, codeBlock.contentRange[0]) + newValue + updated.slice(codeBlock.contentRange[1])
          updateCount += 1
        }
      }
    }
    if (updateCount > 0) {
      console.log(`Making ${updateCount} updates to ${this.name} notebook`)
    }
    this.codeEdit.value = updated
  }

  updateContentViews(foundTabs) {
    const codeBlocks = [...this.shadowRoot.children].filter(el => el.tagName === 'MARKDOWN-CODE-BLOCK')
    for (const codeBlock of codeBlocks) {
      if (codeBlock.tab) {
        foundTabs.add(codeBlock.tab)
        if (codeBlock.tab.name !== codeBlock.name) {
          codeBlock.tab.name = codeBlock.name
        }
      }
      if (codeBlock.codeEdit) {
        if (codeBlock.codeEdit.value !== codeBlock.content) {
          codeBlock.codeEdit.value = codeBlock.content
        }
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

  static patterns = {
    skipBlankLines: /^(?:[^\S\r\n]*\r?\n)*/,
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
    const {TabGroup} = customElements.get('tab-list')
    this.tabGroup = new TabGroup()
    this.topArea = document.createElement('div')
    this.topArea.classList.add('top-area')
    this.topTabList = document.createElement('tab-list')
    this.topTabBlankArea = document.createElement('div')
    this.topTabBlankArea.classList.add('drop')
    this.topTabList.appendDropArea = this.topTabBlankArea
    this.topTabList.tabGroup = this.tabGroup
    this.topAreaHeader = document.createElement('div')
    this.topAreaHeader.classList.add('header')
    this.topAreaHeader.append(this.topTabList, this.topTabBlankArea)
    this.topArea.append(this.topAreaHeader)
    this.bottomArea = document.createElement('div')
    this.bottomArea.classList.add('bottom-area')
    this.bottomTabList = document.createElement('tab-list')
    this.bottomTabBlankArea = document.createElement('div')
    this.bottomTabBlankArea.classList.add('drop')
    this.bottomTabList.appendDropArea = this.bottomTabBlankArea
    this.bottomTabList.tabGroup = this.tabGroup
    this.bottomAreaHeader = document.createElement('div')
    this.bottomAreaHeader.classList.add('header')
    this.bottomAreaHeader.append(this.bottomTabList, this.bottomTabBlankArea)
    this.bottomArea.append(this.bottomAreaHeader)
    this.tabGroup.tabLists = [this.topTabList, this.bottomTabList]
    this.sidebarView.addEventListener('fileClick', ({detail: markdownCodeBlock}) => {
      if (!this.getRootNode().host.classList.contains('source')) {
        const allTabs = this.topTabList.tabLists.map(tabList => [...(tabList.tabs || [])]).flat()
        let tab = allTabs.find(tab => tab.name === markdownCodeBlock.name)
        if (tab !== undefined) {
          tab.selected = true
        } else {
          tab = document.createElement('tab-item')
          tab.codeBlock = markdownCodeBlock
          tab.codeBlock.tab = tab
          tab.name = tab.codeBlock.name
          this.topTabList.listEl.insertAdjacentElement('beforeend', tab)
          tab.selected = true
        }
      }
    })
    this.addEventListener('tabSelect', e => {
      const el = e.composedPath()[0]
      if (el.tagName === 'TAB-ITEM') {
        this.showTab(el)
      }
    })
    this.addEventListener('tabClose', e => {
      const tab = e.composedPath()[0]
      const toSelect = tab.selected ? (tab.previousElementSibling ?? tab.nextElementSibling ?? undefined) : undefined
      e.composedPath()[0].remove()
      if (toSelect !== undefined) {
        toSelect.selected = true
      }
      tab.codeBlock.codeEdit.remove()
    })
    this.shadowRoot.append(this.topArea, this.split, this.bottomArea)
  }

  showTab(tab) {
    const area = tab.tabList === this.bottomTabList ? this.bottomArea : this.topArea
    if (tab.codeBlock.codeEdit === undefined) {
      tab.codeBlock.codeEdit = document.createElement('code-edit')
      const codeEdit = tab.codeBlock.codeEdit
      codeEdit.fileType = tab.name.match(/\.([^.]+)/)[1]
      codeEdit.dark = true
      codeEdit.value = tab.codeBlock.content
      codeEdit.addEventListener('codeInput', () => {
        tab.dispatchEvent(new CustomEvent('codeInput', {detail: tab.codeBlock, bubbles: true, composed: true}))
      })
    }
    if (tab.codeBlock.codeEdit.parent !== area) {
      area.append(tab.codeBlock.codeEdit)
    }
    for (const tabInList of tab.tabList.tabs) {
      if (tabInList.codeBlock.codeEdit) {
        if (tabInList === tab) {
          tabInList.codeBlock.codeEdit.setAttribute('selected', '')
        } else {
          tabInList.codeBlock.codeEdit.removeAttribute('selected')
        }
      }
    }
  }

  markDeletedTabs(foundTabs) {
    for (const tab of [...this.topTabList.tabs, ...this.bottomTabList.tabs]) {
      const deleted = !foundTabs.has(tab)
      if (tab.deleted !== deleted) {
        tab.deleted = deleted
      }
    }
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: grid;
          grid-template-rows: var(--top-area-height, 50%) min-content calc(100% - var(--top-area-height, 50%));
          box-sizing: border-box;
          color: #d7d7d7;
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
        .header {
          display: grid;
          grid-template-columns: max-content 1fr;
        }
        .drop {
          padding: 3px;
          background-clip: content-box;
        }
        .drop.drag-hover {
          background-color: #8889;
          border-radius: 8px;
        }
        code-edit {
          overflow: auto;
          grid-row: 2;
        }
        code-edit:not([selected]) {
          display: none;
        }
        output-view {
          grid-row: 2;
        }
        output-view:not([selected]) {
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
    this.tabList.tabs = Object.values(this.sidebarView.markdownViews).map(markdownView => {
      const el = document.createElement('tab-item')
      el.name = markdownView.name
      el.markdownView = markdownView
      el.closable = false
      const codeEdit = document.createElement('code-edit')
      codeEdit.fileType = 'md'
      codeEdit.lineWrapping = true
      codeEdit.lineNumbers = false
      codeEdit.dark = true
      codeEdit.value = markdownView.value
      codeEdit.addEventListener('codeInput', () => {
        markdownView.value = codeEdit.value
      })
      markdownView.codeEdit = codeEdit
      return el
    })
    this.tabList.tabs[0].selected = true
    this.tabList.addEventListener('tabSelect', e => {
      const selectedTab = e.composedPath()[0]
      const selectedCodeEdit = this.shadowRoot.querySelector('code-edit[selected]')
      if (selectedCodeEdit) {
        selectedCodeEdit.removeAttribute('selected')
      }
      selectedTab.markdownView.codeEdit.setAttribute('selected', '')
    })
    this.tabList.tabs[0].markdownView.codeEdit.setAttribute('selected', '')
    this.shadowRoot.append(this.tabList, ...([...this.tabList.tabs]).map(tab => tab.markdownView.codeEdit))
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
        code-edit:not([selected]) {
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
    this.codeBtn = document.createElement('button')
    this.codeBtn.innerHTML = this.icons.code
    this.timeouts = {}
  }

  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    this.tabList = document.createElement('tab-list')
    this.tabList.tabs = this.notebooks.map(({name}) => {
      const el = document.createElement('tab-item')
      el.name = name
      el.closable = false
      return el
    })
    this.tabList.tabs[0].selected = true
    this.tabList.addEventListener('tabSelect', e => {
      const selectedTab = e.composedPath()[0]
      const selectedView = Object.values(this.markdownViews).find(el => el.hasAttribute('selected'))
      selectedView.removeAttribute('selected')
      this.markdownViews[selectedTab.name].setAttribute('selected', '')
    })
    this.markdownViews[this.notebooks[0].name].setAttribute('selected', '')
    this.shadowRoot.addEventListener('fileClick', ({detail}) => {
      this.dispatchEvent(new CustomEvent('fileClick', {bubbles: true, detail}))
    })
    const iconContainer = document.createElement('div')
    const downloadBtn = document.createElement('button')
    downloadBtn.innerHTML = this.icons.download
    downloadBtn.addEventListener('click', () => {
      
    })
    iconContainer.append(downloadBtn, this.codeBtn)
    iconContainer.classList.add('icon-container')
    this.shadowRoot.append(this.tabList, iconContainer, ...Object.values(this.markdownViews))
  }

  updateNotebooksFromContentViews() {
    for (const markdownView of Object.values(this.markdownViews)) {
      markdownView.updateFromContentViews()
    }
  }

  updateContentViewsFromNotebooks() {
    const foundTabs = new WeakSet()
    for (const markdownView of Object.values(this.markdownViews)) {
      markdownView.updateContentViews(foundTabs)
    }
    return foundTabs
  }

  get notebooks() {
    return this._notebooks
  }

  set notebooks(value) {
    this._notebooks = value
    this.markdownViews = Object.fromEntries(this.notebooks.map(({name, content}) => {
      const el = document.createElement('markdown-view')
      el.name = name
      el.value = content
      return [name, el]
    }))
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
        markdown-view:not([selected]) {
          display: none;
        }
        .icon-container {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 2px 5px;
        }
        .icon-container button {
          all: inherit;
          height: 25px;
          padding: 3px;
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
    this.notebookSourceView.sidebarView = this.sidebarView
    this.sidebarView.notebookSourceView = this.notebookSourceView
    this.sidebarView.contentView = this.contentView
    this.contentView.sidebarView = this.sidebarView
    this.notebookSourceView.sidebarView = this.sidebarView
    this.sidebarView.codeBtn.addEventListener('click', () => {
      const enabled = !this.classList.contains('source')
      if (enabled) {
        this.sidebarView.updateNotebooksFromContentViews()
      } else {
        const foundTabs = this.sidebarView.updateContentViewsFromNotebooks()
        this.contentView.markDeletedTabs(foundTabs)
      }
      this.sidebarView.codeBtn.classList.toggle('on', enabled)
      this.classList.toggle('source', enabled)
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
          min-width: 3px;
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
    const dataSource = (
      __source.includes('\n---\n\n**begin data**\n') ?
      __source.split('\n---\n\n**begin notebook**\n')[0].split('\n---\n\n**begin data**\n').at(-1) : ''
    )
    console.log({dataSource})
    const notebook = Array.from(readBlocksWithNames(dataSource)).filter(
      ({name}) => name?.endsWith?.('.md')
    ).map(({contentRange}) => dataSource.slice(...contentRange)).find(_ => true)
    notebookView.notebooks = [
      {
        name: 'main',
        content: notebook ?? __source.split('---\n\n**notebook**')[1].trim(),
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

`thumbnail.svg`

```svg
<svg width="256" xmlns="http://www.w3.org/2000/svg" height="256" fill="none"><g data-testid="Board"><defs><clipPath id="a" class="frame-clip frame-clip-def"><rect rx="0" ry="0" width="256" height="256"/></clipPath></defs><g clip-path="url(#a)"><g class="fills"><rect width="256" height="256" class="frame-background" style="fill: rgb(43, 23, 42); fill-opacity: 1;" ry="0" rx="0"/></g><g class="frame-children"><rect rx="0" ry="0" x="11" y="12" transform="rotate(.14 30.498 19.505)" width="39" height="15" style="fill: rgb(14, 84, 79); fill-opacity: 1;" class="fills" data-testid="Rectangle"/><rect rx="0" ry="0" x="61.02" y="12.051" transform="rotate(.14 80.518 19.564)" width="39" height="15" style="fill: rgb(72, 72, 80); fill-opacity: 1;" class="fills" data-testid="Rectangle"/><rect rx="0" ry="0" x="111.02" y="12.051" transform="rotate(.14 130.519 19.571)" width="39" height="15" style="fill: rgb(72, 72, 80); fill-opacity: 1;" class="fills" data-testid="Rectangle"/><rect rx="0" ry="0" x="61.02" y="128.051" transform="rotate(.14 80.5 135.566)" width="39" height="15" style="fill: rgb(72, 72, 80); fill-opacity: 1;" class="fills" data-testid="Rectangle"/><rect rx="0" ry="0" x="11.02" y="128.051" transform="rotate(.14 30.5 135.558)" width="39" height="15" style="fill: rgb(14, 84, 79); fill-opacity: 1;" class="fills" data-testid="Rectangle"/><rect rx="0" ry="0" x="172.02" y="12.051" transform="rotate(.14 191.52 19.581)" width="39" height="15" style="fill: rgb(14, 84, 79); fill-opacity: 1;" class="fills" data-testid="Rectangle"/><rect rx="0" ry="0" x="156" y="-12" width="4" height="280" style="fill: rgb(38, 55, 55); fill-opacity: 1;" class="fills" data-testid="Rectangle"/><rect rx="0" ry="0" x="25" y="171" width="115" height="62" style="fill: rgb(71, 41, 194); fill-opacity: 0.62;" class="fills" data-testid="Rectangle"/><rect rx="0" ry="0" x="173" y="44" width="71" height="12" style="fill: rgb(128, 128, 129); fill-opacity: 1;" class="fills" data-testid="Rectangle"/><rect rx="0" ry="0" x="173" y="68" width="71" height="5" style="fill: rgb(128, 128, 129); fill-opacity: 1;" class="fills" data-testid="Rectangle"/><rect rx="0" ry="0" x="15" y="44" width="131" height="5" style="fill: rgb(128, 128, 129); fill-opacity: 1;" class="fills" data-testid="Rectangle"/><rect rx="0" ry="0" x="15" y="57" width="131" height="5" style="fill: rgb(128, 128, 129); fill-opacity: 1;" class="fills" data-testid="Rectangle"/><rect rx="0" ry="0" x="15" y="71" width="131" height="5" style="fill: rgb(128, 128, 129); fill-opacity: 1;" class="fills" data-testid="Rectangle"/><rect rx="0" ry="0" x="15" y="84" width="131" height="5" style="fill: rgb(128, 128, 129); fill-opacity: 1;" class="fills" data-testid="Rectangle"/><rect rx="0" ry="0" x="15" y="97" width="131" height="5" style="fill: rgb(128, 128, 129); fill-opacity: 1;" class="fills" data-testid="Rectangle"/><rect rx="0" ry="0" x="173" y="81" width="71" height="5" style="fill: rgb(128, 128, 129); fill-opacity: 1;" class="fills" data-testid="Rectangle"/><rect rx="0" ry="0" x="173" y="94" width="34" height="5" style="fill: rgb(128, 128, 129); fill-opacity: 1;" class="fills" data-testid="Rectangle"/><rect rx="0" ry="0" x="173" y="115" width="71" height="5" style="fill: rgb(128, 128, 129); fill-opacity: 1;" class="fills" data-testid="Rectangle"/><rect rx="0" ry="0" x="173" y="128" width="71" height="5" style="fill: rgb(128, 128, 129); fill-opacity: 1;" class="fills" data-testid="Rectangle"/><rect rx="0" ry="0" x="179" y="162" width="55" height="4" style="fill: rgb(167, 167, 227); fill-opacity: 1;" class="fills" data-testid="Rectangle"/><rect rx="0" ry="0" x="179" y="175" width="55" height="4" style="fill: rgb(167, 167, 227); fill-opacity: 1;" class="fills" data-testid="Rectangle"/><rect rx="0" ry="0" x="179" y="188" width="55" height="4" style="fill: rgb(167, 167, 227); fill-opacity: 1;" class="fills" data-testid="Rectangle"/><rect rx="0" ry="0" x="173" y="141" width="34" height="5" style="fill: rgb(128, 128, 129); fill-opacity: 1;" class="fills" data-testid="Rectangle"/><rect rx="0" ry="0" x="172" y="207" width="71" height="5" style="fill: rgb(128, 128, 129); fill-opacity: 1;" class="fills" data-testid="Rectangle"/><rect rx="0" ry="0" x="172" y="220" width="71" height="5" style="fill: rgb(128, 128, 129); fill-opacity: 1;" class="fills" data-testid="Rectangle"/><rect rx="0" ry="0" x="172" y="233" width="34" height="5" style="fill: rgb(128, 128, 129); fill-opacity: 1;" class="fills" data-testid="Rectangle"/></g></g></g></svg>
```
