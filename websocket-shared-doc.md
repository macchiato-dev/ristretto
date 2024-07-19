# Websocket Shared Doc

This is a shared doc that is updated through WebSockets. It's intended to keep a doc updated between a computer and a phone. It does keep data from being clobbered if one updates when saving a new version based on an out of date version, by holding on to both versions, but it leaves it up to the user to resolve them.

Also, the client logic happens inside of an iFrame and the server logic happens inside a worker using post messages.

This is intended to be small and simple but work reasonably well, and serve as an intro. Concepts here will be expanded upon in other docs.

## Shared Components

This is a tab bar used for testing. It can be used in other places.

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
        let previous
        if (previousEl) {
          previousEl.ariaSelected = 'false'
          previous = {
            el: previousEl, name: Object.entries(items).find(([name, el]) => el === previousEl)[0]
          }
        }
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
    tabList.selectedTab = items[tabs[0].name]
    tabList.setTabIndex(tabList.selectedTab)
    return tabList
  }
}
```

## Server

This runs inside of a worker. It communicates with the server wrapper through postMessage.

`AppServer.js`

```js
export class AppServer {
  constructor({log}) {
    this.log = log
    this.log?.({source: 'AppServer', message: 'Created AppServer'})
    globalThis.addEventListener('message', e => {
    })
  }
}
```

## Server Wrapper

This takes real server resources, or simulated ones, and runs the server inside the worker.

`ServerWrapper.js`

```js
import {AppServer} from '/AppServer.js'

export class ServerWrapper {
  constructor({source, createWorker}) {
    this.eventHandlers = {log: []}
    this.source = source
    this.createWorker = createWorker
  }

  addEventListener(name, handler) {
    this.eventHandlers[name].push(handler)
  }

  dispatchEvent(name, event) {
    for (const fn of this.eventHandlers[name]) {
      fn(event)
    }
  }

  start() {
    this.worker = this.createWorker(this.source)
    globalThis.addEventListener('message', e => {
      if (e.source === this.worker.source) {
        if (e.data[0] === 'log') {
          this.dispatchEvent('log', e.data[1])
        }
      }
    })
  }
}
```

## Server Runner

This runs the server inside of Deno.

## Simulated Server Runner

This runs the server inside of an iFrame, using simulated resources.

`SimulatedServerRunner.js`

```js
import {ServerWrapper} from '/ServerWrapper.js'

const runSource = `<!doctype html>
<html charset="utf-8">
<head></head>
<body>
<script type="module">
addEventListener('message', async e => {
  if (e.data[0] === 'source') {
    await import('data:text/javascript;base64,' + btoa(e.data[1]))
  }
})
</script>
</body>
</html>`

const initAppServer = `const appServer = new AppServer({
  log(data) {
    parent.postMessage(['log', data], '*')
  }
})`

export class SimulatedServerRunner {
  constructor({el}) {
    this.el = el
    this.eventHandlers = {log: []}
  }

  createWorker(source) {
    const frame = document.createElement('iframe')
    frame.addEventListener('load', () => {
      frame.contentWindow.postMessage(['source', source], '*')
    })
    frame.src = 'data:text/html;base64,' + btoa(runSource)
    this.el.append(frame)
    return {
      frame,
      get source() { return frame.contentWindow },
    }
  }

  addEventListener(name, handler) {
    this.eventHandlers[name].push(handler)
  }

  dispatchEvent(name, event) {
    for (const fn of this.eventHandlers[name]) {
      fn(event)
    }
  }

  start() {
    const source = __source.slice(
      ...Array.from(readBlocksWithNames(__source)).find(({name}) => name === 'AppServer.js').contentRange
    ) + '\n' + initAppServer
    this.serverWrapper = new ServerWrapper({
      createWorker: this.createWorker.bind(this),
      source,
    })
    this.serverWrapper.addEventListener('log', e => {
      this.dispatchEvent('log', e)
    })
    this.serverWrapper.start()
  }
}
```

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
import {SharedComponents} from '/SharedComponents.js'
import {SimulatedServerRunner} from '/SimulatedServerRunner.js'

export class DevView extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    this.logs = this.createLogs()
    this.views = {
      client1: document.createElement('div'),
      client2: document.createElement('div'),
      logs: this.logs.el,
    }
    for (const [key, view] of Object.entries(this.views)) {
      view.classList.add(key, 'tab-content', 'hidden')
    }
    this.views.client1.classList.remove('hidden')
    this.tabs = SharedComponents.createTabs(
      {name: 'client1', label: 'Client 1'},
      {name: 'client2', label: 'Client 2'},
      {name: 'logs', label: 'Logs'},
    )
    this.tabs.el.addEventListener('tab-select', e => {
      this.views[e.detail.previous.name]?.classList.add('hidden')
      this.views[e.detail.current.name]?.classList.remove('hidden')
    })
    this.shadowRoot.append(this.tabs.el, ...(Object.values(this.views)))
    this.start()
  }

  createLogs() {
    const el = document.createElement('div')
    return {
      el,
      append({source, message}) {
        const el = document.createElement('div')
        const sourceEl = document.createElement('strong')
        const messageEl = document.createElement('span')
        el.classList.add('log-message')
        sourceEl.innerText = source
        messageEl.innerText = message
        el.append(sourceEl, messageEl)
        this.el.append(el)
      }
    }
  }

  start() {
    const el = document.createElement('el')
    this.logs.el.append(el)
    this.simulatedServerRunner = new SimulatedServerRunner({el})
    this.simulatedServerRunner.addEventListener('log', e => {
      this.logs.append(e)
    })
    this.simulatedServerRunner.start()
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
        .tab-content.hidden {
          display: none;
        }
        .logs {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 3px;
          padding: 3px;
        }
        .logs iframe {
          border: none;
          height: 5px;
          width: 5px;
        }
        .log-message {
          border: 1px solid #fff5;
          border-radius: 3px;
          padding: 3px;
          display: flex;
          gap: 5px;
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
