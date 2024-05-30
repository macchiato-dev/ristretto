# Client & Server Simulator

`notebook.json`

```json
{
  "importFiles": [
  ]
}
```

`SimulatorNav.js`

```js
export class SimulatorNav extends HTMLElement {
  constructor() {
    super()
    this.addressInput = document.createElement('input')
    this.addressInput.setAttribute('type', 'text')
  }

  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    const backButton = document.createElement('button')
    backButton.innerText = '<'
    backButton.disabled = true
    const forwardButton = document.createElement('button')
    forwardButton.innerText = '>'
    forwardButton.disabled = true
    const goButton = document.createElement('button')
    goButton.innerText = 'Go'
    goButton.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('nav-go'), {bubbles: true})
    })
    this.addressInput.addEventListener('keydown', e => {
      if (e.code === 'Enter') {
        this.dispatchEvent(new CustomEvent('nav-go'), {bubbles: true})
      }
    })
    this.shadowRoot.append(backButton, forwardButton, this.addressInput, goButton)
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: flex;
          flex-direction: row;
          gap: 5px;
        }
        input[type=text] {
          flex-grow: 1;
        }
      `)
    }
    return this._styles
  }

  get url() {
    return this.addressInput.value
  }

  set url(value) {
    this.addressInput.value = value
  }
}
```

`SimulatorView.js`

```js
export class SimulatorView extends HTMLElement {
  constructor() {
    super()
    this.nav = document.createElement('simulator-nav')
  }

  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    this.frame = document.createElement('iframe')
    this.frame.sandbox = 'allow-scripts'
    this.shadowRoot.append(this.nav, this.frame)
    this.nav.addEventListener('nav-go', () => {
      this.load()
    })
    this.load()
    addEventListener('message', e => {
      if (e.source === this.frame.contentWindow) {
        if (e.data[0] === 'nav') {
          this.url = e.data[1]
          this.load()
        }
      }
    })
  }

  addScript(page) {
    const script = `
      // TODO: move to separate file
      // TODO: handle inside open shadow roots
      const handled = new WeakSet()
      setInterval(() => {
        const elements = [...document.querySelectorAll('a')].filter(el => !handled.has(el))
        for (const el of elements) {
          handled.add(el)
        }
        setTimeout(() => {
          for (const el of elements) {
            el.addEventListener('click', e => {
              parent.postMessage(['nav', e.target.href], '*')
              e.preventDefault()
            })
          }
        }, 50)
      }, 50)
    `
    return page.replace(
      /<\/body>|$/,
      `<script type="module">await import(\`data:text/javascript;base64,${btoa(script)}\`)</script>`
    )
  }

  async load() {
    const newFrame = document.createElement('iframe')
    newFrame.sandbox = 'allow-scripts'
    let page
    try {
      const resp = await this.server.fetch(new Request(this.url))
      page = await resp.text()
    } catch (err) {
      this.frame.remove()
      this.frame = newFrame
      this.shadowRoot.append(this.frame)
      return
    }
    const pageWithScript = this.addScript(page)
    newFrame.src = `data:text/html;base64,${btoa(pageWithScript)}`
    this.frame.remove()
    this.frame = newFrame
    this.shadowRoot.append(this.frame)
  }

  get url() {
    return this.nav.url
  }

  set url(value) {
    this.nav.url = value
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: flex;
          flex-direction: column;
          gap: 5px;
          align-items: stretch;
        }
        iframe {
          border: 1px solid #bbb;
          flex-grow: 1;
          background: #fff;
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
    this.simulatorView = document.createElement('simulator-view')
    this.simulatorView.server = {
      async fetch(request) {
        const url = new URL(request.url)
        if (url.host === 'localhost:3000') {
          const html = `
            <p><b>Received request from: ${request.url}</b></p>
            <p><a href="https://wikipedia.org/">Go to other site</a></p>
          `
          return new Response(html, {'content-type': 'text/html'})
        } else if (url.host === 'wikipedia.org') {
          const html = `
            <p>Wikipedia stub</p>
          `
          return new Response(html, {'content-type': 'text/html'})
        }
      }
    }
    this.simulatorView.url = 'http://localhost:3000/'
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
import {SimulatorNav} from '/SimulatorNav.js'
import {SimulatorView} from '/SimulatorView.js'

customElements.define('simulator-nav', SimulatorNav)
customElements.define('simulator-view', SimulatorView)
customElements.define('example-view', ExampleView)

async function setup() {
  const exampleView = document.createElement('example-view')
  document.body.append(exampleView)
}

await setup()
```
