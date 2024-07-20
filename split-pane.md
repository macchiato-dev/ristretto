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
    this.pointermove = this.pointermove.bind(this)
    this.pointerup = this.pointerup.bind(this)
    this.pointerdown = this.pointerdown.bind(this)
    this.addEventListener('pointerdown', this.start)
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      :host {
        cursor: col-resize;
      }
      :host([vertical]) {
        cursor: row-resize;
      }
    `
    this.shadowRoot.appendChild(style)
  }

  start(e) {
    const {offsetX, offsetY} = e
    e.preventDefault()
    e.stopPropagation()
    this.shadowRoot.host.setPointerCapture(e.pointerId)
    this.startOffset = (
      this.vertical ?
      offsetY - this.shadowRoot.host.clientTop :
      offsetX - this.shadowRoot.host.clientLeft
    )
    document.body.removeEventListener('pointermove', this.pointermove)
    document.body.removeEventListener('pointerup', this.pointerup)
    document.body.addEventListener('pointermove', this.pointermove)
    document.body.addEventListener('pointerup', this.pointerup)
    if (!this.tempStyle) {
      this.tempStyle = document.createElement('style')
      this.tempStyle.textContent = `body { cursor: col-resize !important }`
    }
    document.head.append(this.tempStyle)
    this.dispatchEvent(new CustomEvent(
      'split-view-start', {bubbles: true, detail: {offsetX, offsetY}}
    ))
  }

  get vertical() {
    return this.hasAttribute('vertical')
  }

  set vertical(value) {
    if (value) {
      this.setAttribute('vertical', '')
    } else {
      this.removeAttribute('vertical')
    }
  }

  getOffsetDetail(e) {
    const key = `offset${this.vertical ? 'Y' : 'X'}`
    return {[key]: e[key] - this.startOffset}
  }

  pointermove(e) {
    e.preventDefault()
    e.stopPropagation()
    this.dispatchEvent(new CustomEvent(
      'split-view-resize', {bubbles: true, detail: this.getOffsetDetail(e)}
    ))
  }

  pointerup(e) {
    const {offsetX, offsetY} = e
    e.preventDefault()
    e.stopPropagation()
    this.end({offsetX, offsetY})
  }

  pointerdown(e) {
    const {offsetX, offsetY} = e
    e.preventDefault()
    e.stopPropagation()
    this.end({offsetX, offsetY})
  }

  end({offsetX, offsetY}) {
    document.body.removeEventListener('pointermove', this.pointermove)
    document.body.removeEventListener('pointerup', this.pointerup)
    document.body.removeEventListener('pointerdown', this.pointerdown)
    if (this.tempStyle) {
      this.tempStyle.remove()
      this.tempStyle = undefined
    }
    this.dispatchEvent(new CustomEvent(
      'split-view-end', {bubbles: true, detail: {offsetX, offsetY}}
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
      this.style.setProperty('--main-width', `${x}px`)
    })
    const main = document.createElement('main')
    this.mainSplit = document.createElement('split-view')
    this.mainSplit.vertical = true
    this.mainSplit.addEventListener('split-view-resize', e => {
      const y = e.detail.offsetY - this.offsetTop
      this.style.setProperty('--top-height', `${y}px`)
    })
    const top = document.createElement('div')
    top.classList.add('top')
    const bottom = document.createElement('div')
    bottom.classList.add('bottom')
    main.append(top, this.mainSplit, bottom)
    this.shadowRoot.append(main, this.split, sidebar)
  }

  connectedCallback() {
    const globalStyle = document.createElement('style')
    globalStyle.textContent = `
      html {
        box-sizing: border-box;
      }
      body {
        margin: 0;
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
        grid-template-columns: var(--main-width, 2fr) auto 1fr;
      }
      aside {
        background: color-mix(in oklch, plum 70%, blue);
      }
      :host > split-view {
        min-width: 3px;
        background: #000;
      }
      main {
        display: grid;
        grid-template-rows: var(--top-height, 1fr) auto 1fr;
      }
      main split-view {
        min-height: 3px;
        background: #000;
      }
      .bottom {
        background-color: cyan;
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
