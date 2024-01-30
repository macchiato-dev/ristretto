# Transform

`TransformView.js`

```js
export default class TransformView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.imageEl = document.createElement('img')
    this.imageEl.src = this.dataUrl
    this.radioListEl = document.createElement('div')
    this.radioListEl.append(...['no filter', 'sepia', 'grayscale'].map(name => {
      const label = document.createElement('label')
      const el = document.createElement('input')
      el.name = 'filter'
      el.type = 'radio'
      el.value = name
      if (name === 'no filter') {
        el.checked = true
      }
      el.addEventListener('change', (e) => {
        if (!this.imageStyle) {
          this.imageStyle = document.createElement('style')
          this.imageStyle.textContent = ''
          this.shadowRoot.append(this.imageStyle)
        }
        if (e.target.value === 'no filter') {
          this.imageStyle.textContent = ''
        } else if (e.target.value === 'sepia') {
          this.imageStyle.textContent = 'img { filter: sepia(.7) }'
        } else if (e.target.value === 'grayscale') {
          this.imageStyle.textContent = 'img { filter: grayscale(.7) }'
        }
      })
      label.append(el, name)
      return label
    }))
    this.shadowRoot.append(this.imageEl, this.radioListEl)
  }

  connectedCallback() {
    const globalStyle = document.createElement('style')
    globalStyle.textContent = `
      body {
        margin: 0;
        padding: 0;
        color: rgb(191, 207, 205);
      }
    `
    document.head.append(globalStyle)
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: flex;
        height: 100vh;
        flex-direction: column;
        align-items: center;
        justify-content: space-around;
      }
    `
    this.shadowRoot.append(style)
  }

  get dataUrl() {
    for (const block of readBlocksWithNames(__source)) {
      if (block.name === 'image.png') {
        const data = __source.slice(...block.contentRange)
        return `data:image/png;base64,${data}`
      }
    }
  }
}

customElements.define('transform-view', TransformView)
```

`run.js`

```js
async function setup() {
  const transformView = document.createElement('transform-view')
  document.body.replaceChildren(transformView)
}

await setup()
```

`thumbnail.svg`

```svg
<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <style>
    svg {
      filter: sepia(.7);  // filters on more specific elemtns are not showing in Safari
    }
  </style>
  <g transform="scale(1.4)">
    <image href="${image('image.png.md/image.png')}" width="128" height="128" />
  </g>
</svg>
```
