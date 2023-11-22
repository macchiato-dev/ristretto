# Palette

`PaletteView.js`

```js
export default class PaletteView extends HTMLElement {
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
        display: grid;
        grid-template-columns: 1fr;
        grid-auto-rows: 1fr;
        gap: 5vmin;
      }
      .color1 {
        background-color: #1aa452;
      }
      .color2 {
        background-color: #0f6bad;
      }
      .color3 {
        background-color: #a47801;
      }
    `
    this.shadowRoot.append(style)
  }
}

customElements.define('palette-view', PaletteView)
```

`run.js`

```js
async function setup() {
  const paletteView = document.createElement('palette-view')
  document.body.replaceChildren(paletteView)
}

await setup()
```

`thumbnail.svg`

```svg
<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <style>
    svg {
      background-color: #fff;
    }
    .color1 {
      fill: #1aa452;
    }
    .color2 {
      fill: #0f6bad;
    }
    .color3 {
      fill: #a47801;
    }
  </style>

  <rect x="0" y="0" width="128" height="128" stroke="#bbb" stroke-width="5" fill="transparent" />
  <g transform="translate(17 15)">
    <rect x="10" y="15" width="75" height="20" class="color1" />
    <rect x="10" y="40" width="75" height="20" class="color2" />
    <rect x="10" y="65" width="75" height="20" class="color3" />
  </g>
</svg>
```
