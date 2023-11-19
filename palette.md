`PaletteView.js`

```js
export default class PaletteView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.shadowRoot.replaceChildren(...([1,2,3].map(n => {
      const el = document.createElement('div')
      el.classList.add(`color${n}`)
      return el
    })
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
        display: grid;
        grid-template-columns: 1fr;
        grid-auto-rows: 1fr;
        height: 100vh;
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      .color1 {
        color: #1aa452;
      }
      .color2 {
        color: #0f6bad;
      }
      .color3 {
        color: #a47801;
      }
    `
    this.shadowRoot.append(style)
  }
}

customElements.add('palette-view', PaletteView)
```

`run.js`

```js
async setup() {
  const paletteView = document.createElement('palette-view')
  document.body.replaceChildren(paletteView)
}

await setup()
```
