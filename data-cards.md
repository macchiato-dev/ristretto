# Data Cards

`data-cards.js`

```js
export class DataCards extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 20px;
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
    `
    this.shadowRoot.append(style)
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
}
```

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
