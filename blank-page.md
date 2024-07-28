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
    this.content = document.createElement('div')
    this.content.classList.add('content', 'edited')
    this.content.contentEditable = true
    for (const key in this.contentEvents) {
      this.contentEvents[key] = this.contentEvents[key].bind(this)
      this.content.addEventListener(key.toLowerCase(), this.contentEvents[key])
    }
    this.contentWrap = document.createElement('div')
    this.contentWrap.classList.add('content-wrap')
    this.contentWrap.append(this.placeholder, this.content)
    this.shadowRoot.append(this.contentWrap)
  }

  contentEvents = {
    beforeInput(e) {
      if (e.inputType === 'historyUndo') {
        e.preventDefault()
        this.undo()
      } else if (e.inputType === 'historyRedo') {
        e.preventDefault()
        this.redo()
      }
    },
    keyDown(e) {
      if ((e.code === 'KeyZ' && e.shiftKey && (e.metaKey || e.ctrlKey)) || (e.code === 'KeyY' && e.ctrlKey)) {
        e.preventDefault()
        this.redo()
      } else if ((e.code === 'KeyZ' && e.shiftKey && e.metaKey)) {
        e.preventDefault()
        this.undo()
      }
    },
    blur() {
      this.classList.toggle('edited', this.content.innerText.trim() !== '')
    },
    dragEnter(e) {
      this.content.classList.add('dragover')
    },
    dragLeave() {
      this.content.classList.remove('dragover')
    },
    dragOver(e) {
      e.preventDefault()
    },
    drop(e) {
      e.preventDefault()
      this.content.classList.remove('dragover')
      for (const item of [...e.dataTransfer.items]) {
        if (item.kind === 'file') {
          const el = document.createElement('p')
          const file = item.getAsFile()
          el.innerText = file.name
          this.contentWrap.insertAdjacentElement('beforebegin', el)
        }
      }
    },
    dragEnd() {
      this.content.classList.remove('dragover')
    },
  }

  undo() {
    if (this.content.innerText.trim() !== '') {
      this.savedText = this.content.innerText
    }
    this.content.innerText = ''
  }

  redo() {
    if (this.content.innerText.trim() === '' && this.savedText.trim() !== '') {
      this.content.innerText = this.savedText
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
          gap: 10px;
          justify-content: center;
          color: white;
          padding: 5px;
        }
        .content-wrap {
          display: grid;
          grid-template-columns: max-content;
          gap: 10px;
          justify-content: center;
          color: white;
          padding: 5px;
        }
        .placeholder {
          grid-row: 1;
          grid-column: 1;
        }
        .content, .placeholder {
          padding: 10px;
        }
        .content {
          min-width: calc(min(70vw, 800px));
          outline: none;
          grid-row: 1;
          grid-column: 1;
          border: 2px dotted #0000;
        }
        :host(:not(.edited)) .content.dragover {
          border-color: #bbba;
          background: #9993;
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
