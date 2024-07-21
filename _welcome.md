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
        'This is Ristretto, a project to make a code playground and notebook environment written ',
        'in itself, that can be customized by editing the code in the environment. ',
        'This interface for editing code is composed of a collection of Markdown playground/notebook files. ',
        'They are shipped to the browser in a big Markdown file, containing smaller Markdown files as code blocks. ',
        'These are at ', ['a', 'https://codeberg.org/macchiato/ristretto', 'macchiato/ristretto'],
        ' on Codeberg.'
      ],
      [
        'The code loaded dynamically from Markdown files is run inside a tiny, quickly inspectable sandbox with ' +
        'a Content Security Policy. By reading the code in ',
        ['a', 'https://codeberg.org/ristretto/pages', 'ristretto/pages'], ' on Codeberg and understanding Codeberg Pages,',
        ' and studying what a sandbox combined with a content security policy can do, you may feel comfortable using',
        ' both private data and untrusted code at the same time inside the sandbox.',
        ' Network requests are blocked, and links can only be followed with an extra step. ' +
        'There is also an extra step to download files.'
      ],
      [
        'The interface for working with code and data is meant to be powerful and flexible. Please check out the notebooks ',
        'to the left. Some of them were quite fun to develop. There are some nifty features, such as in editable-data-table.md ',
        'keyboard navigation works even inside Safari which has an issue with selection ranges inside a shadow DOM. ',
        ' The code icon in the upper right corner shows the Markdown ',
        'code, some of which contains text, ',
        'indicating a notebook format. Others follow more of a playground format. A 3-pane editor that provides a ',
        'playground-notebook hybrid interface is under way in notebook-view.md.'
      ],
      [
        'Ristretto runs locally, but will contain code for running outside of it. That way you can play locally, and as ',
        'you learn, you can deploy notebooks with a server. These will be sandboxed as well, using Deno.'
      ],
    ].map(block => {
      const el = document.createElement('p')
      el.append(...block.map(s => {
        if (Array.isArray(s)) {
          if (s[0] = 'a') {
            const [href, text] = s.slice(1)
            const a = document.createElement('a')
            a.href = href
            a.innerText = text
            return a
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
