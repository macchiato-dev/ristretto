import { join } from 'https://deno.land/std@0.207.0/path/mod.ts'

async function runDocker(args) {
  const output = await new Deno.Command('docker', {
    args,
    cwd: join('.', 'build', 'build-libraries'),
  }).output()
  return {...output, command: `docker ${args.join(' ')}`}
}

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
        yield await runDocker(command)
      }
    },
    multi: true,
  },
  buildImages: {
    fn: async function* buildImages() {
      const commands = [
        [
          'build',
          '--platform', 'linux/amd64',
          '-t', 'ristretto-build-libraries-proxy',
          '-f', 'Dockerfile.proxy',
          '.'
        ],
        [
          'build',
          '--platform', 'linux/amd64',
          '-t', 'ristretto-build-libraries-build-in-container',
          '-f', 'Dockerfile.build-in-container',
          '.'
        ],
      ]
      for (const command of commands) {
        yield await runDocker(command)
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
        yield await runDocker(command)
      }
    },
    multi: true,
  },
  async createVolumes() {
  },
  runBuild: {
    fn: async function* runBuild() {
      const createOutput = await runDocker([
        'create', '--platform=linux/amd64',
        '--network=ristretto-build-libraries-internal',
        '--network-alias=proxy',
        'ristretto-build-libraries-proxy'
      ])
      const proxyContainerId = new TextDecoder().decode(createOutput.stdout).trim()
      yield createOutput

      yield await runDocker([
        'network', 'connect', 'ristretto-build-libraries-external', proxyContainerId
      ])
      yield await runDocker([
        'start', proxyContainerId
      ])
      yield await runDocker([
        'run', '--platform=linux/amd64',
        '--network=ristretto-build-libraries-internal',
        'ristretto-build-libraries-build-in-container'
      ])
      yield await runDocker([
        'stop', proxyContainerId
      ])
    },
    multi: true
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