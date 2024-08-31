# Host

This is the host for Ristretto. It facilitates uploading data, downloading data, and following links in a controlled manner.

## Development

The interface for showing *upload*, *download*, and *follow link* is developed here.

`AccessView.js`

```js
export class AccessView extends HTMLElement {
  closeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
    <path fill="currentColor" d="m12 13.4l-2.9 2.9q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7l2.9-2.9l-2.9-2.875q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l2.9 2.9l2.875-2.9q.275-.275.7-.275t.7.275q.3.3.3.713t-.3.687L13.375 12l2.9 2.9q.275.275.275.7t-.275.7q-.3.3-.712.3t-.688-.3z"/>
  </svg>`

  warnings = {
    download: (
      'This download dialog was triggered from inside the Ristretto sandbox. ' +
      'The sandbox protects content from leaving the sandbox, even with untrusted code, but ' +
      'downloading, along with copying to the clipboard and following links, is a way content ' +
      'can leave the sandbox. Be careful when downloading, opening, and sending files.'
    ),
    link: (
      'This link dialog was triggered from inside the Ristretto sandbox. ' +
      'The sandbox protects content from leaving the sandbox, even with untrusted code, but ' +
      'following links, along with downloading and copying to the clipboard, is a way content ' +
      'can leave the sandbox. Be careful when downloading, opening, and sending files.'
    ),
  }

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
    const header = document.createElement('div')
    header.classList.add('header')
    this.heading = document.createElement('h1')
    const closeButton = document.createElement('button')
    closeButton.innerHTML = this.closeIcon
    closeButton.addEventListener('click', () => {
      this.close()
    })
    header.append(this.heading, closeButton)
    this.content = document.createElement('div')
    this.content.classList.add('content')
    this.footer = document.createElement('div')
    this.footer.classList.add('footer')
    this.dialogEl.append(header, this.content, this.footer)
    this.shadowRoot.append(this.dialogEl)
  }

  show() {
    this.dialogEl.classList.add('opened')
    this.dialogEl.showModal()
  }

  close() {
    this.dialogEl.classList.remove('opened')
    this.dialogEl.classList.add('closing')
    setTimeout(() => {
      this.dialogEl.close()
      this.dialogEl.classList.remove('closing')
      for (const url of this.urls ?? []) {
        URL.revokeObjectURL(url)
      }
    }, 350)
  }

  get open() {
    return this.dialogEl.open
  }

  download(name, blob) {
    if (this.open) {
      return
    }
    const files = [{name, blob}].map(({name, blob}) => {
      const url = URL.createObjectURL(blob)
      return {name, url}
    })
    this.urls = files.map(({url}) => url)
    this.heading.innerText = 'Download'
    this.footer.innerText = this.warnings.download
    const fileDivs = files.map(({name, url}) => {
      const div = document.createElement('div')
      div.classList.add('download-file')
      const nameEl = document.createElement('input')
      nameEl.type = 'text'
      nameEl.value = name
      const a = document.createElement('a')
      a.innerText = 'Download'
      a.href = url
      a.download = name
      nameEl.addEventListener('input', () => {
        a.download = nameEl.value
      })
      const sizeEl = document.createElement('div')
      sizeEl.innerText = `${blob.size} bytes`
      sizeEl.classList.add('size')
      div.append(nameEl, a, sizeEl)
      return div
    })
    this.content.replaceChildren(...fileDivs)
    this.show()
  }

  link(url) {
    if (this.open) {
      return
    }
    this.heading.innerText = 'Link'
    const links = [url].map(url => {
      const a = document.createElement('a')
      a.href = url
      a.innerText = url
      a.target = '_blank'
      return a
    })
    this.content.replaceChildren(...links)
    this.footer.innerText = this.warnings.link
    this.show()
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        dialog {
          margin-top: 20px;
          margin-right: 20px;
          min-width: 300px;
          max-width: 400px;
          border: 2px solid rgba(50, 50, 50);
          border-radius: 6px;
          font-family: sans-serif;
          background: rgb(206 212 220);
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
        .header {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
        }
        .header h1 {
          padding: 0;
          margin: 0;
          flex-grow: 1;
          font-size: 24px;
        }
        .header button {
          all: unset;
          cursor: pointer;
        }
        .content, .footer {
          margin-top: 10px;
        }
        .download-file {
          display: flex;
          flex-direction: row;
          gap: 10px;
          align-items: center;
        }
        input[type=text] {
          flex-grow: 1;
          outline: none;
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(0, 0, 0, 0.4);
          padding: 5px;
          border-radius: 4px;
          font-size: 16px;
        }
        .download-file .size {
          font-size: 12px;
          min-width: 80px;
          text-align: right;
          padding-right: 10px;
        }
        .footer {
          padding-right: 10px;
          font-size: 14px;
          margin-top: 20px;
          margin-bottom: 5px;
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
    for (const action of ['Download', 'Link']) {
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

  download() {
    this.accessView.download('test.txt', new Blob(['test'], {type: 'text/plain'}))
  }

  link() {
    this.accessView.link('https://en.wikipedia.org/wiki/Mars')
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
    <meta http-equiv="Content-Security-Policy" content="default-src data: 'unsafe-inline' 'unsafe-eval'; connect-src https://ristretto.codeberg.page/notebook.md; frame-src https://ristretto.codeberg.page/frame.html; child-src: 'none'; webrtc 'block';">
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
access-view {
  position: absolute;
  left: -100px;
  top: 0px;
  width: 5px;
  height: 5px;
}
</style>
  </head>
  <body>
    <access-view></access-view>
    <iframe id="frame" src="/frame.html"></iframe>
<script type="module">
export class AccessView extends HTMLElement {
  closeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
    <path fill="currentColor" d="m12 13.4l-2.9 2.9q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7l2.9-2.9l-2.9-2.875q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l2.9 2.9l2.875-2.9q.275-.275.7-.275t.7.275q.3.3.3.713t-.3.687L13.375 12l2.9 2.9q.275.275.275.7t-.275.7q-.3.3-.712.3t-.688-.3z"/>
  </svg>`

  warnings = {
    download: (
      'This download dialog was triggered from inside the Ristretto sandbox. ' +
      'The sandbox protects content from leaving the sandbox, even with untrusted code, but ' +
      'downloading, along with copying to the clipboard and following links, is a way content ' +
      'can leave the sandbox. Be careful when downloading, opening, and sending files.'
    ),
    link: (
      'This link dialog was triggered from inside the Ristretto sandbox. ' +
      'The sandbox protects content from leaving the sandbox, even with untrusted code, but ' +
      'following links, along with downloading and copying to the clipboard, is a way content ' +
      'can leave the sandbox. Be careful when downloading, opening, and sending files.'
    ),
  }

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
    const header = document.createElement('div')
    header.classList.add('header')
    this.heading = document.createElement('h1')
    const closeButton = document.createElement('button')
    closeButton.innerHTML = this.closeIcon
    closeButton.addEventListener('click', () => {
      this.close()
    })
    header.append(this.heading, closeButton)
    this.content = document.createElement('div')
    this.content.classList.add('content')
    this.footer = document.createElement('div')
    this.footer.classList.add('footer')
    this.dialogEl.append(header, this.content, this.footer)
    this.shadowRoot.append(this.dialogEl)
  }

  show() {
    this.dialogEl.classList.add('opened')
    this.dialogEl.showModal()
  }

  close() {
    this.dialogEl.classList.remove('opened')
    this.dialogEl.classList.add('closing')
    setTimeout(() => {
      this.dialogEl.close()
      this.dialogEl.classList.remove('closing')
      for (const url of this.urls ?? []) {
        URL.revokeObjectURL(url)
      }
    }, 350)
  }

  get open() {
    return this.dialogEl.open
  }

  download(name, blob) {
    if (this.open) {
      return
    }
    const files = [{name, blob}].map(({name, blob}) => {
      const url = URL.createObjectURL(blob)
      return {name, url}
    })
    this.urls = files.map(({url}) => url)
    this.heading.innerText = 'Download'
    this.footer.innerText = this.warnings.download
    const fileDivs = files.map(({name, url}) => {
      const div = document.createElement('div')
      div.classList.add('download-file')
      const nameEl = document.createElement('input')
      nameEl.type = 'text'
      nameEl.value = name
      const a = document.createElement('a')
      a.innerText = 'Download'
      a.href = url
      a.download = name
      nameEl.addEventListener('input', () => {
        a.download = nameEl.value
      })
      const sizeEl = document.createElement('div')
      sizeEl.innerText = `${blob.size} bytes`
      sizeEl.classList.add('size')
      div.append(nameEl, a, sizeEl)
      return div
    })
    this.content.replaceChildren(...fileDivs)
    this.show()
  }

  link(url) {
    if (this.open) {
      return
    }
    this.heading.innerText = 'Link'
    const links = [url].map(url => {
      const a = document.createElement('a')
      a.href = url
      a.innerText = url
      a.target = '_blank'
      return a
    })
    this.content.replaceChildren(...links)
    this.footer.innerText = this.warnings.link
    this.show()
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        dialog {
          margin-top: 20px;
          margin-right: 20px;
          min-width: 300px;
          max-width: 400px;
          border: 2px solid rgba(50, 50, 50);
          border-radius: 6px;
          font-family: sans-serif;
          background: rgb(206 212 220);
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
        .header {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
        }
        .header h1 {
          padding: 0;
          margin: 0;
          flex-grow: 1;
          font-size: 24px;
        }
        .header button {
          all: unset;
          cursor: pointer;
        }
        .content, .footer {
          margin-top: 10px;
        }
        .download-file {
          display: flex;
          flex-direction: row;
          gap: 10px;
          align-items: center;
        }
        input[type=text] {
          flex-grow: 1;
          outline: none;
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(0, 0, 0, 0.4);
          padding: 5px;
          border-radius: 4px;
          font-size: 16px;
        }
        .download-file .size {
          font-size: 12px;
          min-width: 80px;
          text-align: right;
          padding-right: 10px;
        }
        .footer {
          padding-right: 10px;
          font-size: 14px;
          margin-top: 20px;
          margin-bottom: 5px;
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

customElements.define('access-view', AccessView)

const frame = document.getElementById('frame')
frame.addEventListener('load', async () => {
  const data = new Uint8Array(await (await fetch('/notebook.md')).arrayBuffer())
  frame.contentWindow.postMessage(['notebook', data], '*', [data.buffer])
})
addEventListener('message', e => {
  if (e.source === frame.contentWindow) {
    const [command, ...args] = e.data
    const accessView = document.querySelector('access-view')
    if (command === 'download') {
      const [download] = args
      const blob = new Blob([download.data], {type: download.type})
      accessView.download(download.name, blob)
    } else if (command === 'link') {
      const [url] = args
      accessView.link(url)
    }
  }
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
    <meta http-equiv="Content-Security-Policy" content="default-src data: 'unsafe-inline' 'unsafe-eval'; connect-src 'none'; frame-src https://ristretto.codeberg.page/inner-frame.html; webrtc 'block';">
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
  if (e.origin === 'null') {
    parent.postMessage(e.data, '*', [...(e.data[2] ?? []), ...e.ports])
  } else {
    if (e.data[0] === 'notebook') {
      iframe = document.createElement('iframe')
      iframe.sandbox = 'allow-scripts'
      iframe.addEventListener('load', async () => {
        const data = e.data[1]
        iframe.contentWindow.postMessage(['notebook', data], '*', [data.buffer])
      })
      iframe.src = `/inner-frame.html?role=frame`
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

`inner-frame.html`

```html
<!doctype html>
<html>
<head>
  <meta http-equiv="Content-Security-Policy" content="default-src data: 'unsafe-inline' 'unsafe-eval'; connect-src 'none'; child-src 'none'; webrtc 'block';">
  <title>doc</title>
<script type="module">
const re = /(?:^|\n)\s*\n`entry.js`\n\s*\n```.*?\n(.*?)```\s*(?:\n|$)/s
addEventListener('message', async e => {
  if (e.data[0] === 'notebook') {
    Object.defineProperties(window, Object.fromEntries(
      Object.getOwnPropertyNames(window).filter(name => name.includes('RTC')).map(
        name => ([name, {value: '', configurable: false, writable: false}])
      )
    ))
    globalThis.__source = new TextDecoder().decode(e.data[1])
    const entrySrc = globalThis.__source.match(re)[1]
    await import(`data:text/javascript;base64,${btoa(entrySrc)}`)
  }
}, {once: true})
</script>
</head>
<body>
</body>
</html>
```

## Planning

### Link Popover

A link popover can contain a link that can be tabbed onto or clicked on. The link will only be available immediately if the mouse starts outside and moves inside, otherwise it will only work after a delay to prevent clickjacking.
