# ContainerFrame

### DON'T USE THIS THINKING YOU CAN JUST RUN ANY AND ALL UNTRUSTED CODE! It is still under development. It may not work well, and probably won't work 100%, as every so often an unexpected exfiltration bug shows up in browsers. Another goal of this, in case it doesn't work very well, is to try bring attention to exfiltration prevention to browser vendors. To find out what is needed, look at security sensitive apps with plugin and environments and what they use. Currently Figma is using WebAssembly. That may be needed for your project. It will mean interfacing between the DOM and the code running in WebAssembly.

**Help is wanted for finding ways to bypass the protection this attempts to provide. Please contact us for help or if you find any issues.**

This is a frame for running JavaScript with some extra protection against [Data Exfiltration](https://en.wikipedia.org/wiki/Data_exfiltration). It only targets modern browsers and is not guaranteed to work.

It starts with a sandboxed iFrame that has `allow-scripts` in order to run custom JavaScript code that uses the DOM and a strict Content Security Policy. It is hosted in a Data URL so it can work offline and without a custom web server configuration, and uses a nested iFrame to prevent the Content Security Policy from being overridden by navigation.

[The Content Security Policy spec mentions preventing exfiltration.](https://w3c.github.io/webappsec-csp/#exfiltration) However, there is at least one defense against exfiltration in the Content Security Policy that [hasn't shipped in browsers yet](https://wpt.fyi/results/content-security-policy/webrtc?label=stable&aligned), which is [`webrtc: block`](https://www.w3.org/TR/CSP3/#directive-webrtc). There is another that is in flux, which is prefetching. [Here's a search for exfiltration in the issues for webappsec-csp.](https://github.com/w3c/webappsec-csp/issues?q=exfiltration)

The attempted defense against WebRTC this project makes is by running a bit of code that attempts to remove access to WebRTC objects like RTCPeerConnection before any JavaScript code is allowed to run, and enforcing that this bit of code has been run by only allowing the setup function and files prefixed with a call to the setup function to run using [Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) hashes (SHAs) in the Content-Security-Policy. Attempts are being made to find bypasses. Please let us know if you find one. Due to the frame only having a Data URL for an origin, it can't bypass by creating an iFrame and accessing RTCPeerConnection through `iframeElement.contentWindow.RTCPeerConnection`. It can't bypass it by deleting RTCPeerConnection on the global object, thanks to the change in browsers to provide a [proxy to `window`](https://developer.mozilla.org/en-US/docs/Glossary/WindowProxy) rather than an object with a prototype chain available. It also can't bypass it by starting an RTC Peer Connection it through HTML or CSS, because JavaScript is needed to start connections with WebRTC. Inline JavaScript HTML attributes like `onclick` are blocked by the CSP, and even if they weren't, they would still be subject to the same hashes (SHAs).

For this component to run, all the JavaScript code needs to be known before the frame is loaded. It adds a call to the start of the script running the lockdown function, and adds a SHA to the Content-Security-Policy in the outer frame with the call prepended before hashing it. These SHAs apply to the outer iframe, the inner iframe, and anything nested beneath it.

To change the scripts, either replace it with a new frame, or create an overlayed sibling frame rather than a child frame. This technique will be used for a playground environment.

## TODO:

- [x] Display the initial ContainerFrame in a FrameGroup
- [x] Build the files needed for the ContainerFrame with a ProxyFrame
- [x] Add a view in the FrameGroup with a ProxyFrame
- [x] Have the ProxyFrame create a MessageChannel and use it to send a message to the enclosing page with scripts
- [x] Have the FrameGroup create a ContainerFrame with the content
- [ ] Load app-view
  - [x] Rename AppView to ExampleView
  - [ ] include build, AppView and dependencies
  - [ ] build scripts and place into ContainerFrame
- [ ] Load notebook inside AppView
  - [ ] pass load message from ContainerFrame to ProxyFrame
- [ ] Have ProxyFrame update dimensions everywhere

The ContainerFrame can do the same build that the app does to load AppView. It's in `host.md`. Once that's set up it can build the pages nested beneath that.

## ContainerFrame

`ContainerFrame.js`

```js
export class ContainerFrame extends HTMLElement {
  #fnName
  #prefix
  #innerFrameScript
  #innerFrame
  #outerFrameScript
  #lockdownScript

  constructor() {
    super()
    this.#fnName = 'GlobalLockdown'
    this.#prefix = `${this.#fnName}()\n\n`
    this.#innerFrameScript = `addEventListener('message', async e => {
  if (e.data[0] === 'scripts') {
    for (const script of e.data[1]) {
      const scriptEl = document.createElement('script')
      scriptEl.type = 'module'
      scriptEl.textContent = script
      document.head.append(scriptEl)
    }
  }
}, {once: true})`
    this.#innerFrame = `<!doctype html>
<html>
<head>
  <title>doc</title>
<script type="module">${this.#innerFrameScript}</script>
</head>
<body>
</body>
</html>`
    this.#outerFrameScript = `let iframe = undefined
addEventListener('message', e => {
  if (e.source === parent && e.data[0] === 'scripts') {
    iframe = document.createElement('iframe')
    iframe.sandbox = 'allow-scripts'
    iframe.addEventListener('load', async () => {
      const data = e.data[1]
      iframe.contentWindow.postMessage(['scripts', e.data[1]], '*')
    })
    iframe.src = ${JSON.stringify(`data:text/html;base64,${btoa(this.#innerFrame)}`)}
    document.body.replaceChildren(iframe)
  } else if (e.source !== parent) {
    parent.postMessage(e.data, '*', [...(e.data[2] ?? []), ...e.ports])
  }
})`
    this.#lockdownScript = `globalThis.GlobalLockdown = function() {
  function replacementFn() { throw new Error('WebRTC call blocked') }
  if (!globalThis.lockdownComplete) {
    Object.defineProperties(window, Object.fromEntries(
      Object.getOwnPropertyNames(window).filter(name => name.includes('RTC')).map(
        name => ([name, {value: replacementFn, configurable: false, writable: false}])
      )
    ))
    globalThis.lockdownComplete = true
  }
  try {
    new RTCPeerConnection()
  } catch (err) {
    return
  }
  throw new Error('Expected error creating WebRTC object')
}
GlobalLockdown()`
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({mode: 'open'})
      this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    }
    if (!this.framePromise) {
      this.framePromise = this.initFrame()
    }
  }

  handleMessage = e => {
    if (e.data[0] === '__resize') {
      this.updateDisplay(e.data[1])
    }
  }

  updateDisplay = displayInfo => {
    const parentRect = this.parentFrame.getBoundingClientRect()
    const width = displayInfo.width
    const height = Math.min(
      displayInfo.height,
      parentRect.height - displayInfo.top
    )
    this.classList.toggle('visible', displayInfo.visible)
    this.style.setProperty('--top', `${displayInfo.top}px`)
    this.style.setProperty('--left', `${displayInfo.left}px`)
    this.style.setProperty('--width', `${width}px`)
    this.style.setProperty('--height', `${height}px`)
  }

  checkForwardDeclarations(script) {
    if (script.includes(this.#fnName)) {
      throw new Error(`possible forward declaration found for ${this.#fnName}`)
    }
  }

  async getSha(src) {
    const data = new TextEncoder().encode(src)
    const shaData = await crypto.subtle.digest('SHA-384', data)
    return await new Promise(r => {
      const fr = new FileReader()
      fr.onload = () => r(fr.result.split(',')[1])
      fr.readAsDataURL(new Blob([shaData]))
    })
  }

  async initFrame() {
    const scripts = [...this.scripts]
    for (const script of scripts) {
      this.checkForwardDeclarations(script)
    }
    const prefixedScripts = scripts.map(script => `${this.#prefix}${script}`)
    const allScripts = [
      this.#outerFrameScript,
      this.#innerFrameScript,
      this.#lockdownScript,
      ...prefixedScripts
    ]
    const results = await Promise.allSettled(
      allScripts.map(script => this.getSha(script))
    )
    const scriptShas = results.map(result => {
      if (result.status === 'rejected') {
        throw new Error('Digest failed')
      } else {
        return `'sha384-${result.value}'`
      }
    })
    const meta = document.createElement('meta')
    meta.setAttribute('http-equiv', 'Content-Security-Policy')
    meta.setAttribute('content', [
      `default-src data:`,
      `style-src data: 'unsafe-inline' 'unsafe-eval'`,
      `script-src 'unsafe-eval' ${scriptShas.join(' ')}`,
      `script-src-attr 'none'`,
      `webrtc 'block'`,
    ].join('; '))
    const metaTag = meta.outerHTML
    this.frame = document.createElement('iframe')
    const outerFrame = `<!doctype html>
<html>
  <head>
    ${metaTag}
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
  border: 0;
  width: 100%;
  height: 100%;
}
</style>
  </head>
  <body>
<script type="module">${this.#outerFrameScript}</script>
  </body>
</html>`
    this.frame.src = `data:text/html;base64,${btoa(outerFrame)}`
    this.frame.addEventListener('load', () => {
      this.frame.contentWindow.postMessage(['scripts', allScripts], '*')
    }, {once: true})
    this.shadowRoot.append(this.frame)
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: flex;
          align-items: stretch;
          box-sizing: border-box;
          position: relative;
        }
        *, *:before, *:after {
          box-sizing: inherit;
        }
        :hist(:not(.root)) {
          display: none;
        }
        :host(:not(.root).visible) {
          display: block;
          position: absolute;
          top: var(--top, 0);
          left: var(--left, 0);
          width: var(--width, 0);
          height: var(--height, 0);
        }
        iframe {
          border: 0;
          height: 100%;
          width: 100%;
        }
      `)
    }
    return this._styles
  }
}
```

A ProxyFrame sends messages through postMessage to the enclosing FrameGroup to create, resize, hide, message, and remove a virtually nested frame.

`ProxyFrame.js`

```js
export class ProxyFrame extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.display()
    this.observer = new ResizeObserver(this.handleResize)
    this.observer.observe(this)
  }

  disconnectedCallback() {
    this.channel.port1.postMessage(['__remove'])
    this.observer.unobserve(this)
  }

  async display() {
    this.channel = new MessageChannel()
    const {scripts} = this
    parent.postMessage(
      ['initProxyFrame',
       {scripts, ...this.getDisplayInfo()}],
      '*',
      [this.channel.port2]
    )
    setTimeout(() => this.channel.port1.postMessage('test'), 50)
  }

  getDisplayInfo() {
    const visible = this.checkVisibility()
    const {top, left, width, height} = this.getBoundingClientRect()
    return {top, left, width, height, visible}
  }

  handleResize = entries => {
    this.channel.port1.postMessage(['__resize', this.getDisplayInfo()])
  }
}

customElements.define('proxy-frame', ProxyFrame)
```

FrameGroup manages ContainerFrame objects and allows them to create, message, resize, and remove virtually nested ContainerFrames through postMessage.

`FrameGroup.js`

```js
export class FrameGroup extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
  }

  connectedCallback() {
    this.shadowRoot.append(document.createElement('slot'))
    addEventListener('message', this.handleMessage)
  }

  disconnectedCallback() {
    removeEventListener('message', this.handleMessage)
  }

  handleMessage = e => {
    const frame = [...this.querySelectorAll('container-frame')].find(el => (
      el.frame.contentWindow === e.source
    ))
    if (frame) {
      const {scripts, ...display} = e.data[1]
      const newFrame = document.createElement('container-frame')
      const port = e.ports[0]
      port.onmessage = e => { newFrame.handleMessage(e) }
      newFrame.scripts = scripts
      newFrame.parentFrame = frame
      newFrame.updateDisplay(display)
      this.append(newFrame)
    }
  }
}
```

`ExampleContent.js`

```js
function run() {
  const style = document.createElement('style')
  style.textContent = `
    body {
      display: flex;
      flex-direction: column;
    }
    proxy-frame {
      height: 50vh;
    }
  `
  document.head.append(style)
  const proxyFrame = document.createElement('proxy-frame')
  proxyFrame.scripts = [`document.body.append('in ProxyFrame'); document.body.style = 'background: green'`]
  document.body.append('testing')
  document.body.append(proxyFrame)
}
```

`ExampleView.js`

```js
export class ExampleView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
  }

  connectedCallback() {
    this.initExample()
    // this.initAppView()
  }

  initExample() {
    const globalStyle = document.createElement('style')
    globalStyle.textContent = `
      html {
        box-sizing: border-box;
      }
      *, *:before, *:after {
        box-sizing: inherit;
      }
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
      example-view {
        flex-grow: 1;
      }
    `
    document.head.append(globalStyle)
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: flex;
        align-items: stretch;
      }
      container-frame.root {
        width: 500px;
        height: 50vh;
      }
    `
    this.shadowRoot.appendChild(style)
    const frame = document.createElement('container-frame')
    frame.classList.add('root')
    let proxyFrameSrc, exampleContentSrc
    for (const block of readBlocksWithNames(__source)) {
      if (block.name === 'ProxyFrame.js') {
        proxyFrameSrc = __source.slice(...block.contentRange)
      } else if (block.name === 'ExampleContent.js') {
        exampleContentSrc = __source.slice(...block.contentRange)
      }
    }
    frame.scripts = [
      proxyFrameSrc,
      exampleContentSrc + `\nrun()\n`,
    ]
    const frameGroup = document.createElement('frame-group')
    frameGroup.append(frame)
    this.shadowRoot.append(frameGroup)
  }

  initAppView() {
    const blocks = Object.fromEntries(
      Array.from(readBlocksWithNames(__source)).filter(block => (
        block.name !== undefined
      )).map(block => (
        [block.name, block]
      ))
    )
    console.log(blocks)
  }
}
```

`notebook.json`

```json
{
  "dataFiles": [],
  "includeFiles": [
    "app-view.md",
    "_welcome.md",
    "blank-page.md",
    "intro.md",
    "app-content.md",
    "planets.csv.md",
    "table.md",
    "editable-data-table.md",
    "data-cards.md",
    "notebook-view.md",
    "code-edit-new.md",
    "tabs-new.md",
    "codemirror-bundle.md",
    "font.woff2.md"
  ]
}
```

`app.js`

```js
import {ContainerFrame} from '/ContainerFrame.js'
// import {ProxyFrame} from '/ProxyFrame.js'
import {FrameGroup} from '/FrameGroup.js'
import {ExampleView} from '/ExampleView.js'

customElements.define('container-frame', ContainerFrame)
// customElements.define('proxy-frame', ProxyFrame)
customElements.define('frame-group', FrameGroup)
customElements.define('example-view', ExampleView)

const el = document.createElement('example-view')
document.body.append(el)
```

This tests that script SHAs are applied to the child iframe.

`app-test-sha.js`

```js
document.body.style = `background-color: #fff`

async function prepareScript(src) {
  const data = new TextEncoder().encode(src)
  const shaData = await crypto.subtle.digest('SHA-256', data)
  const shaText = await new Promise(r => {
    const fr = new FileReader()
    fr.onload = () => r(fr.result.split(',')[1])
    fr.readAsDataURL(new Blob([shaData]))
  })
  const sha = `'sha256-${shaText}'`
  const el = document.createElement('script')
  el.type = 'module'
  el.textContent = src
  const tag = el.outerHTML
  return {src, sha, tag}
}

async function setup() {
  const script1 = await prepareScript(`
addEventListener('message', e => {
  const frameSrc = e.data
  const iframe = document.createElement('iframe')
  iframe.sandbox = 'allow-scripts'
  iframe.src = \`data:text/html;base64,\${btoa(frameSrc)}\`
  document.body.append(iframe)
})
`)
  const script2 = await prepareScript(`document.body.append('hello')`)
  const script3 = await prepareScript(`document.body.append('test')`)
  const cspTag = document.createElement('meta')
  cspTag.setAttribute('http-equiv', 'Content-Security-Policy')
  cspTag.setAttribute(
    'content',
    [`default-src data:`, `script-src ${script1.sha} ${script2.sha}`].join('; ')
  )
  const frameSrc = `<!doctype html>
<html>
  <head>
    ${cspTag.outerHTML}
  </head>
  <body>
    ${script1.tag}
  </body>
</html>`
  const subFrameSrc = `<!doctype html>
<html>
  <head>
  </head>
  <body>
    ${script2.tag}
    ${script3.tag}
  </body>
</html>`
  const iframe = document.createElement('iframe')
  iframe.sandbox = 'allow-scripts'
  iframe.src = `data:text/html;base64,${btoa(frameSrc)}`
  iframe.addEventListener('load', () => {
    iframe.contentWindow.postMessage(subFrameSrc, '*')
  })
  document.body.append(iframe)
}

//setup()
```

Some miscellaneous checks of how the global object works:

`test.html`

```html
<!doctype html>
<html>
  <head>
<script type="module">
document.body.style = `background-color: #fff`

async function prepareScript(src) {
  const data = new TextEncoder().encode(src)
  const shaData = await crypto.subtle.digest('SHA-256', data)
  const shaText = await new Promise(r => {
    const fr = new FileReader()
    fr.onload = () => r(fr.result.split(',')[1])
    fr.readAsDataURL(new Blob([shaData]))
  })
  const sha = `'sha256-${shaText}'`
  const el = document.createElement('script')
  el.type = 'module'
  el.textContent = src
  const tag = el.outerHTML
  return {src, sha, tag}
}

async function setup() {
  const script1 = await prepareScript(`
addEventListener('message', e => {
  const frameSrc = e.data
  const iframe = document.createElement('iframe')
  iframe.sandbox = 'allow-scripts'
  iframe.src = \`data:text/html;base64,\${btoa(frameSrc)}\`
  document.body.append(iframe)
})
`)
  const script2 = await prepareScript(`document.body.append('hello')`)
  const script3 = await prepareScript(`document.body.append('test')`)
  const script4 = await prepareScript(`document.body.append('wow')`)

  const dataScript = `delete window.RTCPeerConnection; const wp = new Proxy({}, {get(target, prop, receiver) { console.log('got ' + prop + ' on ' + target); return Reflect.get({[prop]: window[prop]}, prop) }}); export {wp as window}`
  const dataUrl = `data:text/javascript;charset=utf-8;base64,${btoa(dataScript)}`
  const script5 = await prepareScript(`import { window } from '${dataUrl}';
  const globalThis = window
  const frames = window
  const self = window
  console.log(new RTCPeerConnection())
  console.log(RTCPeerConnection)

  document.body.append(window.location.href.split(',')[0])`)
  const script6 = await prepareScript(dataScript)
  const cspTag = document.createElement('meta')
  cspTag.setAttribute('http-equiv', 'Content-Security-Policy')
  cspTag.setAttribute(
    'content',
    [`default-src data:`, `script-src ${script1.sha} ${script2.sha} ${script4.sha} ${script5.sha} ${script6.sha}`].join('; ')
  )
  const frameSrc = `<!doctype html>
<html>
  <head>
    ${cspTag.outerHTML}
    <link rel="modulepreload" href="${dataUrl}" integrity=${script6.sha}>
  </head>
  <body>
    ${script1.tag}
  </body>
</html>`
  const subFrameSrc = `<!doctype html>
<html>
  <head>
    <link rel="modulepreload" href="${dataUrl}" integrity=${script6.sha}>
  </head>
  <body>
    ${script2.tag}
    ${script3.tag}
    ${script4.tag}
    ${script5.tag}
  </body>
</html>`
  const iframe = document.createElement('iframe')
  iframe.sandbox = 'allow-scripts'
  iframe.src = `data:text/html;base64,${btoa(frameSrc)}`
  iframe.addEventListener('load', () => {
    iframe.contentWindow.postMessage(subFrameSrc, '*')
  }, {once: true})
  document.body.append(iframe)
}

setup()
</script>
  </head>
  <body>
  </body>
</html>
```