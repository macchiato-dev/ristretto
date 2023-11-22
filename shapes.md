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
        flex-wrap: wrap;
        gap: 5px 30px;
        align-items: center;
        justify-content: space-around;
      }
      .color1 {
        width: 25vmin;
        height: 25vmin;
        background-color: #1aa452;
      }
      .color2 {
        width: 25vmin;
        height: 25vmin;
        border-radius: 100%;
        background-color: #0f6bad;
      }
      .color3 {
        background-color: transparent;
        border-left: 15vmin solid transparent;
        border-top: 15vmin solid transparent;
        border-right: 15vmin solid #a47801;
        border-bottom: 15vmin solid #a47801;
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
    <rect x="10" y="10" width="35" height="35" class="color1" />
    <circle cx="75" cy="27" r="18" class="color2" />
    <polygon points="30,95 70,95 70,55" class="color3" />
  </g>
</svg>
```
