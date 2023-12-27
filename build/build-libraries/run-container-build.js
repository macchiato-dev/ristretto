import { join } from 'https://deno.land/std@0.207.0/path/mod.ts'

const commands = {
  getArgs() {
    return structuredClone(Deno.args)
  },
  clean: {
    fn: async function* clean() {
      const commands = [
        ['network', 'rm', 'ristretto-build-libraries-internal'],
        ['network', 'rm', 'ristretto-build-libraries-external'],
      ]
      for (const command of commands) {
        const output = await new Deno.Command('docker', {
          args: command,
        }).output()
        yield output
      }
    },
    multi: true,
  },
  buildImage: {
    fn: async function* buildImage() {
      const commands = [
        [
          'build',
          '--platform', 'linux/amd64',
          '-t', 'ristretto-build-libraries-proxy',
          '-f', 'Dockerfile.proxy',
          '.'
        ],
      ]
      for (const command of commands) {
        const output = await new Deno.Command('docker', {
          args: command,
          cwd: join('.', 'build', 'build-libraries'),
        }).output()
        yield output
      }
    },
    multi: true,
  },
  createNetworks: {
    fn: async function* createNetworks() {
      const commands = [
        ['network', 'create', '--internal', 'ristretto-build-libraries-internal'],
        ['network', 'create', 'ristretto-build-libraries-external'],
      ]
      for (const command of commands) {
        const output = await new Deno.Command('docker', {
          args: command,
        }).output()
        yield output
      }
    },
    multi: true,
  },
  async createVolumes() {
  },
  async createContainers() {
  },
}

async function handleMessage(e) {
  const [cmd, ...args] = e.data
  const port = e.ports[0]
  try {
    if (cmd in commands) {
      if (commands[cmd].multi) {
        for await (const result of commands[cmd].fn(...args)) {
          port.postMessage({value: result})
        }
        port.postMessage({done: true})
      } else {
        port.postMessage(await commands[cmd](...args))
      }
    } else {
      throw new Error('invalid command')
    }
  } catch (err) {
    console.error(`Error running \`${cmd}\`:`, err)
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
const data = await Deno.readFile(join('.', 'build-libraries.md'))
worker.postMessage(['notebook', data], [data.buffer])