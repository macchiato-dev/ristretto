const files = ['codemirror-bundle.md', 'prosemirror-bundle.md']

const commands = {
  async getLibrarySource() {
    return await Deno.readTextFile('./build/build-libraries/library-source.md')
  },
  async loadBundle(filename) {
    if (!files.includes(filename)) {
      throw new Error('Unknown bundle')
    }
    return await Deno.readTextFile(filename)
  },
  async saveBundle(filename, text) {
    if (!files.includes(filename)) {
      throw new Error('Unknown bundle')
    }
    await Deno.writeTextFile(filename, text)
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