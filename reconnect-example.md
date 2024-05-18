# Reconnect Example

`app.js`

```js
import {Hello} from '/hello.js'
customElements.define('m-hello', Hello)

const el = document.createElement('m-hello')
document.body.appendChild(el)

async function* doStuff() {
  el.color = '#ffbbcc'
  yield undefined
  document.body.removeChild(el)
  yield undefined
  document.body.appendChild(el)
}

const myIter = await doStuff()

const btn = document.createElement('button')
btn.innerText = 'Go'
btn.addEventListener('click', async () => {
  await myIter.next()
})
document.body.appendChild(btn)
```

`hello.js`

```js
export class Hello extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      h1 {
        color: var(--color, white);
      }
    `
    this.shadowRoot.appendChild(style)
    if (!this.h1) {
      this.h1 = document.createElement('h1')
      this.h1.innerText = 'Hello'
      this.shadowRoot.appendChild(this.h1)
    }
  }

  disconnectedCallback() {
    this.h1.innerText = 'Reconnected'
  }

  set color(color) {
    this.shadowRoot.host.style.setProperty(
      '--color', color
    )
  }
}
```
