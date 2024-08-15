# Example Notebook

`notebook.md`

````md
# Example notebook

This is an example notebook.

First there is a task list, which is a simple custom HTML element, that takes a list of tasks, one per line, and renders ones starting with [x] in strikethrough.

`task-list.js`

```js
export class TaskList extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.headerEl = document.createElement('h2')
    this.shadowRoot.appendChild(this.headerEl)
    this.contentEl = document.createElement('ul')
    this.contentEl.classList.add('content')
    this.shadowRoot.appendChild(this.contentEl)
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        max-width: 380px;
        margin: 10px auto;
      }
      h2 {
        text-transform: uppercase;
        font-family: monospace;
        margin: 5px;
        padding: 0;
        font-size: 18px;
        color: lawngreen;
        letter-spacing: 4px;
        font-weight: 300;
        text-shadow: -2px -2px 5px aquamarine;
      }
      ul.content {
        color: var(--fg, aquamarine);
        background: var(--bg, blue);
        padding: 10px 0px 10px 20px;
      }
      li {
        margin: 5px 0;
      }
    `
    this.shadowRoot.appendChild(style)
  }

  set tasks(tasks) {
    this._tasks = tasks
    this.contentEl.replaceChildren(
      ...this.tasks.map(task => {
        const el = document.createElement('li')
        const s = task.replaceAll(/^\[.\]/g, '').trim()
        if (task.startsWith('[x]')) {
          const del = document.createElement('del')
          del.innerText = s
          el.appendChild(del)
        } else {
          el.innerText = s
        }
        return el
      })
    )
  }

  get tasks() {
    return this._tasks
  }

  set bg(bg) {
    this.shadowRoot.host.style.setProperty('--bg', bg)
  }

  set fg(fg) {
    this.shadowRoot.host.style.setProperty('--fg', fg)
  }

  set title(v) {
    this.headerEl.innerText = v
  }
}
```

Here is app.js, which renders a couple task lists.

`app.js`

```js
import {TaskList} from '/task-list.js'
customElements.define('task-list', TaskList)

const el = document.createElement('task-list')
el.bg = '#422d09'
el.fg = '#ffffff77'
el.title = 'Home'
el.tasks = `
[x] wash dishes
clean fridge
`.trim().split('\n')
document.body.appendChild(el)

const el2 = document.createElement('task-list')
el2.title = 'Garden'
el2.tasks = `
[x] rake leaves
water plants
`.trim().split('\n')
el2.bg = '#466d1d'
el2.fg = '#ffffff77'
document.body.appendChild(el2)
```


````

`thumbnail.svg`

```svg
<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <style>
    svg {
      background-color: #000;
    }
    .color1 {
      fill: #422d09;
    }
    .color2 {
      fill: #466d1d;
    }
    .title {
      fill: lawngreen;
      opacity: 30%;
    }
  </style>

  <g transform="translate(17 5)">
    <rect x="10" y="8" width="40" height="8" class="title" />
    <rect x="10" y="20" width="75" height="30" class="color1" />
    <rect x="10" y="58" width="40" height="8" class="title" />
    <rect x="10" y="70" width="75" height="30" class="color2" />
  </g>
</svg>
```

