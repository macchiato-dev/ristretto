# Split Pane

This is a draggable split pane.

It uses a grid to manage the split. It starts using the `mousedown` event on the drag handle, and uses temporary `mousemove` and `mouseup` events on `document.body` to complete the action.

`split-view.js`

```js
export class SplitView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.start = this.start.bind(this)
    this.mousemove = this.mousemove.bind(this)
    this.mouseup = this.mouseup.bind(this)
    this.mousedown = this.mousedown.bind(this)
    this.addEventListener('mousedown', this.start)
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      :host {
        cursor: col-resize;
      }
    `
    this.shadowRoot.appendChild(style)
  }

  start(e) {
    const {offsetX} = e
    e.preventDefault()
    e.stopPropagation()
    document.body.removeEventListener('mousemove', this.mousemove)
    document.body.removeEventListener('mouseup', this.mouseup)
    document.body.addEventListener('mousemove', this.mousemove)
    document.body.addEventListener('mouseup', this.mouseup)
    if (!this.tempStyle) {
      this.tempStyle = document.createElement('style')
      this.tempStyle.textContent = `body { cursor: col-resize !important }`
    }
    document.head.append(this.tempStyle)
    this.dispatchEvent(new CustomEvent(
      'split-view-start', {bubbles: true, detail: {offsetX}}
    ))
  }

  mousemove(e) {
    const {offsetX} = e
    e.preventDefault()
    e.stopPropagation()
    this.dispatchEvent(new CustomEvent(
      'split-view-resize', {bubbles: true, detail: {offsetX}}
    ))
  }

  mouseup(e) {
    const {offsetX} = e
    e.preventDefault()
    e.stopPropagation()
    this.end({offsetX})
  }

  mousedown(e) {
    const {offsetX} = e
    e.preventDefault()
    e.stopPropagation()
    this.end({offsetX})
  }

  end({offsetX}) {
    document.body.removeEventListener('mousemove', this.mousemove)
    document.body.removeEventListener('mouseup', this.mouseup)
    document.body.removeEventListener('mousedown', this.mousedown)
    if (this.tempStyle) {
      this.tempStyle.remove()
      this.tempStyle = undefined
    }
    this.dispatchEvent(new CustomEvent(
      'split-view-end', {bubbles: true, detail: {offsetX}}
    ))
  }
}
```

`example-view.js`

```js
export class ExampleView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    const sidebar = document.createElement('aside')
    this.split = document.createElement('split-view')
    this.split.addEventListener('split-view-resize', e => {
      const x = e.detail.offsetX - this.offsetLeft
      this.style.setProperty('--sidebar-width', `${x + 5}px`)
    })
    const main = document.createElement('main')
    this.shadowRoot.append(sidebar, this.split, main)
  }

  connectedCallback() {
    const globalStyle = document.createElement('style')
    globalStyle.textContent = `
      html {
        box-sizing: border-box;
      }
      *, *:before, *:after {
        box-sizing: inherit;
      }
    `
    document.head.append(globalStyle)
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: grid;
        height: 100vh;
        background: green;
        grid-template-columns: var(--sidebar-width, 0.5fr) auto 1fr;
      }
      aside {
        background: color-mix(in oklch, plum 70%, blue);
      }
      split-view {
        min-width: 3px;
        background: #000;
      }
    `
    this.shadowRoot.appendChild(style)
  }
}
```

`app.js`

```js
import {SplitView} from '/split-view.js'
import {ExampleView} from '/example-view.js'

customElements.define('split-view', SplitView)
customElements.define('example-view', ExampleView)

const el = document.createElement('example-view')
document.body.appendChild(el)
```
