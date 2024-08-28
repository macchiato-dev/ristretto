# Header with font

`ExampleView.js`

```js
export class ExampleView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.el = document.createElement('h1')
    this.el.innerText = 'macchiato.dev'
    this.shadowRoot.appendChild(this.el)
  }

  connectedCallback() {
    const font = this.getFont()
    const globalStyle = document.createElement('style')
    globalStyle.textContent = `
      body {
        background: #2d1d0e;
      }
      @font-face {
        font-family: 'Mohave';
        font-display: block;
        src: url(data:application/octet-stream;base64,${font}) format(woff2);
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
      }
    `
    this.shadowRoot.appendChild(style)
    setTimeout(() => { this.el.classList.add('loaded') }, 500)
  }

  getFont() {
    for (const block of readBlocksWithNames(__source)) {
      const blockSrc = __source.slice(...block.contentRange)
      if (block.name === 'font.woff2') {
        return blockSrc.replaceAll(/\s*/g, '')
      }
      for (const subBlock of readBlocksWithNames(blockSrc)) {
        if (subBlock.name === 'font.woff2') {
          return blockSrc.slice(...subBlock.contentRange).replaceAll(/\s*/g, '')
        }
      }
    }
  }
}
```

`app.js`

```js
import {ExampleView} from '/ExampleView.js'
customElements.define('example-view', ExampleView)

const el = document.createElement('example-view')
document.body.append(el)
```

`notebook.json`

```json
{
  "dataFiles": [
    ["font.woff2.md", "font.woff2"]
  ]
}
```

`thumbnail.svg`

```svg
<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <style>
    svg {
      background-color: #2d1d0e;
    }
    text {
      font: 14px sans-serif;
      fill: #fff596;
    }
  </style>

  <g transform="translate(2 4)">
    <text x="28" y="65">font</text>
  </g>
</svg>
```
