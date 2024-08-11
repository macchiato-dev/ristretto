# tiny delta

`notebook.json`

```json
{
  "importFiles": [
    ["table.md", "data-table.js"]
  ]
}
```

This takes two strings or two Uint8Arrays and finds a delta between them, and returns values that can be used to splice from one to the other.

It works by finding which is the largest of the two, and doing a binary search for the smallest range of changed values. It can be anchored to the beginning or end of the string.

`tinyDelta.js`

```js
export function tinyDelta(s1, s2) {
  
}
```

`ExampleView.js`

```js
import {tinyDelta} from '/tinyDelta.js'

export class ExampleView extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    const globalSheets = [...document.adoptedStyleSheets ?? []]
    if (!globalSheets.includes(this.constructor.globalStyles)) {
      document.adoptedStyleSheets = [...globalSheets, this.constructor.globalStyles]
    }
    const output = document.createElement('data-table')
    output.data = [
      ['call', 'input', 'output'],
      [
        "tinyDelta('abcdef', 'abcxyz')",
        "3, 3, 'xyz'",
        tinyDelta(),
      ],
      [
        "tinyDelta('abc', 'abcdef')",
        "3, 0, 'def'",
        tinyDelta(),
      ],
    ]
    this.shadowRoot.append(output)
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: flex;
          flex-direction: column;
          padding: 10px;
          align-items: center;
        }
      `)
    }
    return this._styles
  }

  static get globalStyles() {
    if (!this._globalStyles) {
      this._globalStyles = new CSSStyleSheet()
      this._globalStyles.replaceSync(`
        body {
          display: grid;
          grid-template-columns: 1fr;
        }
      `)
    }
    return this._globalStyles
  }
}
```

`app.js`

```js
import {DataTable} from '/table/data-table.js'
import {ExampleView} from '/ExampleView.js'

customElements.define('data-table', DataTable)
customElements.define('example-view', ExampleView)

async function setup() {
  const exampleView = document.createElement('example-view')
  document.body.append(exampleView)
}

await setup()
```
