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

This is the first version, which doesn't allow anything except copying and pasting, and navigating directly to URLs on the same origin.

A short-term goal is to allow the user to upload and download files, and navigate with confirmation. In the meantime, some of this can be done with copying and pasting.

A Content-Security-Policy can be set through a header or through a meta tag. When headers can be reliably set, a header is preferred. However, this is run on the Pages platforms of code hosts, so the code and how it gets updated is more transparent.

All the sandbox does to load the code is have the outer frame download a giant Markdown file containing the notebook collection, and send it from the middle iframe to the inner `srcdoc` sandboxed iframe with some code to extract and run the entry point.

The inner `srcdoc` sandboxed iframe can have sandboxed iframes within it, to keep parts of the notebooks separate. How deeply nested they can be depends on the browser.

It also uses postMessage to allow the notebook to set the title of the web page, and in the future will allow the code to do other things like initiate upload, download, and navigation, with user interaction.

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
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline' 'unsafe-eval'; connect-src https://ristretto.codeberg.page/notebook.md">
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
<script type="module">
const frame = document.getElementById('frame')
frame.addEventListener('load', async () => {
  const data = new Uint8Array(await (await fetch('/notebook.md')).arrayBuffer())
  frame.contentWindow.postMessage(['notebook', data], '*', [data.buffer])
})
</script>
  </head>
  <body>
    <iframe id="frame" sandbox="allow-scripts"></iframe>
  </body>
</html>
```

`frame.html`

```html
<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline' 'unsafe-eval'; connect-src 'none'">
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
<script type="module">
addEventListener('message', e => {
  if (e.data[0] === 'notebook') {
    const frame = document.getElementById('frame')
    frame.addEventListener('load', async () => {
      frame.contentWindow.postMessage(['notebook', data], '*', [data.buffer])
    })
    const re = /(?:^|\n)\s*\n`entry.js`\n\s*\n```.*?\n(.*?)```\s*(?:\n|$)/s
    frame.srcdoc = `
<!doctype html>
    <html>
      <head>
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
      </head>
    </html>
`.trim().replace('-script', '/script')
  }
})
</script>
  </head>
  <body>
    <iframe id="frame" sandbox="allow-scripts"></iframe>
  </body>
</html>
```

Here is an example `notebook.md` that has buttons to attempt to do some things. It can be checked by running the above code, with https://ristretto.codeberg.page replaced with the URL where it will be running, and opening it up and inspecting it in different browsers. You can check the server logs and the logs in the web inspectors of the browsers to make sure attempts to access other pages are blocked.

`notebook.md`

````md

`entry.js`

```js
async function run() {
  
}

run()
```

````