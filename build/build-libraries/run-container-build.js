import { join } from 'https://deno.land/std@0.207.0/path/mod.ts'

const commands = {
  getArgs() {
    return structuredClone(Deno.args)
  },
  async clean() {
    const commands = [
      ['network', 'rm', 'ristretto-build-libraries'],
    ]
    const results = []
    for (const command of commands) {
      results.push(await new Deno.Command('docker', {
        args: command,
      }.output()))
    }
    return results
  },
  async buildImage() {
  },
  async createNetwork() {
    return await new Deno.Command('docker', {
      args: ['network', 'create', '--internal', 'ristretto-build-libraries'],
    })
  },
  async createVolume() {
  },
  async createContainer() {
  },
}

async function handleMessage(e) {
  const [cmd, ...args] = e.data
  const port = e.ports[0]
  try {
    if (cmd in commands) {
      port.postMessage(await commands[cmd](...args))
    } else {
      throw new Error('invalid command')
    }
  } catch (err) {
    console.error('Error running `${cmd}`', err)
    port.postMessage(false)
  }
  port.close()
}

const re = /(?:^|\n)\s*\n`container-build-entry.js`\n\s*\n```.*?\n(.*?)```\s*(?:\n|$)/s
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
const data = await readFile(['build.md'])
worker.postMessage(['notebook', data], [data.buffer])
