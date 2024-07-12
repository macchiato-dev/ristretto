# App View - New

This is an App View with the top bar, like in [macchiato.codeberg.page](https://macchiato.codeberg.page/). It will have a hamburger menu on the left side, that shows a flyout menu. With the current version, it isn't pinnable, here it will be.

Like the current version, it will have multiple pages and navigation. Unlike that, this will support multiple tabs.

Another difference is that each tab lives in its own sandbox in the current version of [macchiato.codeberg.page](https://macchiato.codeberg.page/). Here, they will be able to share based on rules.

On the right side of the top bar in the current version is a menu. Here, with permission, the app will be able to show custom things on the right side.

On the left side of the top bar in the old version was a + icon. This will instead be added to the end of the tabs.

TODO:

- [x] Add top bar
- [ ] Add sidebar
- [ ] Make it so sidebar can be unpinned
- [ ] Add hamburger icon to top bar when sidebar is unpinned
- [ ] Make hamburger icon show sidebar
- [ ] Support pinning sidebar

`AppView.js`

```js
export class AppView extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    this.shadowRoot.append(...(['top-bar', 'content-area'].map(cls => {
      const el = document.createElement('div')
      el.classList.add(cls)
      return el
    })))
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: grid;
          grid-template-columns: 1fr;
          grid-template-rows: minmax(30px, min-content) 1fr;
        }
        .top-bar {
          background-color: black;
        }
        .content-area {
          background-color: #dfe;
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
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    document.adoptedStyleSheets = [
      this.constructor.globalStyles,
      ...([...document.adoptedStyleSheets].filter(v => v !== this.constructor.globalStyles))
    ]
    this.appView = document.createElement('app-view')
    this.shadowRoot.append(this.appView)
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: grid;
          grid-template-rows: 1fr;
          grid-template-columns: 1fr;
        }
      `)
    }
    return this._styles
  }

  static get globalStyles() {
    if (!this._globalStyles) {
      this._globalStyles = new CSSStyleSheet()
      this._globalStyles.replaceSync(`
        html {
          box-sizing: border-box;
        }
        html, body {
          height: 100%;
          display: grid;
          grid-template-columns: 1fr;
          grid-template-rows: 1fr;
          padding: 0;
          margin: 0;
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
import {ExampleView} from '/ExampleView.js'

customElements.define('app-view', AppView)
customElements.define('example-view', ExampleView)

async function setup() {
  const exampleView = document.createElement('example-view')
  document.body.append(exampleView)
}

await setup()
```
