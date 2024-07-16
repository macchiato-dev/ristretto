# Websocket Shared Doc

This is a shared doc that is updated through WebSockets. It's intended to keep a doc updated between a computer and a phone. It does keep data from being clobbered if one updates when saving a new version based on an out of date version, by holding on to both versions, but it leaves it up to the user to resolve them.

Also, the client logic happens inside of an iFrame and the server logic happens inside a worker using post messages.

This is intended to be small and simple but work reasonably well, and serve as an intro. Concepts here will be expanded upon in other docs.

## Server

This runs inside of a worker. It communicates with the server wrapper through postMessage.

## Server Wrapper

This takes real server resources, or simulated ones, and runs the server inside the worker.

## Server Runner

This runs the server inside of Deno.

## Simulated Server Runner

This runs the server inside of an iFrame, using simulated resources.

## Client

This is the client UI. It communicates with the client wrapper through postMessage.

## Client Wrapper

This is the client wrapper that runs inside the browser.

## Client Runner

This runs the client inside of a window or frame that has access to the resources needed to connect to the Deno server and persist state.

## Simulated Client Wrapper

This runs the client inside of an iFrame, using simulated resources.

## Development View

This adds an extra instance of the client and some controls to the client.

`DevView.js`

```js
export class DevView extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: grid;
          grid-template-columns: max-content max-content;
          padding: 10px;
          gap: 10px;
        }
        * {
          box-sizing: border-box;
        }
        .shade-select {
          display: grid;
          grid-template-columns: 200px;
          grid-template-rows: 200px;
          background: linear-gradient(to top, #000000, var(--hue-color, #0000ff));
          position: relative;
        }
      `)
    }
    return this._styles
  }
}
```

`ExampleView.js`

```js
export class ExampleView extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.setStyles(true)
    this.devView = document.createElement('dev-view')
    this.shadowRoot.append(this.devView)
  }

  disconnectedCallback() {
    this.setStyles(false)
  }

  setStyles(enabled) {
    this.shadowRoot.adoptedStyleSheets = enabled ? [this.constructor.styles] : []
    const sheets = [...document.adoptedStyleSheets].filter(v => v !== this.constructor.globalStyles)
    document.adoptedStyleSheets = [...sheets, ...(enabled ? [this.constructor.globalStyles] : [])]
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
import {DevView} from '/DevView.js'
import {ExampleView} from '/ExampleView.js'

customElements.define('dev-view', DevView)
customElements.define('example-view', ExampleView)

async function setup() {
  const exampleView = document.createElement('example-view')
  document.body.append(exampleView)
}

await setup()
```
