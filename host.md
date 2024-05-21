# Host

This is the host for Ristretto. It facilitates uploading data, downloading data, and following links in a controlled manner.

It uses web components that are developed in another notebook. They are inlined here so they can easily be inspected.

## Requests

Requests are sent through postMessage with a MessageChannel.

## Modal Dialog

This shows a modal dialog with a backdrop, that can be called from inside the container. This dialog contains an upload area that also can be pasted into, or a download that can also be copied.

## Link Popover

A link popover can contain a link that can be tabbed onto or clicked on. The link will only be available immediately if the mouse starts outside and moves inside, otherwise it will only work after a delay to prevent clickjacking.

## Uploading

The uploading dialog has a draggable and clickable upload area, and an upload button. When the upload button is clicked, the data is submitted by a post message to the requests.

## The page

The web page has the background color so it shows properly on browsers that include the background color in the chrome.

`index.html`

```html
<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Security-Policy" content="default-src data: 'unsafe-inline' 'unsafe-eval'; connect-src https://ristretto.codeberg.page/notebook.md; frame-src https://ristretto.codeberg.page/frame.html">
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#55391b">
    <title></title>
<style type="text/css">
body, html {
  background-color: #55391b;
}
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
body, html {
  background-color: #55391b;
}
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
let iframe = undefined
addEventListener('message', e => {
  if (e.origin === iframe?.contentWindow) {
    parent.postMessage(e.data, '*', [...(e.data[2] ?? []), ...message.ports])
  } else {
    if (e.data[0] === 'notebook') {
      iframe = document.createElement('iframe')
      iframe.sandbox = 'allow-scripts'
      iframe.addEventListener('load', async () => {
        const data = e.data[1]
        iframe.contentWindow.postMessage(['notebook', data], '*', [data.buffer])
      })
      const re = new RegExp('(?:^|\\n)\\s*\\n`entry.js`\\n\\s*\\n```.*?\\n(.*?)```\\s*(?:\\n|$)', 's')
    const src = `
<!doctype html>
<html>
  <head>
    <title>frame</title>
    <meta charset="utf-8">
  </head>
  <body>
<script type="module">
addEventListener('message', e => {
  if (e.source === parent) {
    if (e.data[0] === 'notebook') {
      window.__source = new TextDecoder().decode(e.data[1])
      const re = new RegExp(${JSON.stringify(re.source)}, ${JSON.stringify(re.flags)})
      const entrySrc = window.__source.match(re)[1]
      const script = document.createElement('script')
      script.type = 'module'
      script.textContent = entrySrc
      document.body.append(script)
    }
  }
})
<-script>
  </body>
</html>
      `.trim().replace('-script', '/script')
      iframe.src = `data:text/html;base64,${btoa(src.trim())}`
      // iframe.srcdoc = src.trim()
      document.body.replaceChildren(iframe)
    } else {
      iframe.contentWindow.postMessage(e.data, '*', [...(e.data[2] ?? []), ...e.ports])
    }
  }
})
</script>
  </body>
</html>
```