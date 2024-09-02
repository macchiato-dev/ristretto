# ContainerFrame

This attempts to remove the ability for a any code running an in `iframe` to access certain global variables by removing them from `globalThis`. It does this by prefixing all custom code with a call to a function that must be defined before the module is loaded, and checking that the function isn't declared within the module in a way that would be overridden from below where it's called.

How does it prefix all custom code? It has a Content-Security-Policy with a script-src that doesn't include `unsafe-inline` and only includes SHAs for the custom code files given to it, with the prefixed function call added and the code checked for occurrences of the function name.

This Content-Security-Policy is applied to all iframes and workers beneath it. With the iframes and workers being beneath a sandboxed `data:` iframe, they can't access contentWindow of another iframe, making it so that it can't gain access to those certain global variables by that means.

## ContainerFrame

This creates an iFrame with a Content-Security-Policy containing all hashes when it's [connected](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements#custom_element_lifecycle_callbacks), and then proceeds to create a nested iFrame beneath it when it's loaded, so that the iFrame with the Content-Security-Policy can't be replaced with one without the Content-Security-Policy by navigating away from it.

`ContainerFrame.js`

```js
export class ContainerFrame extends HTMLElement {
  constructor() {
    super()
    this.scripts = []
    this.fnName = 'GlobalLockdown'
    this.callPrefix = `${this.fnName}()\n\n`
    this.lockdownScript = `
globalThis.GlobalLockdown = function() {
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
GlobalLockdown()
`.trimLeft()
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
    if (script.includes(this.fnName)) {
      throw new Error('')
    }
  }

  addCall(script) {
    return `${this.callPrefix}${script}`
  }

  async getSha(script) {
    this.checkForwardDeclarations(script)
    const scriptWithCall = this.addCall(script)
    const data = new TextEncoder().encode(scriptWithCall)
    const hash = await crypto.subtle.digest('SHA-384', data)
    return hash
  }

  async getLockdownSha() {
    const data = new TextEncoder().encode(this.lockdownSha)
    const hash = await crypto.subtle.digest('SHA-384', data)
    return hash
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
    const lockdownSha = await this.getLockdownSha()
    this.scriptShas.unshift(`sha384-${lockdownSha}`)
    this.frame = document.createElement('iframe')
    const meta = document.createElement('meta')
    meta.setAttribute('http-equiv', 'Content-Security-Policy')
    const defaultSrc = `default-src data:`
    const styleSrc = `style-src data: 'unsafe-inline' 'unsafe-eval'`
    const scriptSrc = `script-src 'unsafe-eval' ${this.scriptShas.join(' ')}`
    const webRtc = `webrtc 'block'`
    meta.setAttribute('content', [
      defaultSrc, styleSrc, scriptSrc, webRtc
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
    const runFrame = document.createElement('container-frame')
    this.shadowRoot.append(runFrame)
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