# ContainerFrame

This attempts to remove the ability for a any code running an in `iframe` to access certain global variables by removing them from `globalThis`. It does this by prefixing all custom code with a call to a function that must be defined before the module is loaded, and checking that the function isn't declared within the module in a way that would be overridden from below where it's called.

How does it prefix all custom code? It has a Content-Security-Policy with a script-src that doesn't include `unsafe-inline` and only includes SHAs for the custom code files given to it, with the prefixed function call added and the code checked for occurrences of the function name.

This Content-Security-Policy is applied to all iframes and workers beneath it. With the iframes and workers being beneath a sandboxed `data:` iframe, they can't access contentWindow of another iframe, making it so that it can't gain access to those certain global variables by that means.

## ScriptRegistry

`ScriptRegistry.js`

```js
export class ScriptRegistry {
  #fnName
  #prefix
  #shas
  #lockdownScript
  #lockdownSha

  constructor() {
    this.#fnName = 'GlobalLockdown'
    this.#prefix = `${this.#fnName}()\n\n`
    this.#shas = new Set()
    this.#lockdownScript = lockdownScript = `globalThis.GlobalLockdown = function() {
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

  checkShas(shas) {
    
  }

  async addScript(str) {
    if (!this.#lockdownSha) {
      this.#lockdownSha = await this.getSha(this.#lockdownScript)
    }
  }

  get lockdownScript() {
    return this.#lockdownScript
  }

  get prefix() {
    return this.#prefix
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
}
```

## ContainerFrame

This creates an iFrame with a Content-Security-Policy containing all hashes when it's [connected](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements#custom_element_lifecycle_callbacks), and then proceeds to create a nested iFrame beneath it when it's loaded, so that the iFrame with the Content-Security-Policy can't be replaced with one without the Content-Security-Policy by navigating away from it.

`ContainerFrame.js`

```js
export class ContainerFrame extends HTMLElement {
  constructor() {
    super()
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
    ${cspTag.outerHTML}
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