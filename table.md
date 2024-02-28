# Table

`data-table.js`

```js
export class DataTable extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      th, td {
        padding: 3px 5px;
      }
      th {
        background-color: #78c;
      }
      td {
        background-color: #aaa;
        text-align: right;
      }
      td:first-child {
        text-align: left;
      }
    `
    this.shadowRoot.append(style)
  }

  set data(data) {
    const tableHead = document.createElement('thead')
    const tableHeadRow = document.createElement('tr')
    tableHeadRow.append(...data[0].map(s => {
      const th = document.createElement('th')
      th.innerText = s
      return th
    }))
    tableHead.append(tableHeadRow)
    const tableBody = document.createElement('tbody')
    tableBody.append(...data.slice(1).map(row => {
      const tableRow = document.createElement('tr')
      tableRow.append(...row.map(s => {
        const td = document.createElement('td')
        td.innerText = s
        return td
      }))
      return tableRow
    }))
    if (this.table) {
      this.table.replaceChildren(tableHead, tableBody)
    } else {
      this.table = document.createElement('table')
      this.table.append(tableHead, tableBody)
      this.shadowRoot.append(this.table)
    }
  }
}
```

`app-view.js`

```js
export class AppView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.dataTable = document.createElement('data-table')
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
          return __source.slice(...block.contentRange)
        }
      }
    }
    return this._data
  }
}
```

`app.js`

```js
import {DataTable} from '/data-table.js'
import {AppView} from '/app-view.js'

customElements.define('data-table', DataTable)
customElements.define('app-view', AppView)

async function setup() {
  const appView = document.createElement('app-view')
  document.body.append(appView)
}

await setup()
```

`thumbnail.svg`

```svg
<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" fill="#111">
  <style>
    svg {
      background-color: #000;
    }
    .color1 {
      fill: #78c;
    }
    .color2 {
      fill: #aaa;
    }
  </style>
  <g transform="translate(10, 20)">
    <rect x="20" y="20" width="60" height="20" class="color1" />
    <rect x="90" y="20" width="60" height="20" class="color1" />
    <rect x="160" y="20" width="60" height="20" class="color1" />
  </g>
  <g transform="translate(10, 50)">
    <rect x="20" y="20" width="60" height="20" class="color2" />
    <rect x="90" y="20" width="60" height="20" class="color2" />
    <rect x="160" y="20" width="60" height="20" class="color2" />
  </g>
  <g transform="translate(10, 80)">
    <rect x="20" y="20" width="60" height="20" class="color2" />
    <rect x="90" y="20" width="60" height="20" class="color2" />
    <rect x="160" y="20" width="60" height="20" class="color2" />
  </g>
  <g transform="translate(10, 110)">
    <rect x="20" y="20" width="60" height="20" class="color2" />
    <rect x="90" y="20" width="60" height="20" class="color2" />
    <rect x="160" y="20" width="60" height="20" class="color2" />
  </g>
  <g transform="translate(10, 140)">
    <rect x="20" y="20" width="60" height="20" class="color2" />
    <rect x="90" y="20" width="60" height="20" class="color2" />
    <rect x="160" y="20" width="60" height="20" class="color2" />
  </g>
  <g transform="translate(10, 170)">
    <rect x="20" y="20" width="60" height="20" class="color2" />
    <rect x="90" y="20" width="60" height="20" class="color2" />
    <rect x="160" y="20" width="60" height="20" class="color2" />
  </g>
</svg>
```
