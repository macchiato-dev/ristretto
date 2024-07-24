# Blank Page

This is a page that starts out blank.

`BlankPage.js`

```js
export class BlankPage extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    this.placeholder = document.createElement('div')
    this.placeholder.classList.add('placeholder')
    const kbd = document.createElement('kbd')
    kbd.innerText = '/'
    this.placeholder.append(
      this.text.typePasteDrag,
      document.createElement('br'),
      document.createElement('br'),
      this.text.commandBefore,
      kbd,
      this.text.commandAfter,
    )
    this.blankPage = document.createElement('div')
    this.blankPage.classList.add('blank-page')
    this.blankPage.classList.add('edited')
    this.blankPage.contentEditable = true
    this.blankPage.addEventListener('blur', () => {
      if (this.blankPage.innerText.trim() === '') {
        this.classList.remove('edited')
      } else {
        this.classList.add('edited')
      }
    })
    this.blankPage.addEventListener('beforeinput', e => {
      if (e.inputType === 'historyUndo') {
        e.preventDefault()
        this.undo()
      } else if (e.inputType === 'historyRedo') {
        e.preventDefault()
        this.redo()
      }
    })
    this.blankPage.addEventListener('keydown', e => {
      if ((e.code === 'KeyZ' && e.shiftKey && (e.metaKey || e.ctrlKey)) || (e.code === 'KeyY' && e.ctrlKey)) {
        e.preventDefault()
        this.redo()
      } else if ((e.code === 'KeyZ' && e.shiftKey && e.metaKey)) {
        e.preventDefault()
        this.undo()
      }
    })
    this.shadowRoot.append(this.placeholder, this.blankPage)
  }

  undo() {
    if (this.blankPage.innerText.trim() !== '') {
      this.savedText = this.blankPage.innerText
    }
    this.blankPage.innerText = ''
  }

  redo() {
    if (this.blankPage.innerText.trim() === '' && this.savedText.trim() !== '') {
      this.blankPage.innerText = this.savedText
      this.savedText = undefined
    }
  }

  textByLang = {
    es: {
      typePasteDrag: 'Escribe, arrastra o pega aquí...',
      commandBefore: 'Escriba ',
      commandAfter: ' para comandos'
    },
    en: {
      typePasteDrag: 'Type, drag, or paste here...',
      commandBefore: 'Type ',
      commandAfter: ' for commands'
    }
  }

  get text() {
    return this.textByLang[(this.lang || navigator.language).slice(0, 2)] ?? this.textByLang.en
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          display: grid;
          grid-template-columns: max-content;
          padding: 10px;
          gap: 10px;
          justify-content: center;
          color: white;
        }
        .placeholder {
          grid-row: 1;
          grid-column: 1;
        }
        .blank-page {
          min-width: calc(min(70vw, 800px));
          outline: none;
          grid-row: 1;
          grid-column: 1;
        }
        :host(:focus-within) .placeholder, :host(.edited) .placeholder {
          display: none;
        }
        kbd {
          border-radius: 5px;
          background: #fffa;
          border: 2px solid #0003;
          padding: 3px 7px;
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
    const sheets = [...document.adoptedStyleSheets].filter(v => v !== this.constructor.globalStyles)
    document.adoptedStyleSheets = [...sheets, this.constructor.globalStyles]
    this.blankPage = document.createElement('blank-page')
    // this.blankPage.lang = 'en'
    document.body.append(this.blankPage)
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
import {BlankPage} from '/BlankPage.js'
import {ExampleView} from '/ExampleView.js'

customElements.define('blank-page', BlankPage)
customElements.define('example-view', ExampleView)

async function setup() {
  const exampleView = document.createElement('example-view')
  document.body.append(exampleView)
}

await setup()
```
