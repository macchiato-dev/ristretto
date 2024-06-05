# Auth

This implements both sides of an OAuth login with PKCE.

`notebook.json`

```json
{
  "importFiles": [
    ["client-server-simulator.md", "SimulatorNav.js"],
    ["client-server-simulator.md", "SimulatorView.js"]
  ]
}
```

`ExampleClient.js`

```js
export class ExampleClient {
  async request(request) {
    const html = `<button>Sign In with FakeProvider</button>`
    return new Response(html, {'content-type': 'text/html'})
  }
}
```

`FakeProvider.js`

```js
export class FakeProvider {
  async request(request) {
    const html = `<button>Welcome to FakeProvider</button>`
    return new Response(html, {'content-type': 'text/html'})
  }
}
```

`ExampleView.js`

```js
import {ExampleClient} from '/ExampleClient.js'
import {FakeProvider} from '/FakeProvider.js'

export class ExampleView extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    const globalSheets = [...document.adoptedStyleSheets ?? []]
    if (!globalSheets.includes(this.constructor.globalStyles)) {
      document.adoptedStyleSheets = [...globalSheets, this.constructor.globalStyles]
    }
    const data = {}
    for (const block of readBlocksWithNames(__source)) {
      if (block.name !== undefined) {
        data[block.name] = __source.slice(...block.contentRange)
      }
    }
    this.exampleClient = new ExampleClient()
    this.fakeProvider = new FakeProvider()
    this.simulatorView = document.createElement('simulator-view')
    this.simulatorView.server = {
      fetch: async request => {
        const url = new URL(request.url)
        if (url.host === 'client.localhost:3000') {
          console.log(this.exampleClient)
          return this.exampleClient.request(request)
        } else if (url.host === 'provider.localhost:4000') {
          return this.fakeProvider.request(request)
        }
      },
    }
    this.simulatorView.url = 'http://client.localhost:3000/'
    this.shadowRoot.append(this.simulatorView)
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: grid;
          padding: 10px;
        }
      `)
    }
    return this._styles
  }

  static get globalStyles() {
    if (!this._globalStyles) {
      this._globalStyles = new CSSStyleSheet()
      this._globalStyles.replaceSync(`
        body, html {
          height: 100%;
          margin: 0;
          padding: 0;
        }
        body {
          display: grid;
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
}
```

`app.js`

```js
import {ExampleView} from '/ExampleView.js'
import {SimulatorNav} from '/client-server-simulator/SimulatorNav.js'
import {SimulatorView} from '/client-server-simulator/SimulatorView.js'

customElements.define('simulator-nav', SimulatorNav)
customElements.define('simulator-view', SimulatorView)
customElements.define('example-view', ExampleView)

async function setup() {
  const exampleView = document.createElement('example-view')
  document.body.append(exampleView)
}

await setup()
```
