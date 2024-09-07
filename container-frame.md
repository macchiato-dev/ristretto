# ContainerFrame

### DON'T USE THIS THINKING YOU CAN JUST RUN ANY AND ALL UNTRUSTED CODE! It is still under development. It may not work well, and probably won't work 100%, as every so often an unexpected exfiltration bug shows up in browsers. Another goal of this, in case it doesn't work very well, is to try bring attention to exfiltration prevention to browser vendors. To find out what is needed, look at security sensitive apps with plugin and environments and what they use. Currently Figma is using WebAssembly. That may be needed for your project. It will mean interfacing between the DOM and the code running in WebAssembly.

**Help is wanted for finding ways to bypass the protection this attempts to provide. Please contact us for help or if you find any issues.**

This is a frame for running arbitrary JavaScript with some extra protection against [Data Exfiltration](https://en.wikipedia.org/wiki/Data_exfiltration). It only targets modern browsers and is not guaranteed to work.

It starts with a sandboxed iFrame that has `allow-scripts` for usefulness and a strict Content Security Policy. It is hosted in a Data URL so it can work offline and without a custom web server configuration, and uses a nested iFrame to prevent the Content Security Policy from being overridden by navigation.

[The Content Security Policy spec mentions preventing exfiltration.](https://w3c.github.io/webappsec-csp/#exfiltration) However, there is one defense against exfiltration in the Content Security Policy that hasn't shipped in browsers yet, which is `webrtc: block`. There is another that is in flux, which is prefetching. [Here's a search for exfiltration in the issues for webappsec-csp.](https://github.com/w3c/webappsec-csp/issues?q=exfiltration)

The attempted defense against WebRTC this project makes is by running a bit of code that attempts to remove access to WebRTC objects like RTCPeerConnection before any JavaScript code is allowed to run, and enforcing that this bit of code has been run by only allowing the setup script and files prefixed with a call to the setup script to run using hashes (SHAs) in the Content-Security-Policy. Attempts are being made to find bypasses, but so far it appears to hold up. Please let us know if you find one. Due to the frame only having a Data URL for an origin, it can't bypass by creating an iFrame and accessing RTCPeerConnection through `iframeElement.contentWindow.RTCPeerConnection`. It can't bypass it by deleting RTCPeerConnection on the global object. It also can't by starting an RTC Peer Connection it through HTML or CSS, as JavaScript is needed to do that. Inline JavaScript HTML attributes like `onclick` are blocked by the CSP, and even if they weren't, they would still be subject to the same hashes (SHAs).

For this to run, all the JavaScript code needs to be known before the frame is loaded. It adds a call to the start of the script running the lockdown function, and adds a SHA to the Content-Security-Policy in the outer frame with the call prepended before hashing it. These SHAs apply to the outer iframe, the inner iframe, and anything nested beneath it.

To change the scripts, either create a new frame, or create an overlayed sibling frame rather than a child frame. This technique will be used for a playground environment.

## ContainerFrame

`ContainerFrame.js`

```js
import { ScriptRegistry } from '/ScriptRegistry.js'

export class ContainerFrame extends HTMLElement {
  #fnName
  #prefix
  #lockdownScript
  #lockdownSha

  constructor() {
    super()
    this.#fnName = 'GlobalLockdown'
    this.#prefix = `${this.#fnName}()\n\n`
    this.#lockdownScript = `globalThis.GlobalLockdown = function() {
  function replacementFn() { throw new Error('WebRTC call blocked') }
  if (!globalThis.lockdownComplete) {
    Object.defineProperties(window, Object.fromEntries(
      Object.getOwnPropertyNames(window).filter(name => name.includes('RTC')).map(
        name => ([name, {value: replacementFn, configurable: false, writable: false}])
      )
    ))
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
    }
    if (!this.framePromise) {
      this.framePromise = this.initFrame()
    }
  }

  checkForwardDeclarations(script) {
    if (script.includes(this.#fnName)) {
      throw new Error('')
    }
  }

  addCall(script) {
    return `${this.#prefix}${script}`
  }

  async getSha(src) {
    const data = new TextEncoder().encode(src)
    const shaData = await crypto.subtle.digest('SHA-384', data)
    const shaText = await new Promise(r => {
      const fr = new FileReader()
      fr.onload = () => r(fr.result.split(',')[1])
      fr.readAsDataURL(new Blob([shaData]))
    })
    return `'sha384-${shaText}'`
  }

  async initFrame() {
    const results = await Promise.allSettled(
      this.scripts.map(script => this.getSha(script))
    )
    this.scriptShas = results.map(result => {
      if (result.status === 'rejected') {
        throw new Error('Digest failed')
      } else {
        return `sha384-${result.value}`
      }
    })
    const scriptShas = [this.scriptRegistry.lockdownSha]
    this.frame = document.createElement('iframe')
    const meta = document.createElement('meta')
    meta.setAttribute('http-equiv', 'Content-Security-Policy')
    meta.setAttribute('content', [
      `default-src data:`,
      `style-src data: 'unsafe-inline' 'unsafe-eval'`,
      `script-src 'unsafe-eval' ${scriptShas.join(' ')}`,
      `webrtc 'block'`,
    ].join('; '))
    const metaTag = meta.outerHTML
  }
}
```

`AppView.js`

```js
export class AppView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
  }

  connectedCallback() {
    const globalStyle = document.createElement('style')
    globalStyle.textContent = `
      body {
        background: #2d1d0e;
        max-width: 600px;
        margin: auto;
        color: #d7d7d7;
      }
    `
    document.head.append(globalStyle)
    const style = document.createElement('style')
    style.textContent = `
      :host {
        
      }
      h1 {
        color: #fff596;
        text-align: center;
        font-size: 48px;
        letter-spacing: 2px;
        font-family: Mohave;
        margin: 10px;
      }
      a {
        color: #fff596;
      }
      p {
        line-height: 1.4;
      }
      code {
        border: 2px #bbb7;
        background: #bbb5;
        padding: 2px;
        border-radius: 3px;
      }
    `
    this.shadowRoot.appendChild(style)
    this.frame = document.createElement('container-frame')
    this.frame.scripts = []
    this.shadowRoot.append(this.frame)
  }
}
```

`notebook.json`

```json
{
  "dataFiles": []
}
```

`app.js`

```js
import {ContainerFrame} from '/ContainerFrame.js'
import {AppView} from '/AppView.js'

customElements.define('container-frame', ContainerFrame)
customElements.define('app-view', AppView)

const el = document.createElement('app-view')
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

setup()
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