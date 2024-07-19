# App Content

This renders a subset of Markdown with special treatment of sections related to the application.

`AppContent.js`

```js
export class AppContent extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    this.shadowRoot.append(...this.content.split("\n\n").map(s => {
      let header = s.trim().match(/^#{0,6} /)?.[0]
      const el = document.createElement(header ? `h${header.length}` : `p`)
      el.innerText = s.slice(header?.length ?? 0)
      return el
    }))
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        
      `)
    }
    return this._styles
  }
}
```

`content.md`

```md
# Hello

This is a test.
```

`ExampleView.js`

```js
export class ExampleView extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    if (![...document.adoptedStyleSheets].includes(this.constructor.globalStyles)) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, this.constructor.globalStyles]
    }
    // This is just the example view, and it reads `content.md` whether it appears in this
    // document or a document supplied by explore, preferring nested.
    const content = [
      ...Array.from(readBlocksWithNames(__source)).filter(
        ({name}) => name.endsWith('.md')
      ).map(({contentRange}) => __source.slice(...contentRange)).map(blockSource => (
        Array.from(readBlocksWithNames(blockSource).filter(
          ({name}) => name === 'content.md'
        )).map(({contentRange}) => blockSource.slice(...contentRange))
      )).flat(),
      ...Array.from(readBlocksWithNames(__source)).filter(
        ({name}) => name === 'content.md'
      ).map(({contentRange}) => __source.slice(...contentRange))
    ][0]
    this.appContent = document.createElement('app-content')
    this.appContent.content = content
    this.shadowRoot.append(this.appContent)
  }

  setStyles(enabled) {
    
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        
      `)
    }
    return this._styles
  }

  static get globalStyles() {
    if (!this._globalStyles) {
      this._globalStyles = new CSSStyleSheet()
      this._globalStyles.replaceSync(`
        body {
          color: white;
        }
      `)
    }
    return this._globalStyles
  }
}
```

`app.js`

```js
import {AppContent} from '/AppContent.js'
import {ExampleView} from '/ExampleView.js'

customElements.define('app-content', AppContent)
customElements.define('example-view', ExampleView)

async function setup() {
  const exampleView = document.createElement('example-view')
  document.body.append(exampleView)
}

await setup()
```
