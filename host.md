# Host

This is the host for Ristretto. It facilitates uploading data, downloading data, and following links in a controlled manner.

## Development

The interface for showing *upload*, *download*, and *follow link* is developed here.

`AccessView.js`

```js
export class AccessView extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    const sheets = [...document.adoptedStyleSheets].filter(v => v !== this.constructor.globalStyles)
    document.adoptedStyleSheets = [...sheets, this.constructor.globalStyles]
    this.dialogEl = document.createElement('dialog')
    this.dialogEl.addEventListener('click', e => {
      const rect = this.dialogEl.getBoundingClientRect()
      const clickedInside = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      )
      if (e.target === this.dialogEl && !clickedInside) {
        this.close()
      }
    })
    this.shadowRoot.append(this.dialogEl)
  }

  open() {
    this.dialogEl.classList.add('opened')
    this.dialogEl.showModal()
  }

  close() {
    this.dialogEl.classList.remove('opened')
    this.dialogEl.classList.add('closing')
    setTimeout(() => {
      this.dialogEl.close()
      this.dialogEl.classList.remove('closing')
    }, 350)
  }

  download() {
    this.open()
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        dialog {
          margin-top: 20px;
          margin-right: 20px;
          min-width: 300px;
          border: 1px solid rgba(0, 0, 0, 0.3);
          border-radius: 6px;
          box-shadow: 0 3px 7px rgba(0, 0, 0, 0.3);
        }
        dialog::backdrop {
          opacity: 0;
          transition: opacity 0.3s ease-in;
          background-color: rgba(127, 127, 127, .20);
        }
        dialog.opened::backdrop {
          opacity: 1;
        }
        dialog.closing {
          visibility: hidden;
        }
        dialog.closing::backdrop {
          visibility: visible;
        }
      `)
    }
    return this._styles
  }

  static get globalStyles() {
    if (!this._globalStyles) {
      this._globalStyles = new CSSStyleSheet()
      this._globalStyles.replaceSync(``)
    }
    return this._globalStyles
  }
}
```

`ExampleView.js`

```js
export class ExampleView extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    const sheets = [...document.adoptedStyleSheets].filter(v => v !== this.constructor.globalStyles)
    document.adoptedStyleSheets = [...sheets, this.constructor.globalStyles]
    this.accessView = document.createElement('access-view')
    this.shadowRoot.append(this.accessView)
    this.buttons = {}
    for (const action of ['Upload', 'Download', 'Link']) {
      const actionName = action.toLowerCase()
      const button = document.createElement('button')
      button.innerText = action
      button.addEventListener('click', () => {
        this[actionName]()
      })
      this.buttons[actionName] = button
    }
    this.shadowRoot.append(...Object.values(this.buttons))
  }

  upload() {

  }

  download() {
    this.accessView.download()
  }

  link() {

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
          background-color: black;
        }
      `)
    }
    return this._globalStyles
  }
}
```

`app.js`

```js
import {AccessView} from '/AccessView.js'
import {ExampleView} from '/ExampleView.js'

customElements.define('access-view', AccessView)
customElements.define('example-view', ExampleView)

async function setup() {
  const exampleView = document.createElement('example-view')
  document.body.append(exampleView)
}

await setup()
```

## Built

This is built except for the URLs - that is, the code above for the Upload, Download, and Link modals is copied into here.

### Top-level page

This page contains a full-screen iframe which contains the CSP wrapper page, `frame.html`, and is what displays the modals.

The web page has the background color so it shows properly on browsers that include the background color in the chrome.

Only the content security policy needs to be changed in order to deploy this to a different location.

`index.html`

```html
<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Security-Policy" content="default-src data: 'unsafe-inline' 'unsafe-eval'; connect-src https://ristretto.codeberg.page/notebook.md; frame-src https://ristretto.codeberg.page/frame.html">
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#55391b">
    <title></title>
<style type="text/css">
body, html {
  background-color: #55391b;
}
body {
  height: 100vh;
  margin: 0;
  display: flex;
  align-items: stretch;
  flex-direction: column;
}
iframe {
  flex-grow: 1;
  border: 0;
}
</style>
  </head>
  <body>
    <iframe id="frame" src="/frame.html"></iframe>
<script type="module">
const frame = document.getElementById('frame')
frame.addEventListener('load', async () => {
  const data = new Uint8Array(await (await fetch('/notebook.md')).arrayBuffer())
  frame.contentWindow.postMessage(['notebook', data], '*', [data.buffer])
})
</script>
  </body>
</html>
```



`frame.html`

```html
<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Security-Policy" content="default-src data: 'unsafe-inline' 'unsafe-eval'; connect-src 'none'">
    <title></title>
<style type="text/css">
body, html {
  background-color: #55391b;
}
body {
  height: 100vh;
  margin: 0;
  display: flex;
  align-items: stretch;
  flex-direction: column;
}
iframe {
  flex-grow: 1;
  border: 0;
}
</style>
  </head>
  <body>
<script type="module">
let iframe = undefined
addEventListener('message', e => {
  if (e.origin === iframe?.contentWindow) {
    parent.postMessage(e.data, '*', [...(e.data[2] ?? []), ...message.ports])
  } else {
    if (e.data[0] === 'notebook') {
      iframe = document.createElement('iframe')
      iframe.sandbox = 'allow-scripts'
      iframe.addEventListener('load', async () => {
        const data = e.data[1]
        iframe.contentWindow.postMessage(['notebook', data], '*', [data.buffer])
      })
      const re = new RegExp('(?:^|\\n)\\s*\\n`entry.js`\\n\\s*\\n```.*?\\n(.*?)```\\s*(?:\\n|$)', 's')
    const src = `
<!doctype html>
<html>
  <head>
    <title>frame</title>
    <meta charset="utf-8">
  </head>
  <body>
<script type="module">
addEventListener('message', e => {
  if (e.source === parent) {
    if (e.data[0] === 'notebook') {
      window.__source = new TextDecoder().decode(e.data[1])
      const re = new RegExp(${JSON.stringify(re.source)}, ${JSON.stringify(re.flags)})
      const entrySrc = window.__source.match(re)[1]
      const script = document.createElement('script')
      script.type = 'module'
      script.textContent = entrySrc
      document.body.append(script)
    }
  }
})
<-script>
  </body>
</html>
      `.trim().replace('-script', '/script')
      iframe.src = `data:text/html;base64,${btoa(src.trim())}`
      // iframe.srcdoc = src.trim()
      document.body.replaceChildren(iframe)
    } else {
      iframe.contentWindow.postMessage(e.data, '*', [...(e.data[2] ?? []), ...e.ports])
    }
  }
})
</script>
  </body>
</html>
```

## Planning

### Link Popover

A link popover can contain a link that can be tabbed onto or clicked on. The link will only be available immediately if the mouse starts outside and moves inside, otherwise it will only work after a delay to prevent clickjacking.
