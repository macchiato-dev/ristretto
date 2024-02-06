# Transform

`TransformView.js`

```js
export default class TransformView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.imageEl = document.createElement('img')
    this.imageEl.src = this.dataUrl
    this.imageEl.load = e => {
      this.showImage()
      this.buildHistogram()
    }
    this.canvasEl = document.createElement('canvas')
    this.canvasEl.setAttribute('height', '256')
    this.canvasEl.setAttribute('width', '256')
    this.shadowRoot.append(this.imageEl, this.canvasEl)
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
        display: flex;
        height: 100vh;
        flex-direction: column;
        align-items: center;
        justify-content: space-around;
      }
      img {
        display: none;
        width: 256px;
        height: 256px;
      }
      canvas {
        height: 256px;
        width: 256px;
      }
    `
    this.shadowRoot.append(style)
    this.showImage()
    this.buildHistogram()
  }

  get dataUrl() {
    for (const block of readBlocksWithNames(__source)) {
      if (block.name === 'image.png') {
        const data = __source.slice(...block.contentRange)
        return `data:image/png;base64,${data}`
      }
    }
  }

  showImage() {
    const ctx = this.canvasEl.getContext('2d')
    ctx.drawImage(this.imageEl, 0, 0, 256, 256, 0, 0, 256, 256)
  }

  buildHistogram() {
    
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
  <g transform="scale(0.7)">
    <image href="${image('image.png.md/image.png')}" width="128" height="128" />
  </g>
</svg>
```
