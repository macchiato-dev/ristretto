# Code Editor Sizing Example

This is an example of the code editors fitting to the height of the parent containers.

`notebook.json`

```json
{
  "bundleFiles": [
    ["codemirror-bundle.md", "codemirror-bundle.js"]
  ],
  "importFiles": [
    ["loader.md", "builder.js"],
    ["forms.md", "button-group.js"],
    ["tabs.md", "TabItem.js"],
    ["tabs.md", "TabList.js"],
    ["menu.md", "dropdown.js"]
  ]
}
```

`code-edit/code-edit.js`

```js
export class CodeEdit extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        flex-grow: 1;
        background-color: #fff;
      }
    `
    this.shadowRoot.appendChild(style)
    this.initEditor()
  }

  static get styleSheet() {
    if (this._styleSheet === undefined) {
      this._styleSheet = new CSSStyleSheet()
      this._styleSheet.replaceSync(this.css)
    }
    return this._styleSheet
  }

  set value(value) {
    if (this.view) {
      this.view.dispatch({changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: value
      }})
    } else {
      this._value = value
    }
  }

  get value() {
    if (this.view) {
      return this.view.state.doc.toString()
    } else {
      return this._value ?? ''
    }
  }

  set fileType(value) {
    this._fileType = value
    if (this.view) {
      const langPlugins = this.langPlugins
      this.view.dispatch({
        effects: 
        this.languageCompartment.reconfigure(langPlugins)
      })
    }
  }

  get fileType() {
    return this._fileType
  }

  get langPlugins() {
    const cm = window.CodeMirrorBasic
    const langPlugins = []
    if (['js', 'javascript'].includes(this.fileType)) {
      langPlugins.push(cm.javascriptLanguage)
    } else if (this.fileType === 'css') {
      langPlugins.push(cm.cssLanguage)
    } else if (this.fileType === 'html') {
      langPlugins.push(cm.htmlLanguage)
    } else if (this.fileType === 'json') {
      langPlugins.push(cm.jsonLanguage)
    }
    return langPlugins
  }

  initEditor() {
    const cm = window.CodeMirrorBasic
    this.languageCompartment = new cm.Compartment()
    const langPlugins = this.langPlugins
    const basicSetup = [
      cm.lineNumbers(),
      cm.highlightActiveLineGutter(),
      cm.highlightSpecialChars(),
      cm.history(),
      cm.foldGutter(),
      cm.drawSelection(),
      cm.dropCursor(),
      cm.EditorState.allowMultipleSelections.of(true),
      cm.indentOnInput(),
      cm.syntaxHighlighting(
        cm.defaultHighlightStyle, {fallback: true}
      ),
      cm.bracketMatching(),
      cm.closeBrackets(),
      cm.autocompletion(),
      cm.rectangularSelection(),
      cm.crosshairCursor(),
      cm.highlightActiveLine(),
      cm.highlightSelectionMatches(),
      cm.keymap.of([
        ...cm.closeBracketsKeymap,
        ...cm.defaultKeymap,
        ...cm.searchKeymap,
        ...cm.historyKeymap,
        ...cm.foldKeymap,
        ...cm.completionKeymap,
        ...cm.lintKeymap
      ]),
    ]
    const viewTheme = cm.EditorView.theme({
      '&': {flexGrow: '1', height: '100%'},
      '.cm-scroller': {overflow: 'auto'}
    })
    this.view = new cm.EditorView({
      doc: this._value ?? '',
      extensions: [
        ...basicSetup,
        this.languageCompartment.of(langPlugins),
        viewTheme,
        cm.EditorView.updateListener.of(e => {
          if (e.docChanged) {
            this.dispatchEvent(new CustomEvent(
              'code-input', {bubbles: true, composed: true}
            ))
          }
        }),
      ],
      root: this.shadowRoot,
    })
    this.shadowRoot.append(this.view.dom)
  }
}
```

`app-view.js`

```js
export class AppView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
  }

  connectedCallback() {
    const style = document.createElement('style')
    const globalStyle = document.createElement('style')
    globalStyle.textContent = `
      body {
        margin: 0;
        padding: 0;
      }
      html, body {
        margin: 0;
        padding: 0;
      }
      html {
        box-sizing: border-box;
      }
      *, *:before, *:after {
        box-sizing: inherit;
      }
    `
    document.head.append(globalStyle)
    style.textContent = `
      :host {
        display: grid;
        height: 100vh;
        max-height: 100vh;
        grid-template-rows: 50% 50%;
      }
      m-editor-code-edit {
        height: 100%;
      }
    `
    this.shadowRoot.append(style)
    const codeEdit = document.createElement('m-editor-code-edit')
    const codeEdit2 = document.createElement('m-editor-code-edit')
    this.shadowRoot.append(codeEdit, codeEdit2)
  }
}
```

`app.js`

```js
import { CodeEdit } from "/code-edit/code-edit.js"
import { AppView } from "/app-view.js"

customElements.define('m-editor-code-edit', CodeEdit)
customElements.define('m-app-view', AppView)

class App {
  async run() {
    document.body.appendChild(
      document.createElement(
        'm-app-view'
      )
    )
  }
}

new App().run()
```
