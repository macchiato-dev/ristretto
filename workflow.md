# Workflow

## Upload

- Go to the site
- Click upload, which is among other options, like reading the docs, exploring, reading the source, or creating something new from a template
- Upload screen is shown, providing an upload button and a drag and drop area, along with a link to how to inspect the code that will be run on the upload, as well as how to host it yourself
- Upon uploading, options are provided for the document, depending on the type of document
- Upon clicking an option, it shows the notebook, the notebook container, container plugins, and a button to run it
- If it wants something sent via an API, it provides instructions and a download/upload flow, or something that can run it automatically via PostMessage is detected from the enclosing page

## Containers

Suggest WebAssembly for the most secure containers. Provide a declarative way of making vdom updates and doing event handling, that keeps the DOM tree sanitized. Consider snabbdom, HTML with sanitization, or both. Have web components that don't automatically share their data between each other or do so with clear boundaries.

Support some languages. Look into distributing plugins with a binary delta.

For canvas, support queuing up messages and sending them. Support requestAnimationFrame.