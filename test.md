# Test runner

This is for running tests, which can be reported using data display components, on a web page or on a CLI.

`test.js`

```js
export class TestSuite {
  constructor() {
    this.tests = []
  }

  test(desc, fn) {
    this.tests.push({desc, fn})
  }

  async run() {
    for (const test of this.tests) {
      try {
        test.result = await test.fn()
      } catch (e) {
        test.error = e
      }
    }
  }

  get results() {
    return this.tests.map(({desc, result, error}) => ({desc, result, ...(error ? {error: `${error}`} : {})}))
  }
}
```

`example-view.js`

```js
import {TestSuite} from './test.js'

export class ExampleView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
  }

  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [this.constructor.style]
    this.output = document.createElement('pre')
    this.shadowRoot.append(this.output)
    this.run()
  }

  async run() {
    const tests = new TestSuite()
    tests.test('equality', () => {
      return 5 === 5
    })
    await tests.run()
    this.output.innerText = JSON.stringify(tests.results, null, 2)
  }

  static get style() {
    if (!this._style) {
      this._style = new CSSStyleSheet()
      this._style.replaceSync(`
        * { color: #ddd; }
      `)
    }
    return this._style
  }
}
```


`app.js`

```js
import {ExampleView} from './example-view.js'

customElements.define('example-view', ExampleView)

const el = document.createElement('example-view')
document.body.append(el)
```
