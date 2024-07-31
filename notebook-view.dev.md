# Notebook View - Dev

This is the development notebook for [notebook-view](notebook-view.md). It contains things that aren't needed just to use the library, much like how some things in the git repo are omitted from an npm package with `.npmignore`.

## RegExp Test

This provides an interface for testing out a RegExp, to see if it matches something.

`RegExpTest.js`

```js
export class RegExpTest extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: grid;
        }
      `)
    }
    return this._styles
  }
}
```

`AppView.js`

```js
export class AppView extends HTMLElement {
  connectedCallback() {
    super()
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    if (![...document.adoptedStyleSheets].includes(this.constructor.globalStyles)) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, this.constructor.globalStyles]
    }
    this.shadowRoot.append()
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: grid;
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
          margin: 0;
          background: #2d1d0e;
          max-width: 600px;
          margin: auto;
          color: #d7d7d7;
        }
        html {
          box-sizing: border-box;
        }
        *, *:before, *:after {
          box-sizing: inherit;
        }
      `)
    }
    return this._globalStyles
  }
}
```

`app.js`

```js
import {AppView} from '/AppView.js'
import {RegExpTest} from '/AppView.js'

customElements.define('app-view', AppView)
customElements.define('reg-exp-test', RegExpTest)

const el = document.createElement('app-view')
document.body.append(el)
```
