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
    this.tabListView = document.createElement('div')
    this.tabListView.setAttribute('role', 'tablist')
    this.client1View = document.createElement('div')
    this.client2View = document.createElement('div')
    this.logView = document.createElement('div')
    this.client1Tab = this.addTab('Client 1', this.client1View)
    this.client2Tab = this.addTab('Client 2', this.client2View)
    this.logsTab = this.addTab('Logs', this.logView)
    this.selectedTab = this.client1Tab
    this.setTabIndex(this.selectedTab)
    this.shadowRoot.append(this.tabListView)

    this.tabListView.addEventListener('click', e => {
      const tab = e.target.closest('button:not([aria-selected=true])')
      if (tab) {
        this.selectedTab = tab
      }
    })
    this.tabListView.addEventListener('keydown', ({code, target}) => {
      const tab = target.closest('button')
      const dir = {ArrowLeft: -1, ArrowRight: 1}[code]
      if (tab && dir !== undefined) {
        const tabs = [...tab.parentElement.children]
        tabs[tabs.indexOf(tab) + dir]?.focus()
      }
    })
    this.tabListView.addEventListener('focusin', ({target}) => {
      const tab = target.closest('button')
      if (tab) {
        this.setTabIndex(tab)
      }
    })
  }

  addTab(name, view) {
    const tab = document.createElement('button')
    tab.innerText = name
    tab.tabIndex = -1
    this.tabListView.append(tab)
    return tab
  }

  get selectedTab() {
    return [...this.tabListView.children].find(el => el.ariaSelected === 'true')
  }

  set selectedTab(tab) {
    if (this.selectedTab) {
      this.selectedTab.ariaSelected = 'false'
    }
    tab.ariaSelected = 'true'
  }

  setTabIndex(tab) {
    for (const otherTab of [...this.tabListView.children].filter(el => el !== tab)) {
      otherTab.tabIndex = -1
    }
    tab.tabIndex = 0
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: grid;
          grid-template-columns: 1fr;
          grid-template-rows: 1fr minmax(20px, max-content);
          background: #000;
          color: #eee;
        }
        div[role=tablist] {
          background-color: darkblue;
          grid-row: 2;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, max-content));
          padding: 3px;
          gap: 3px;
        }
        div[role=tablist] button {
          all: unset;
          user-select: none;
          padding: 3px 5px;
          text-align: center;
          font-family: sans-serif;
        }
        div[role=tablist] button[aria-selected=true] {
          background-color: #aff7;
          font-weight: bold;
        }
        div[role=tablist] button:focus-visible {
          outline: 2px solid #fff9;
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
          display: grid;
          grid-template-rows: 1fr;
          grid-template-columns: 1fr;
        }
      `)
    }
    return this._styles
  }

  static get globalStyles() {
    if (!this._globalStyles) {
      this._globalStyles = new CSSStyleSheet()
      this._globalStyles.replaceSync(`
        html {
          height: 100%;
          box-sizing: border-box;
        }
        *, *:before, *:after {
          box-sizing: inherit;
        }
        body {
          display: grid;
          grid-template-columns: 1fr;
          margin: 0;
          padding: 0;
          height: 100%;
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
