# App Content

This renders a subset of Markdown with the ability to render components related to the app.

`AppContent.js`

```js
export class AppContent extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    this.shadowRoot.append(...this.renderContent(this.content))
    this.shadowRoot.addEventListener('click', e => {
      if (e.target.tagName === 'A') {
        console.log('clicked link', e.target.href)
        e.preventDefault()
        return false
      }
    })
  }

  renderInline(content) {
    const result = []
    let remaining = content
    for (let i=0; i < 10; i++) {
      const linkMatch = remaining.match(/\[(.*)\]\((.*)\)/)
      if (linkMatch) {
        result.push(remaining.slice(0, linkMatch.index))
        const a = document.createElement('a')
        a.innerText = linkMatch[1]
        a.href = linkMatch[2]
        result.push(a)
        remaining = remaining.slice(linkMatch.index + linkMatch[0].length)
      } else {
        result.push(remaining)
        break;
      }
    }
    return result
  }

  renderBlock(content) {
    if (content.trim() === '`[new-content]`') {
      return document.createElement('new-content')
    } else {
      const header = content.trim().match(/^#{0,6} /)?.[0]
      const el = document.createElement(header ? `h${header.length}` : `p`)
      el.append(...this.renderInline(content.slice(header?.length ?? 0)))
      return el
    }
  }

  renderContent(content) {
    return content.split("\n\n").map(s => this.renderBlock(s))
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        a, a:visited {
          color: #9bf;
        }
      `)
    }
    return this._styles
  }
}
```

This is for adding new content - first, upload, then type, paste or upload.

`NewContent.js`

```js
export class NewContent extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    this.outputEl = document.createElement('div')
    this.shadowRoot.append(this.createFileInput(), this.outputEl)
  }

  createFileInput() {
    const el = document.createElement('input')
    el.type = 'file'
    el.multiple = true
    el.addEventListener('change', e => {
      this.outputEl.innerText = `${el.files.length} file(s) selected`
    })
    return el
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
# App Content

This is for adding new content (currently just an upload link to test uploading):

`[new-content]`

[Test link to Mars wikipedia page](https://en.wikipedia.org/Mars)
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
import {NewContent} from '/NewContent.js'
import {ExampleView} from '/ExampleView.js'

customElements.define('app-content', AppContent)
customElements.define('new-content', NewContent)
customElements.define('example-view', ExampleView)

async function setup() {
  const exampleView = document.createElement('example-view')
  document.body.append(exampleView)
}

await setup()
```


`thumbnail.svg`

```svg
<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <style>
    svg {
      background-color: #111;
    }
    text {
      font: 18px sans-serif;
      fill: #efe;
    }
  </style>

  <g transform="translate(2 4)">
    <text x="10" y="35">app-content</text>
  </g>
</svg>
```

