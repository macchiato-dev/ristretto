# Editable Data Table

`notebook.json`

```json
{
  "dataFiles": [
    ["planets.csv.md", "planets.csv"]
  ]
}
```

`editable-data-table.js`

```js
export class EditableDataTable extends HTMLElement {
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
      th, td {
        outline: none;
      }
    `
    this.shadowRoot.append(style)
    this.shadowRoot.addEventListener('keydown', e => {
      const x = ({'ArrowLeft': -1, 'ArrowRight': 1})[e.code]
      const y = ({'ArrowUp': -1, 'ArrowDown': 1})[e.code]
      const sel = this.getSelection()
      if (sel.rangeCount === 0) {
        return
      }
      const oldRange = sel.getRangeAt(0)
      const oldRect = oldRange.getClientRects()[0]
      if (x !== undefined || y !== undefined) {
        let newCell
        if (y !== undefined) {
          const colIndex = [...e.target.parentElement.children].indexOf(e.target)
          const table = e.target.closest('table')
          const rows = [...table.querySelectorAll('tr')]
          const rowIndex = rows.indexOf(e.target.parentElement)
          const newRow = rows[rowIndex + y]
          if (newRow !== undefined) {
            newCell = [...newRow.querySelectorAll('td, th')][colIndex]            
          }
        }
        if (x !== undefined) {
          const atEnd = oldRange.startOffset === (x === -1 ? 0 : e.target.innerText.length)
          if (atEnd) {
            const row = e.target.parentElement
            const colIndex = [...row.children].indexOf(e.target)
            const newColIndex = colIndex + x
            newCell = [...row.querySelectorAll('td, th')][newColIndex]
          }
        }
        if (newCell !== undefined) {
          const newRange = document.createRange()
          const textNode = newCell.childNodes[0]
          const moveToEnd = [undefined, -1].includes(x)
          if (y !== undefined) {
            const oldPosFromEnd = e.target.innerText.length - oldRange.startOffset
            let newPosFromEnd = Math.min(oldPosFromEnd, newCell.innerText.length)
            const startPos = newCell.innerText.length - newPosFromEnd
            newRange.setStart(textNode, startPos)
            newRange.collapse(!moveToEnd)
            sel.removeAllRanges()
            sel.addRange(newRange)
            let newRect = newRange.getClientRects()[0]
            let prevRect = newRect
            let prevRange = newRange
            if (oldRect) {
              const dir = (oldRect.x - newRect.x) >= 0 ? 1 : -1
              for (let i=1; i <= newCell.innerText.length; i++) {
                const newRange = document.createRange()
                const newPos = startPos + i * dir
                if (newPos < 0 || newPos > newCell.innerText.length) {
                  break
                }
                newRange.setStart(textNode, newPos)
                sel.removeAllRanges()
                sel.addRange(newRange)
                newRect = newRange.getClientRects()[0]
                if (Math.abs(oldRect.x - newRect.x) >= Math.abs(oldRect.x - prevRect.x)) {
                  sel.removeAllRanges()
                  sel.addRange(prevRange)
                  break
                }
                prevRect = newRect
                prevRange = newRange
              }
            }
          } else {
            newRange.setStart(textNode, x === -1 ? textNode.length : 0)
            newRange.collapse(!moveToEnd)
            sel.removeAllRanges()
            sel.addRange(newRange)
          }
          newCell.focus()
          e.preventDefault()
        }
      }
    })
  }

  getSelection() {
    if (this.shadowRoot.getSelection) {
      return this.shadowRoot.getSelection()
    } else {
      return document.getSelection()
    }
  }

  createCell(tag, text) {
    const el = document.createElement(tag)
    el.innerText = text
    el.contentEditable = true
    return el
  }

  set data(data) {
    const tableHead = document.createElement('thead')
    const tableHeadRow = document.createElement('tr')
    tableHeadRow.append(...data[0].map(s => this.createCell('th', s)))
    tableHead.append(tableHeadRow)
    const tableBody = document.createElement('tbody')
    tableBody.append(...data.slice(1).map(row => {
      const tableRow = document.createElement('tr')
      tableRow.append(...row.map(s => this.createCell('td', s)))
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
    this.dataTable = document.createElement('editable-data-table')
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
import {EditableDataTable} from '/editable-data-table.js'
import {AppView} from '/app-view.js'

customElements.define('editable-data-table', EditableDataTable)
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
