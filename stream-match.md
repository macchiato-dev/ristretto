# Stream match

This is a stream match function. It's like `match` or `matchAll` on a string, but uses a stream as the haystack. It can use an array buffer, a string, or a regex (with handling of binary data and an optional haystack size limit) as a needle.

Implementation notes:

First attempt (this turns out to have a faulty assumption):

- Read the stream in chunks
- Build a buffer of chunks big enough to hold the haystack
- Do the search on the buffer
- When something is found, for the next chunk, prepend the remainder of the buffer after the match

The maximum needle a buffer support might be `(numberOfChunks - 1) * chunkSize + 1`.

For instance:

> With a tiny chunk size of 5 for demonstration purposes (separated by 🐛):
>
> types🐛cript🐛javas🐛cript
>
> search expression: "scriptj"
>
> It's spread across 3 chunks, and less than the size of 2 chunks.

However, there is the faulty assumption that chunk sizes are the same. [This is not the case](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Concepts#chunks):

> A single stream can contain chunks of different sizes and types.

`stream-match.js`

```js
// TODO: change to function*
export function streamMatch(needle, haystack) {
  
}
```

`ExampleView.js`

```js
import { streamMatch } from '/stream-match.js'

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
        'streamMatch()',
        'TODO',
        streamMatch(),
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

`notebook.json`

```json
{
  "importFiles": [
    ["table.md", "data-table.js"]
  ]
}
```
