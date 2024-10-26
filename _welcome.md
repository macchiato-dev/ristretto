# Intro

`AppView.js`

```js
export class AppView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.heading = document.createElement('h1')
    this.heading.innerText = 'welcome to ristretto'
    const blocks = [
      [
        'This is Ristretto, a project to make a code playground and notebook ',
        'environment written in itself, that can be customized by editing the ',
        'code in the environment. This interface for editing code is composed ',
        'of a collection of Markdown playground/notebook files. They are ',
        'shipped to the browser in a big Markdown file, containing smaller ',
        'Markdown files as code blocks. These are at ',
        [
          '[', 'macchiato/ristretto',
          '(', 'https://codeberg.org/macchiato/ristretto'
        ],
        ' on Codeberg.'
      ],
      [
        'The code loaded dynamically from Markdown files is run inside a sandboxed ',
        'iframe with a Content-Security-Policy that prevents network access and only ',
        'runs allowlisted JavaScript directly in the window. It prevents following ',
        'links and downloading files directly from the iFrame, but instead shows ',
        'them in an overlay window. Untrusted code will be runnable with ',
        'WebAssembly and its actions guarded using the allowlisted code. ',
        'The goal is to have data never leave the sandbox without user action, ',
        'and the design limits the amount of code that needs to be inspected ',
        'to be confident that this is the case. This is not guaranteed, and if you ',
        'have any security concerns, please report them by creating an issue or ',
        'sending an email (',
        [
          '[', 'see the the project on Codeberg', '(',
          'https://codeberg.org/macchiato/ristretto'
        ],
        ')'
      ],
      [
        'The interfaces for working with code and data support a few formats, ',
        'such as Markdown files with embedded code blocks, CSV files, JSON, ',
        'and images. They can be seen by going to the Explore tab. An upload ',
        'page is being implemented which upon selecting a file will show ',
        'supported notebooks to run on the data.',
      ],
      [
        'Ristretto runs locally, but will contain code for running outside of ',
        'it. That way you can play locally, and as you learn, you can deploy ',
        'notebooks with a server. These will be sandboxed as well, using Deno,',
        'WebAssembly, and ',
        ['[', 'containers', '(', 'https://opencontainers.org/'],
        '.',
      ],
    ].map(block => {
      const el = document.createElement('p')
      el.append(...block.map(s => {
        if (Array.isArray(s)) {
          if (s[0] === '[') {
            const text = s[1]
            if (s[2] === '(') {
              const a = document.createElement('a')
              const href = s[3]
              a.href = href
              a.innerText = text
              return a
            }
          } else if (s[0] === '`') {
            const code = document.createElement('code')
            code.innerText = s[1]
            return code
          } else {
            return undefined
          }
        } else {
          return s
        }
      }).filter(inline => inline !== undefined))
      return el
    }).filter(block => block !== undefined)
    this.shadowRoot.append(this.heading, ...blocks)
    this.shadowRoot.addEventListener('click', e => {
      if (e.target.tagName === 'A') {
        parent.postMessage(['link', e.target.href], '*')
        e.preventDefault()
        return false
      }
    })
  }

  connectedCallback() {
    const font = this.getFont()
    const globalStyle = document.createElement('style')
    globalStyle.textContent = `
      body {
        background: #2d1d0e;
        max-width: 600px;
        margin: auto;
        color: #d7d7d7;
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
        margin: 10px;
      }
      a {
        color: #fff596;
      }
      p {
        line-height: 1.4;
      }
      code {
        border: 2px #bbb7;
        background: #bbb5;
        padding: 2px;
        border-radius: 3px;
      }
    `
    this.shadowRoot.appendChild(style)
    setTimeout(() => { this.heading.classList.add('loaded') }, 500)
  }

  getFont() {
    const block = Array.from(readBlocksWithNames(__source)).find(({name}) => name === 'font.woff2.md')
    const blockSrc = __source.slice(...block.contentRange)
    const subBlock = Array.from(readBlocksWithNames(blockSrc)).find(({name}) => name === 'font.woff2')
    return blockSrc.slice(...subBlock.contentRange).replaceAll(/\s*/g, '')
  }
}
```

`notebook.json`

```json
{
  "dataFiles": [
    ["font.woff2.md", "font.woff2"]
  ]
}
```

`app.js`

```js
import {AppView} from '/AppView.js'
customElements.define('app-view', AppView)

const el = document.createElement('app-view')
document.body.append(el)
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
