# Ristretto

A notebook container and a collection of notebooks for interacting with data.

## Introduction

When users browse the web, if they browse a lot of sites, they put trust in the browser. Browser tabs are sandboxed in such a way that they are not allowed to access some things their browser has access to, like files on their computer, and when something breaks through the sandbox, that is considered a security vulnerability.

However, you are cautioned against typing, pasting, or uploading your private information to sites that you don't trust.

There is a lot of software out there. People are careful when they download programs, but people browse the web more freely, including on code notebook and interactive playground sites.

This is intended to provide a place where people can play more freely with private data. This way, you can try some code for graphing, visualizing, or searching your data. No guarantees are provided, and it is at your own risk. However, hopefully the container in ristretto will enable more expirementation.

The notebook collection has an assortment of tools for interacting with data, such as editors, visualization tools, transformation utilities, and search interfaces.

### The Notebook Container

This runs notebook code under a Content-Security-Policy and a sandboxed iFrame, which combine to prevent data from being leaked without user interaction.

The code setting up the Content-Security-Policy and the sandboxed iFrame is very small, so it can quickly be inspected. It consists of:

- a top-level web page, `index.html`, that has a the most broad Content-Security-Policy, that allows for downloading notebooks
- a middle iframe, `frame.html`, which takes care of setting up the sandboxed iframe, and has a Content-Security-Policy that prevents all network requests - the ones it needs are accessed through the parent iframe via postMessage
- a sandboxed `srcdoc` iframe under which the notebook code is run – This has `allow-scripts` but not `allow-same-origin`, so notebook code can run but it can't access localStorage, so each tab is kept separate

This doesn't allow anything except copying and pasting. Navigating to URLs is also blocked through a Content Security Policy. This way, a page can't trick a user into clicking on a link. To load data from a file, use copy and paste. This can also work for binary data through Base64. Another container will provide a way to upload and download files directly.

A Content-Security-Policy can be set through a header or through a meta tag. When headers can be reliably set, a header is preferred. However, this is run on the Pages platforms of code hosts, so the code and how it gets updated is more transparent.

All the sandbox does to load the code is have the outer frame download a giant Markdown file containing the notebook collection, and send it from the middle iframe to the inner `srcdoc` sandboxed iframe with some code to extract and run the entry point.

The inner `srcdoc` sandboxed iframe can have sandboxed iframes within it, to keep parts of the notebooks separate. How deeply nested they can be depends on the browser.

It also uses postMessage to allow the notebook to set the title of the web page.

### The Notebook Collection

The Notebook Collection is the files inside this repository, and their output. These are built into a giant Markdown file.

A script will be added to check that the content of the giant Markdown file matches the content and build output of the little Markdown files in the repository.

## Implementation

This consists of three files:

- `index.html` - this is the top-level iframe, which has an iframe containing `csp.html`
- `frame.html` - this contains a strict CSP, and has a srcdoc iframe, under which notebook code runs. It gets data from the parent and sends it to the child srcdoc iframe. Both itself and the srcdoc iframe are subject to the more strict CSP, so if there is work that could be done with either `frame.html` or `index.html`, it is done in `frame.html`.
- `notebook.md` - This contains the notebook code. It is a giant Markdown file which contains the notebook collection for Ristretto, wrapped using fenced code blocks with more backquotes than the notebooks they contain.

The outer frame, `index.html`, has a CSP that allows it to access `notebook.md`, and to run inline and eval code. The middle frame, `frame.html`, is a non-sandboxed iframe that has a CSP that allows it and the inner frame to run inline and eval code, but not to access any local or network data, that isn't passed in through `postMessage`. The inner frame, a srcdoc iframe that has its code for starting up in `frame.html`, is a sandboxed iframe that has `allow-scripts` but not `allow-same-origin`.

`index.html`

```html
<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Security-Policy" content="default-src data: 'unsafe-inline' 'unsafe-eval'; connect-src https://ristretto.codeberg.page/notebook.md; frame-src https://ristretto.codeberg.page/frame.html">
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title></title>
<style type="text/css">
body {
  height: 100vh;
  margin: 0;
  display: flex;
  align-items: stretch;
  flex-direction: column;
}
iframe {
  flex-grow: 1;
  border: 0;
}
</style>
  </head>
  <body>
    <iframe id="frame" src="/frame.html"></iframe>
<script type="module">
const frame = document.getElementById('frame')
frame.addEventListener('load', async () => {
  const data = new Uint8Array(await (await fetch('/notebook.md')).arrayBuffer())
  frame.contentWindow.postMessage(['notebook', data], '*', [data.buffer])
})
</script>
  </body>
</html>
```

`frame.html`

```html
<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Security-Policy" content="default-src data: 'unsafe-inline' 'unsafe-eval'; connect-src 'none'">
    <title></title>
<style type="text/css">
body {
  height: 100vh;
  margin: 0;
  display: flex;
  align-items: stretch;
  flex-direction: column;
}
iframe {
  flex-grow: 1;
  border: 0;
}
</style>
  </head>
  <body>
<script type="module">
addEventListener('message', e => {
  if (e.data[0] === 'notebook') {
    const iframe = document.createElement('iframe')
    iframe.sandbox = 'allow-scripts'
    iframe.addEventListener('load', async () => {
      const data = e.data[1]
      iframe.contentWindow.postMessage(['notebook', data], '*', [data.buffer])
    })
    const re = new RegExp('(?:^|\\n)\\s*\\n`entry.js`\\n\\s*\\n```.*?\\n(.*?)```\\s*(?:\\n|$)', 's')
    iframe.srcdoc = `
<!doctype html>
<html>
  <head>
    <title></title>
    <meta charset="utf-8">
  </head>
  <body>
<script type="module">
addEventListener('message', e => {
  if (e.data[0] === 'notebook') {
    window.__source = new TextDecoder().decode(e.data[1])
    const re = new RegExp(${JSON.stringify(re.source)}, ${JSON.stringify(re.flags)})
    const entrySrc = window.__source.match(re)[1]
    const script = document.createElement('script')
    script.type = 'module'
    script.textContent = entrySrc
    document.body.append(script)
  }
})
<-script>
  </body>
</html>
    `.trim().replace('-script', '/script')
    document.body.replaceChildren(iframe)
  }
})
</script>
  </body>
</html>
```

Here is an example `notebook.md` that has buttons to attempt to do some things. It can be checked following these instructions:

- Place the three files (`index.html`, `frame.html`, and `notebook.md`) in a directory
- replace `https://ristretto.codeberg.page` with the URL where it will be running (such as `http://localhost:4000`)
- Run a web server on the directory like `python -m http.server 4000`
- Opening it up and inspecting it in different browsers. You can check the server logs and the logs in the web inspectors of the browsers to make sure attempts to access other pages are blocked.

`notebook.md`

````md
# Ristretto Container Demo

This is a demo that runs right inside the container, and tries some actions that are protected against by the iframe sandbox and CSP.

`entry.js`

```js
class RunCodeBlock extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.nameEl = document.createElement('h2')
    this.htmlEl = document.createElement('textarea')
    this.htmlEl.readOnly = true
    this.jsEl = document.createElement('textarea')
    this.jsEl.readOnly = true
    this.outputEl = document.createElement('div')
    const heading = text => {
      const el = document.createElement('h3')
      el.innerText = text
      return el
    }
    this.shadowRoot.append(
      this.nameEl,
      heading('HTML'),
      this.htmlEl,
      heading('JavaScript'),
      this.jsEl,
      heading('Output'),
      this.outputEl,
    )
  }

  connectedCallback() {
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: 'flex';
        flex-direction: column;
        gap: 5px;
        margin: 10px;
      }
      textarea {
        font-family: monospace;
        width: 500px;
        height: 200px;
      }
    `
    this.shadowRoot.append(style)
  }

  get name() {
    return this.nameEl.innerText
  }

  set name(value) {
    this.nameEl.innerText = value
  }

  set html(value) {
    this.htmlEl.value = value
  }

  get html() {
    return this.htmlEl.value
  }

  set js(value) {
    this.jsEl.value = value
  }

  get js() {
    return this.jsEl.value
  }

  async run() {
    if (this.html !== undefined) {
      this.outputEl.innerHTML = this.html
    }
    if (this.js) {
      const fn = (await import(
        `data:text/javascript;base64,${btoa(this.js)}`
      )).default
      if (typeof fn === 'function') {
        fn(this.outputEl)
      } else {
        console.error("Didn't get function from data import")
      }
    }
  }
}

customElements.define('run-code-block', RunCodeBlock)

function unindent(s) {
  const spaces = Math.min(20, ...([...s.matchAll(/^([ ]+)\S/gm)].map(m => m[1].length)))
  return s.replaceAll(new RegExp(`^${' '.repeat(spaces)}`, 'gm'), '')
}

async function run() {
  const runCodeBlocks = [
    {
      title: 'Navigate to same site with query string',
      html: `
        <a href="https://ristretto.codeberg.page/notebook.md?data=private">
          Link
        </a>
      `,
    },
    {
      title: 'Navigate to another site',
      html: `
        <a href="https://justatest.requestcatcher.com/test?data=private">
          Link
        </a>
      `,
    },
    {
      title: 'Make a request to the same site',
      html: `
        <p>
          <button class="send">
            Send
          </button>
          <span style="margin: 0 10px">
            Status/Error:
          </span>
          <span class="output">Ready</span>
        </p>
      `,
      js: `
        export default el => {
          const outputEl = el.querySelector('.output')
          el.querySelector('.send').addEventListener(
            'click',
            async () => {
              let resp, e
              outputEl.innerText = 'Sending'
              try {
                resp = await fetch('https://ristretto.codeberg.page/notebook.md?data=private')
              } catch (err) {
                e = err
              }
              outputEl.innerText = (e ?? resp.status).toString()
            }
          )
        }
      `,
    },
    {
      title: 'Add a style with a URL',
      html: `
        <p>
          <button class="add">
            Add
          </button>
          <div class="test" style="min-width: 50px; min-height: 50px"></div>
        </p>
      `,
      js: `
        export default el => {
          el.querySelector('.add').addEventListener(
            'click',
            async () => {
              const style = document.createElement('style')
              style.textContent = \`
                .test {
                  background-image: url('http://placekitten.com/200/300');
                  border: 5px solid blue;
                }
              \`
              el.appendChild(style)
            }
          )
        }
      `,
    },
  ]
  const codeBlocks = runCodeBlocks.map(({title, html, js}) => {
    const el = document.createElement('run-code-block')
    el.title = title
    el.html = unindent(html ?? '').trim()
    el.js = unindent(js ?? '').trim()
    return el
  })
  document.body.append(...codeBlocks)
  for (const codeBlock of codeBlocks) {
    codeBlock.run()
  }
}

run()
```

````

If you try clicking the links or download in a new browser, you can see that they don't load.

A strict CSP is necessary for these to pass. If you allow direct fetch access to even one file URL from the inner iframe, it can send info from inside the inner iframe in the query string (the CSP checks the path but not the query string). This would likely be a trusted server, but it's still against the goals of this sandbox.

Having the data in the sandbox stay in the sandbox, unless the user copies or downloads it, depends on the browser being secure. Be sure to use an up-to-date browser.

Also the `data:`, `'unsafe-inline'`, and `'unsafe-eval'` are needed for notebook features, but make it so some browser vulnerabilities that have happened recently would occur here. For instance, [font vulnerability](https://security.stackexchange.com/questions/91347/how-can-a-font-be-used-for-privilege-escalation) and [image vulnerability](https://arstechnica.com/gadgets/2023/09/apple-patches-clickless-0-day-image-processing-vulnerability-in-ios-macos/). So it's important to be careful.

These shouldn't allow for external access, but it needs to be investigated more fully.
