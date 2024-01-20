import { join } from 'https://deno.land/std@0.207.0/path/mod.ts'

async function runDocker(args) {
  const output = await new Deno.Command('docker', {
    args,
    cwd: join('.', 'build', 'build-libraries'),
  }).output()
  return {...output, command: `docker ${args.join(' ')}`}
}

async function* runDockerStream(args) {
  try {
    yield {command: `docker ${args.join(' ')}`}
    const command = new Deno.Command('docker', {
      args,
      cwd: join('.', 'build', 'build-libraries'),
      stdin: 'piped',
      stdout: 'piped',
      stderr: 'piped'
    })
    const stdoutStream = new TextDecoderStream()
    const stderrStream = new TextDecoderStream()
    let chunks = []
    async function appendStdout() {
      try {
        for await (const chunk of stdoutStream.readable) {
          chunks.stdout.push(chunk)
        }
      } catch (err) {
        console.error('Error in appendStdout', err)
      }
    }
    async function appendStderr() {
      try {
        for await (const chunk of stderrStream.readable) {
          chunks.stderr.push(chunk)
        }
      } catch (err) {
        console.error('Error in appendStderr', err)
      }
    }
    appendStdout()
    appendStderr()
    const child = command.spawn()
    child.stdin.close()
    child.stdout.pipeTo(stdoutStream.writable)
    child.stderr.pipeTo(stderrStream.writable)
    let status
    async function setStatus() {
      status = await child.status
    }
    setStatus()
    let open = true
    while (status === undefined) {
      await new Promise((resolve, _reject) => setTimeout(() => resolve(), 100))
      if (chunks.stdout.length > 0 || chunks.stderr.length > 0) {
        yield Object.fromEntries(['stdout', 'stderr'].map(f => ([
          f, chunks.filter(c => c[0] === 'stdout').map(c => c[1]).join('')
        ])))
      }
      chunks = []
    }
  } catch (err) {
    console.error('Error running docker', err)
  }
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
      yield {command: `proxyContainerId: ${JSON.stringify(proxyContainerId)}`}
      yield createOutput

      const connectOutput = await runDocker([
        'network', 'connect', 'ristretto-build-libraries-external', proxyContainerId
      ])
      yield connectOutput

      const startOutput = await runDocker([
        'start', proxyContainerId
      ])
      yield startOutput

      for await (const output of runDockerStream([
        'run', '--platform=linux/amd64',
        '--network=ristretto-build-libraries-internal',
        'ristretto-build-libraries-build-in-container'
      ])) {
        yield output
      }

      const stopOutput = await runDocker([
        'stop', proxyContainerId
      ])
      yield stopOutput
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