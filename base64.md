# base64

`notebook.json`

```json
{
  "importFiles": [
    ["table.md", "data-table.js"]
  ]
}
```

This encodes and decodes base64 of ArrayBuffers, with support for base64urls.

The base64 format is documented in an [RFC](https://datatracker.ietf.org/doc/html/rfc4648)

This takes the implementation from MDN, which uses atob to convert from base64 to binary.

JavaScript strings can hold characters with code points between 0 and 255 inclusive. [atob returns such strings.](https://developer.mozilla.org/en-US/docs/Web/API/atob) [So does btoa](https://developer.mozilla.org/en-US/docs/Web/API/btoa) but that is for the simple fact that the only characters it will return are the 64 base64 characters plus the padding character, which all have code points between 0 and 255 inclusive.

`base64.js`

```js
// https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem

export class Base64 {
  static encode(arr) {
    return btoa(Array.from(arr, n => String.fromCodePoint(n)).join(''))
  }

  static decode(str) {
    return Uint8Array.from(atob(str), s => s.codePointAt(0))
  }
}

export class Base64Url {
  static encode(arr) {
    return Base64.encode(arr).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
  }

  static decode(str) {
    return Base64.decode(str.replaceAll('-', '+').replaceAll('_', '/'))
  }
}
```

`ExampleView.js`

```js
import { Base64, Base64Url } from '/base64.js'

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
        'Base64.encode(new TextEncoder().encode(input))',
        'wow',
        Base64.encode(new TextEncoder().encode('wow')),
      ],
      [
        'new TextDecoder().decode(Base64.decode(input))',
        'd293',
        new TextDecoder().decode(Base64.decode('d293')),
      ],
      [
        'Base64.encode(new TextEncoder().encode(input))',
        '--🐛🦋🐛--',
        Base64.encode(new TextEncoder().encode('--🐛🦋🐛--')),
      ],
      [
        'new TextDecoder().decode(Base64.decode(input))',
        'LS3wn5Cb8J+mi/CfkJstLQ==',
        new TextDecoder().decode(Base64.decode('LS3wn5Cb8J+mi/CfkJstLQ==')),
      ],
      [
        'Base64Url.encode(new TextEncoder().encode(input))',
        '--🐛🦋🐛--',
        Base64Url.encode(new TextEncoder().encode('--🐛🦋🐛--')),
      ],
      [
        'new TextDecoder().decode(Base64Url.decode(input))',
        'LS3wn5Cb8J-mi_CfkJstLQ',
        new TextDecoder().decode(Base64Url.decode('LS3wn5Cb8J-mi_CfkJstLQ')),
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
