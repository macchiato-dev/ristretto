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
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    this.shadowRoot.addEventListener('keydown', e => {
      const oldCell = e.target.closest('td, th')
      const x = ({'ArrowLeft': -1, 'ArrowRight': 1})[e.code]
      const y = ({'ArrowUp': -1, 'ArrowDown': 1})[e.code]
      const sel = this.getSelection()
      const oldRange = this.getSelectionRange(sel)
      if (!oldRange) {
        return
      }
      const oldRect = oldRange.getClientRects ? oldRange.getClientRects()[0] : undefined
      if (x !== undefined || y !== undefined) {
        let newCell
        if (y !== undefined) {
          const colIndex = [...oldCell.parentElement.children].indexOf(oldCell)
          const table = oldCell.closest('table')
          const rows = [...table.querySelectorAll('tr')]
          const rowIndex = rows.indexOf(oldCell.parentElement)
          const newRow = rows[rowIndex + y]
          if (newRow !== undefined) {
            newCell = [...newRow.querySelectorAll('td, th')][colIndex]            
          }
        }
        if (x !== undefined) {
          const atEnd = oldRange.startOffset === (x === -1 ? 0 : oldCell.innerText.length)
          if (atEnd) {
            const row = oldCell.parentElement
            const colIndex = [...row.children].indexOf(oldCell)
            const newColIndex = colIndex + x
            newCell = [...row.querySelectorAll('td, th')][newColIndex]
          }
        }
        if (newCell !== undefined) {
          const newRange = document.createRange()
          const textNode = newCell.childNodes[0]
          const moveToEnd = [undefined, 1].includes(x)
          if (y !== undefined) {
            const y = newCell.clientTop + Math.floor(newCell.clientHeight / 2)
            const oldPosFromEnd = oldCell.innerText.length - oldRange.startOffset
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
            } else {
              const oldSplit = oldCell.firstChild.splitText(oldRange.startOffset)
              const oldSpan = document.createElement('i')
              oldCell.insertBefore(oldSpan, oldSplit)
              const oldRect = oldSpan.getBoundingClientRect()
              oldSpan.remove()
              oldCell.normalize()
              const newSplit = newCell.firstChild.splitText(startPos)
              const newSpan = document.createElement('i')
              newCell.insertBefore(newSpan, newSplit)
              newRect = newSpan.getBoundingClientRect()
              newSpan.remove()
              newCell.normalize()
              prevRect = newRect
              const dir = (oldRect.x - newRect.x) >= 0 ? 1 : -1
              let finalPos = startPos
              let prevPos = startPos
              for (let i=1; i <= newCell.innerText.length; i++) {
                const newPos = startPos + i * dir
                if (newPos < 0 || newPos > newCell.innerText.length) {
                  break
                }
                newCell.normalize()
                const newSplit = newCell.firstChild.splitText(newPos)
                const newSpan = document.createElement('i')
                newCell.insertBefore(newSpan, newSplit)
                newRect = newSpan.getBoundingClientRect()
                newSpan.remove()
                newCell.normalize()
                if (Math.abs(oldRect.x - newRect.x) >= Math.abs(oldRect.x - prevRect.x)) {
                  finalPos = prevPos
                  break
                }
                prevRect = newRect
                prevPos = newPos
              }
              sel.setPosition(newCell.firstChild, finalPos)
            }
          } else {
            if (oldRect) {
              const newRange = new Range()
              newRange.selectNode(textNode)
              newRange.setStart(textNode, x === -1 ? textNode.length : 0)
              newRange.setEnd(textNode, x === -1 ? textNode.length : 0)
              sel.removeAllRanges()
              sel.addRange(newRange)
            } else {
              sel.setPosition(textNode, x === -1 ? textNode.length : 0)
            }
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

  getSelectionRange(sel) {
    if (sel.getComposedRanges) {
      return sel.getComposedRanges(this.shadowRoot)[0]
    } else if (sel.rangeCount > 0) {
      return sel.getRangeAt(0)
    }
  }

  set data(data) {
    function createCell(tag, text) {
      const el = document.createElement(tag)
      el.innerText = text
      el.contentEditable = true
      return el
    }
    const tableHead = document.createElement('thead')
    const tableHeadRow = document.createElement('tr')
    tableHeadRow.append(...data[0].map(s => createCell('th', s)))
    tableHead.append(tableHeadRow)
    const tableBody = document.createElement('tbody')
    tableBody.append(...data.slice(1).map(row => {
      const tableRow = document.createElement('tr')
      tableRow.append(...row.map(s => createCell('td', s)))
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

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        th, td {
          padding: 3px 5px;
          white-space: nowrap;
        }
        th, td * {
          white-space: nowrap;
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
      `)
    }
    return this._styles
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
    document.adoptedStyleSheets = [...(document.adoptedStyleSheets ?? []), this.constructor.globalStyles]
  }

  static get globalStyles() {
    if (!this._globalStyles) {
      this._globalStyles = new CSSStyleSheet()
      this._globalStyles.replaceSync(`
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
      `)
    }
    return this._globalStyles
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
