# Color Picker

This color picker is built from looking at the color picker on [DuckDuckGo](https://duckduckgo.com/?q=hsv+to+rgb&ia=answer).

On the left side is a square with a color in the upper right, white in the upper left, and black on the bottom. On the right side of that is a bar with the different color hues. To the right of that are colors.

Moving in the square in the left to the upper right, S and V in HSV get set to zero. Selecting the red at the top of the hue bar, the RGB gets set to 255, 0, 0. Then moving down, this can be observed:

- It starts with all red. RGB is 255, 0, 0 and hue is 0
- Green gets added to red. RGB is 255, 255, 0 and hue is 60
- The red gets removed, leaving just green. RGB is 0, 255, 0 and hue is 120
- Blue gets added to green. RGB is 0, 255, 255 and hue is 180.
- The green gets removed, leaving just blue. RGB is 0, 0, 255 and hue is 240.
- Red gets added to blue. RGB is 255, 0, 255 and hue is 300.
- The blue gets removed, leaving just red. RGB is back to 255, 0, 0 and the hue is 0.

On the left side, saturation and value can be identified. On the left side, it is white to black, indicating that from left to right the saturation goes from 0 to 100. The remaining is value. It goes 0 to 100 from bottom to top.

`ColorPicker.js`

```js
export class ColorPicker extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.setStyles(true)
    this.shadeSelect = document.createElement('div')
    this.shadeSelect.classList.add('shade-select')
    this.shadeSelectOverlay = document.createElement('div')
    this.shadeSelectOverlay.classList.add('shade-select-overlay')
    this.shadeSelect.append(this.shadeSelectOverlay)
    this.shadeSelectThumb = document.createElement('div')
    this.shadeSelectThumb.classList.add('shade-select-thumb')
    this.shadeSelect.append(this.shadeSelectThumb)
    this.hueSelect = document.createElement('div')
    this.hueSelect.classList.add('hue-select')
    this.hueSelectThumb = document.createElement('div')
    this.hueSelectThumb.classList.add('hue-select-thumb')
    this.hueSelect.append(this.hueSelectThumb)
    this.hueSelectThumb.addEventListener('mousedown', e => {
      this.hueDragOffset = e.clientY - this.hueSelectThumb.clientTop
      e.stopPropagation()
    })
    this.hueSelect.addEventListener('mousedown', e => {
      this.hueDragOffset = e.clientY - this.hueSelectThumb.clientTop
      this.moveHueThumb(e)
    })
    this.hueSelectThumb.addEventListener('mouseup', () => {
      this.hueDragOffset = undefined
    })
    this.hueSelect.addEventListener('mouseleave', () => {
      this.hueDragOffset = undefined
    })
    this.hueSelect.addEventListener('mousemove', e => {
      if (this.hueDragOffset !== undefined) {
        this.moveHueThumb(e)
      }
    })
    this.shadowRoot.append(this.shadeSelect, this.hueSelect)
  }

  disconnectedCallback() {
    this.setStyles(false)
  }

  moveHueThumb(e) {
    const y = e.pageY - this.hueSelect.offsetTop
    const hueTop = `${Math.max(0, Math.min(y, this.hueSelect.clientHeight))}px`
    const hue = Math.round(y * 360/this.hueSelect.clientHeight) % 360
    const hueColor = `hsl(${hue} 100% 50%)`
    this.style.setProperty('--hue-top', hueTop)
    this.style.setProperty('--hue-color', hueColor)
  }

  setStyles(enabled) {
    this.shadowRoot.adoptedStyleSheets = enabled ? [this.constructor.styles] : []
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: grid;
          grid-template-columns: max-content max-content;
          padding: 10px;
          gap: 10px;
        }
        * {
          box-sizing: border-box;
        }
        .shade-select {
          display: grid;
          grid-template-columns: 200px;
          grid-template-rows: 200px;
          background: linear-gradient(to top, #000000, #0000ff);
          mix-blend-mode: screen;
          position: relative;
        }
        .shade-select-overlay {
          background: linear-gradient(to top, #00000000, #ffff00ff);
          mask-image: linear-gradient(to right, #ffffffff, #00000000);
          grid-row: 1;
          grid-column: 1;
          mix-blend-mode: screen;
        }
        .shade-select-thumb {
          position: absolute;
          margin-top: -8px;
          margin-left: -8px;
          top: var(--shade-top, 0px);
          left: var(--shade-right, 200px);
          height: 16px;
          width: 16px;
          border: 2px solid #cccccc;
          border-radius: 8px;
          background-color: var(--shade-select-overlay, #0000ffaa);
        }
        .hue-select {
          background: linear-gradient(to bottom, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);
          display: flex;
          position: relative;
          width: 20px;
        }
        .hue-select-thumb {
          position: absolute;
          margin-top: -8px;
          margin-left: -5px;
          top: var(--hue-top, 133.33px);
          height: 16px;
          width: 30px;
          border: 2px solid #cccccc;
          border-radius: 8px;
          background-color: var(--hue-color, #0000ff);
        }
      `)
    }
    return this._styles
  }
}
```

`ExampleView.js`

```js
export class ExampleView extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.setStyles(true)
    this.colorPicker = document.createElement('color-picker')
    document.body.append(this.colorPicker)
  }

  disconnectedCallback() {
    this.setStyles(false)
  }

  setStyles(enabled) {
    this.shadowRoot.adoptedStyleSheets = enabled ? [this.constructor.styles] : []
    const sheets = [...document.adoptedStyleSheets].filter(v => v !== this.constructor.globalStyles)
    document.adoptedStyleSheets = [...sheets, ...(enabled ? [this.constructor.globalStyles] : [])]
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: flex;
          flex-direction: column;
          padding: 10px;
          align-items: center;
        }
      `)
    }
    return this._styles
  }

  static get globalStyles() {
    if (!this._globalStyles) {
      this._globalStyles = new CSSStyleSheet()
      this._globalStyles.replaceSync(`
        body {
          display: grid;
          grid-template-columns: 1fr;
        }
      `)
    }
    return this._globalStyles
  }
}
```

`app.js`

```js
import {ColorPicker} from '/ColorPicker.js'
import {ExampleView} from '/ExampleView.js'

customElements.define('color-picker', ColorPicker)
customElements.define('example-view', ExampleView)

async function setup() {
  const exampleView = document.createElement('example-view')
  document.body.append(exampleView)
}

await setup()
```
