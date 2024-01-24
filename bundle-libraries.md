# Bundle Libraries

This takes the downloaded libraries in `library-source.md` and bundles them using rollup.

`run-bundle-libraries.js`

```js
const commands = {
  async getLibrarySource() {
    return await Deno.readTextFile('./build/build-libraries/library-source.md')
  },
}

async function handleMessage(e) {
  const [cmd, ...args] = e.data
  const port = e.ports[0]
  try {
    const result = await commands[cmd](...args)
    port.postMessage(result)
  } catch (err) {
    console.error(`Error running \`${cmd}\``, err)
    port.postMessage({error: true})
  }
  port.close()
}

const re = /(?:^|\n)\s*\n`bundle-libraries-entry.js`\n\s*\n```.*?\n(.*?)```\s*(?:\n|$)/s
const runEntry = `
const re = new RegExp(${JSON.stringify(re.source)}, ${JSON.stringify(re.flags)})
addEventListener('message', async e => {
  if (e.data[0] === 'notebook') {
    globalThis.__source = new TextDecoder().decode(e.data[1])
    const entrySrc = globalThis.__source.match(re)[1]
    await import(\`data:text/javascript;base64,\${btoa(entrySrc)}\`)
  }
}, {once: true})
`
const worker = new Worker(`data:text/javascript;base64,${btoa(runEntry)}`, {
  type: 'module',
  permissions: 'none',
})
worker.addEventListener('message', handleMessage)
const data = await Deno.readFile('./bundle-libraries.md')
worker.postMessage(['notebook', data], [data.buffer])
```

`bundle-libraries.js`

```js
async function parentRequest(...data) {
  const channel = new MessageChannel()
  const result = await new Promise((resolve, _) => {
    channel.port1.onmessage = (message) => {
      channel.port1.close()
      resolve(message.data)
    }
    postMessage(data, [channel.port2])
  })
  if (result === false) {
    throw new Error(
      `Received false from parent request ${JSON.stringify(data[0])} in worker`
    )
  }
  return result
}

// https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem
async function toBase64(bytes) {
  return await new Promise((resolve, reject) => {
    const reader = Object.assign(new FileReader(), {
      onload() { resolve(reader.result) },
      onerror() { reject(reader.error) }
    })
    reader.readAsDataURL(new File([bytes], "", { type: 'application/octet-stream' }))
  })
}

async function bundle(librarySource) {
  const blocks = await Array.fromAsync(readBlocksWithNames(librarySource))
  const rollupBlock = blocks.find(block => block.name === 'node_modules/@rollup/browser/dist/es/rollup.browser.js')
  const rollupContent = await toBase64(librarySource.slice(...rollupBlock.contentRange))
  await import(`data:text/javascript;base64,${rollupContent.split(',')[1]}`)
}

async function build() {
  try {
    const librarySource = await parentRequest('getLibrarySource')
    const output = await bundle(librarySource)
    close()
  } catch (err) {
    console.error(err)
    close()
  }
}

await build()
```

`bundle-libraries-entry.js`

```js
function* readBlocks(input) {
  const re = /(?:^|\n)([ \t]*)(`{3,}|~{3,})([^\n]*\n)/
  let index = 0
  while (index < input.length) {
    const open = input.substring(index).match(re)
    if (!open) {
      break
    } else if (open[1].length > 0 || open[2][0] === '~') {
      throw new Error(`Invalid open fence at ${index + open.index}`)
    }
    const contentStart = index + open.index + open[0].length
    const close = input.substring(contentStart).match(
      new RegExp(`\n([ ]{0,3})${open[2]}(\`*)[ \t]*\r?(?:\n|$)`)
    )
    if (!(close && close[1] === '')) {
      throw new Error(`Missing or invalid close fence at ${index + open.index}`)
    }
    const contentRange = [contentStart, contentStart + close.index]
    const blockRange = [index + open.index, contentRange.at(-1) + close[0].length]
    yield { blockRange, contentRange, info: open[3].trim() }
    index = blockRange.at(-1)
  }
}

function* readBlocksWithNames(input) {
  for (const block of readBlocks(input)) {
    const match = input.slice(0, block.blockRange[0]).match(
      new RegExp('\\n\\s*\\n\\s*`([^`]+)`\\s*\\n\\s*$')
    )
    yield ({...block, ...(match ? {name: match[1]} : undefined)})
  }
}

async function run(src) {
  globalThis.readBlocks = readBlocks
  globalThis.readBlocksWithNames = readBlocksWithNames
  for (const block of readBlocksWithNames(src)) {
    if (block.name === 'bundle-libraries.js') {
      const blockSrc = src.slice(...block.contentRange)
      await import(`data:text/javascript;base64,${btoa(blockSrc)}`)
    }
  }
}

run(__source)
```
