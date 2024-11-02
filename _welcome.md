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
        'This is Ristretto, a project to make a code and data playground as a ',
        'collection of playgrounds and notebooks.',
      ],
      [
        'It is designed to be a highly flexible environment, with a bunch of ',
        'components that can be connected together in various ways, to build ',
        'interfaces for working with code and/or data.',
      ],
      [
        'It\'s called Ristretto because it\'s designed to be minimal and ',
        'familiar, like the espresso drink. It is also ',
        ['*', 'restricted'], ' ',
        'which is what ',
        ['*', 'ristretto'], ' ',
        'means in Italian.',
      ],
      [
        'Ristretto is designed to run self-contained, so that data ',
        'uploaded to it doesn\'t leave the system without user interaction. ',
        'As such, it only runs external code in a way that is guarded against ',
        'doing things that are likely to leak data (however, this is not ',
        'guaranteed). Part of it can be developed inside the environment, ',
        'while other parts of it need to be developed outside of it, such as ',
        'in ',
        ['[', 'macchiato/cafe', '(', 'https://codeberg.org/macchiato/cafe/'],
        '.',
      ],
      [
        'When you first open Ristretto, it loads the first component, the root ',
        'component, which contains some code that runs in the browser context ',
        'and some code that runs in WebAssembly. The code that runs in the ',
        'browser context is about a page of code, and it loads the WebAssembly ',
        'code and gives it access to certain things including running other ',
        'components, which in turn can run more components. As components are ',
        'run, you have the opportunity to inspect the code of them ',
        'before running them. You can have them be run automatically on ',
        'future visits. Like a video game, you can have multiple profiles, ',
        'so at any time you can start again with an empty environment.',
      ],
      [
        'You can download the current state of your session, and share it. You ',
        'can upload it to a tab running Ristretto, and when it\'s opened, ',
        'it will show a list of the components it will run, and whether each ',
        'of them are set to be run automatically in the current profile.',
      ],
      [
        'Some components support doing things that need network access by ',
        'letting you export the data and the commands or code needed to ',
        'perform the action, perform the action outside, and import the ',
        'result. This is used by the build process.',
      ],
      [
        'Additionally it lets you export code that will start a server or app ',
        'that permits direct network access. And you can also load Ristretto ',
        'in a frame, and give it access through postMessage. However, if the ',
        'top level window is Ristretto, it tries to block direct network access. ',
        'Please report any security concerns in the ',
        ['[', 'issues', '(', 'https://codeberg.org/macchiato/ristretto/issues'], ' ',
        'or by sending an ',
        'email to ',
        ['[', 'Ben', '(', 'https://github.com/benatkin'], '.',
      ],
      [
        'This is part of the larger ',
        ['[', 'macchiato.dev', '(', 'https://macchiato.dev/'], ' ',
        'project.',
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
          } else if (['`', '*', '**'].includes(s[0])) {
            const tag = {'`': 'code', '*': 'i', '**': 'b'}
            const code = document.createElement(tag[s[0]])
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
