# Websocket Shared Doc

This is a shared doc that is updated through WebSockets. It's intended to keep a doc updated between a computer and a phone. It does keep data from being clobbered if one updates when saving a new version based on an out of date version, by holding on to both versions, but it leaves it up to the user to resolve them.

Also, the client logic happens inside of an iFrame and the server logic happens inside a worker using post messages.

This is intended to be small and simple but work reasonably well, and serve as an intro. Concepts here will be expanded upon in other docs.

## Shared Components

`SharedComponents.js`

```js
export class SharedComponents {
  static createTabs(...tabs) {
    const el = document.createElement('div')
    const items = Object.fromEntries(tabs.map(({name, label}) => {
      const el = document.createElement('button')
      el.innerText = name
      el.tabIndex = -1
      return [name, el]
    }))
    el.setAttribute('role', 'tablist')
    el.append(...tabs.map(({name}) => items[name]))
    const tabList = {
      el,
      get selectedTab() {
        return [...el.children].find(el => el.ariaSelected === 'true')
      },
      set selectedTab(tab) {
        const previousEl = this.selectedTab
        if (previousEl) {
          previousEl.ariaSelected = 'false'
        }
        const previous = previousEl ? {
          el: previousEl, name: Object.entries(items).find(([name, el]) => el === previousEl)[0]
        } : undefined
        const current = {
          el: tab, name: Object.entries(items).find(([name, el]) => el === tab)[0]
        }
        tab.ariaSelected = 'true'
        tab.dispatchEvent(new CustomEvent('tab-select', {bubbles: true, detail: {current, previous}}))
      },
      setTabIndex(tab) {
        for (const otherTab of [...el.children].filter(el => el !== tab)) {
          otherTab.tabIndex = -1
        }
        tab.tabIndex = 0
      }
    }
    el.addEventListener('click', e => {
      const tab = e.target.closest('button:not([aria-selected=true])')
      if (tab) {
        tabList.selectedTab = tab
      }
    })
    el.addEventListener('keydown', ({code, target}) => {
      const tab = target.closest('button')
      const dir = {ArrowLeft: -1, ArrowRight: 1}[code]
      if (tab && dir !== undefined) {
        const tabs = [...tab.parentElement.children]
        tabs[tabs.indexOf(tab) + dir]?.focus()
      }
    })
    el.addEventListener('focusin', ({target}) => {
      const tab = target.closest('button')
      if (tab) {
        tabList.setTabIndex(tab)
      }
    })
    if (!tabList.selectedTab) {
      tabList.selectedTab = items[tabs[0].name]
    }
    tabList.setTabIndex(tabList.selectedTab)
    return tabList
  }
}
```

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
import { SharedComponents } from '/SharedComponents.js'

export class DevView extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    this.client1View = document.createElement('div')
    this.client2View = document.createElement('div')
    this.logView = document.createElement('div')
    this.tabs = SharedComponents.createTabs(
      {name: 'client1', label: 'Client 1'},
      {name: 'client2', label: 'Client 2'},
      {name: 'logs', label: 'Logs'},
    )
    this.tabs.el.addEventListener('tab-select', e => {
      console.log(e)
    })
    this.shadowRoot.append(this.tabs.el)
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
          grid-template-columns: repeat(3, minmax(100px, max-content));
          overflow-x: auto;
          padding: 3px;
          gap: 3px;
        }
        div[role=tablist] button {
          all: unset;
          user-select: none;
          padding: 3px 10px;
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
