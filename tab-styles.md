# Tab Styles

This is a collection of tab styles.

`notebook.json`

```json
{
  "dataFiles": [
    ["colors.json.md", "thumbnail.svg"]
  ],
  "importFiles": [
    ["menu.md", "dropdown.js"],
    ["tabs.md", "TabItem.js"],
    ["tabs.md", "TabList.js"]
  ]
}
```

`ExampleView.js`

```js
export class ExampleView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
  }

  connectedCallback() {
    const globalStyle = document.createElement('style')
    globalStyle.textContent = `
      body {
        margin: 0;
        padding: 0;
        background-color: #55391b;
      }
    `
    document.head.append(globalStyle)
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: grid;
        grid-template-columns: 1fr;
        grid-template-rows: 1fr;
        margin: 0;
        padding: 10px;
        color: #bfcfcd;
        background: #fff;
      }
      tab-list.e1 {
        --bg: #339;
        --bg-selected: #fff4;
        --fg: #291;
        --fg-selected: #5e7;
      }
      tab-list.e2 {
        --radius: 0;
      }
    `
    this.shadowRoot.append(style)

    this.initExample1()
    this.initExample2()
  }

  initExample1() {
    const tabList = document.createElement('tab-list')
    tabList.classList.add('e1')
    const tabItems = Array(20).fill('').map((_, i) => {
      const el = document.createElement('tab-item')
      el.name = `Tab ${i}`
      el.contentEl = document.createElement('example-item')
      el.contentEl.name = el.name
      if (i === 0) {
        el.selected = true
        el.contentEl.selected = true
      }
      return el
    })
    tabList.items = tabItems
    tabList.createContentEl = tabEl => {
      return document.createElement('example-item')
    }
    const tabContent = document.createElement('div')
    tabContent.append(...tabItems.map(tabItem => tabItem.contentEl))
    this.shadowRoot.append(tabList, tabContent)
  }

  initExample2() {
    const tabList = document.createElement('tab-list')
    tabList.classList.add('e2')
    const tabItems = Array(20).fill('').map((_, i) => {
      const el = document.createElement('tab-item')
      el.name = `Tab ${i}`
      el.contentEl = document.createElement('example-item')
      el.contentEl.name = el.name
      if (i === 0) {
        el.selected = true
        el.contentEl.selected = true
      }
      return el
    })
    tabList.items = tabItems
    tabList.createContentEl = tabEl => {
      return document.createElement('example-item')
    }
    const tabContent = document.createElement('div')
    tabContent.append(...tabItems.map(tabItem => tabItem.contentEl))
    this.shadowRoot.append(tabList, tabContent)
  }
}
```

`ExampleItem.js`

```js
export class ExampleItem extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.p = document.createElement('p')
    this.shadowRoot.append(this.p)
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: none;
      }
      :host(.selected) {
        display: block;
      }
    `
    this.shadowRoot.append(style)
  }

  set selected(value) {
    if (value) {
      this.classList.add('selected')
    } else {
      this.classList.remove('selected')
    }
  }

  set name(value) {
    this.p.innerText = value
  }

  get name() {
    return this.p.innerText
  }
}
```

`app.js`

```js
import {Dropdown} from "/menu/dropdown.js"
import {TabItem} from '/tabs/TabItem.js'
import {TabList} from '/tabs/TabList.js'
import {ExampleItem} from '/ExampleItem.js'
import {ExampleView} from '/ExampleView.js'

customElements.define('m-menu-dropdown', Dropdown)
customElements.define('tab-item', TabItem)
customElements.define('tab-list', TabList)
customElements.define('example-item', ExampleItem)
customElements.define('example-view', ExampleView)

async function setup() {
  document.body.append(document.createElement('example-view'))
}

setup()
```
