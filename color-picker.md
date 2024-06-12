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

The area on the left is called the shade selector. The saturation and lightness come from it, and a conversion to RGB is done to update the hex code.

Below are a color input and a text input. The color input varies between browsers. It is sufficient in most desktop browsers but not all mobile browsers, where it is restricted to just selecting from a set of colors.

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
    this.shadeSelectThumb.addEventListener('mousedown', e => {
      this.shadeDragOffset = [
        e.clientX - this.shadeSelectThumb.clientLeft,
        e.clientY - this.shadeSelectThumb.clientTop,
      ]
      e.stopPropagation()
    })
    this.shadeSelect.addEventListener('mousedown', e => {
      this.shadeDragOffset = [
        e.clientX - this.shadeSelectThumb.clientLeft,
        e.clientY - this.shadeSelectThumb.clientTop,
      ]
      this.moveShadeThumb(e)
    })
    this.shadeSelectThumb.addEventListener('mouseup', () => {
      this.shadeDragOffset = undefined
    })
    this.shadeSelect.addEventListener('mouseup', () => {
      this.shadeDragOffset = undefined
    })
    this.shadeSelect.addEventListener('mouseleave', () => {
      this.shadeDragOffset = undefined
    })
    this.shadeSelect.addEventListener('mousemove', e => {
      if (this.shadeDragOffset !== undefined) {
        this.moveShadeThumb(e)
      }
    })
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
    this.hueSelect.addEventListener('mouseup', () => {
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
    this.colorInput = document.createElement('input')
    this.colorInput.setAttribute('type', 'color')
    this.colorTextInput = document.createElement('input')
    const inputArea = document.createElement('div')
    inputArea.classList.add('input-area')
    inputArea.append(this.colorInput, this.colorTextInput)
    this.shadowRoot.append(this.shadeSelect, this.hueSelect, inputArea)
    this.hue = 240
    this.saturation = 1
    this.lightness = 1
    this.updateHueColor()
    this.updateShadeColor()
  }

  disconnectedCallback() {
    this.setStyles(false)
  }

  moveShadeThumb(e) {
    const x = e.pageX - this.shadeSelect.offsetLeft
    const y = e.pageY - this.shadeSelect.offsetTop
    // const hue = Math.round(y * 360/this.shadeSelect.clientHeight) % 360
    // this.updateShadeColor(hue)
    const shadeLeft = Math.max(0, Math.min(x, this.shadeSelect.clientWidth))
    const shadeTop = Math.max(0, Math.min(y, this.shadeSelect.clientHeight))
    this.saturation = shadeLeft / this.shadeSelect.clientWidth
    this.lightness = 1 - (shadeTop / this.shadeSelect.clientHeight)
    this.updateShadeColor()
  }

  moveHueThumb(e) {
    const y = Math.min(Math.max(e.pageY - this.hueSelect.offsetTop, 0), this.hueSelect.clientHeight)
    this.hue = Math.floor(y * 360 / this.hueSelect.clientHeight)
    this.updateHueColor()
    this.updateShadeColor()
  }

  updateHueColor() {
    const hue = this.hue
    let r = 255, g = 0, b = 0
    if (hue > 60 && hue < 120) {
      r = Math.floor((120 - hue) * 256/60)
    } else if (hue >= 120 && hue <= 240) {
      r = 0
    } else if (hue > 240 && hue < 300) {
      r = Math.floor((hue - 240) * 256/60)
    }
    if (hue > 0 && hue < 60) {
      g = Math.floor(hue * 256/60)
    } else if (hue >= 60 && hue <= 180) {
      g = 255
    } else if (hue > 180 && hue < 240) {
      g = Math.floor((240 - hue) * 256/60)
    }
    if (hue > 120 && hue < 180) {
      b = Math.floor((hue - 120) * 256/60)
    } else if (hue >= 180 && hue <= 300) {
      b = 255
    } else if (hue > 300 && hue < 360) {
      b = Math.floor((360 - hue) * 256/60)
    }
    this.hueColorArray = [r, g, b]
    const hueColor = `#` + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('')
    const invertColor = `#` + [r, g, b].map(n => (255 - n).toString(16).padStart(2, '0')).join('') + `ff`
    const hueTop = hue * this.hueSelect.clientHeight / 360
    this.style.setProperty('--hue-color', hueColor)
    this.style.setProperty('--invert-color', invertColor)
    this.style.setProperty('--hue-top', `${hueTop}px`)
  }

  updateShadeColor() {
    console.log(this.lightness)
    this.shadeColorArray = this.hueColorArray.map(n => (
      (this.lightness * n) + ((255 - n) * this.lightness * (1 - this.saturation))
    ))
    console.log(this.hueColorArray.map(n => (
      [
        this.lightness * n
      ]
    )))
    // background: linear-gradient(to top, #000000, var(--hue-color, #0000ff));
    // background: linear-gradient(to top, #00000000, var(--invert-color, #ffff00ff));
    // mask-image: linear-gradient(to left, #00000000, #ffffffff);
    const shadeColor = `#` + this.shadeColorArray.map(n => Math.floor(n).toString(16).padStart(2, '0')).join('')
    this.style.setProperty('--shade-color', shadeColor)
    this.colorInput.value = shadeColor
    this.colorTextInput.value = shadeColor
    const shadeLeft = this.saturation * this.shadeSelect.clientWidth
    const shadeTop = (1 - this.lightness) * this.shadeSelect.clientHeight
    this.style.setProperty('--shade-left', `${shadeLeft}px`)
    this.style.setProperty('--shade-top', `${shadeTop}px`)
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
          background: linear-gradient(to top, #000000, var(--hue-color, #0000ff));
          mix-blend-mode: screen;
          position: relative;
        }
        .shade-select-overlay {
          background: linear-gradient(to top, #00000000, var(--invert-color, #ffff00ff));
          mask-image: linear-gradient(to left, #00000000, #ffffffff);
          grid-row: 1;
          grid-column: 1;
          mix-blend-mode: screen;
        }
        .shade-select-thumb {
          position: absolute;
          margin-top: -8px;
          margin-left: -8px;
          top: var(--shade-top, 0px);
          left: var(--shade-left, 200px);
          height: 16px;
          width: 16px;
          border: 2px solid #cccccc;
          border-radius: 8px;
          background-color: var(--shade-color, #0000ff);
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
        .input-area {
          grid-row: 2;
          grid-column: 1 / span 2;
          display: grid;
          grid-template-columns: max-content 1fr;
          gap: 5px;
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
