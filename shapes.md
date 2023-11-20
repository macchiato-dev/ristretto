# Shapes

`ShapesView.js`

```js
export default class ShapesView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    const colorsEl = document.createElement('div')
    colorsEl.classList.add('colors')
    colorsEl.append(...([1,2,3].map(n => {
      const el = document.createElement('div')
      el.classList.add(`color${n}`)
      return el
    })))
    this.shadowRoot.append(colorsEl)
  }

  connectedCallback() {
    const globalStyle = document.createElement('style')
    globalStyle.textContent = `
      body {
        margin: 0;
        padding: 0;
      }
    `
    document.head.append(globalStyle)
    const style = document.createElement('style')
    style.textContent = `
      :host {
        height: 100vh;
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .colors {
        width: 80vmin;
        height: 80vmin;
        display: flex;
        gap: 10px;
        align-items: center;
        justify-content: center;
      }
      .color1 {
        width: 80px;
        height: 80px;
        background-color: #1aa452;
      }
      .color2 {
        width: 180px;
        height: 180px;
        border-radius: 100%;
        background-color: #0f6bad;
      }
      .color3 {
        background-color: #a47801;
        border-radius: 100% 0 100% 100%;
        width: 150px;
        height: 150px;
      }
    `
    this.shadowRoot.append(style)
  }
}

customElements.define('shapes-view', ShapesView)
```

`run.js`

```js
async function setup() {
  const shapesView = document.createElement('shapes-view')
  document.body.replaceChildren(shapesView)
}

await setup()
```

