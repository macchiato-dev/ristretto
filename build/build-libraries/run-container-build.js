import { join } from 'https://deno.land/std@0.207.0/path/mod.ts'

async function runDocker(args) {
  const output = await new Deno.Command('docker', {
    args,
    cwd: join('.', 'build', 'build-libraries'),
  }).output()
  return [
    ['stdout', `npm ${args.join(' ')}`],
    ...(output.stdout?.byteLength > 0 ? [['stdout', output.stdout]] : []),
    ...(output.stderr?.byteLength > 0 ? [['stderr', output.stderr]] : []),
  ]
}

async function* runDockerStream(args) {
  try {
    yield ['stdout', `-- docker ${args.join(' ')}`]
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
          chunks.push(['stdout', chunk])
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
    while (true) {
      await new Promise((resolve, _reject) => setTimeout(() => resolve(), 100))
      if (chunks.length > 0) {
        yield chunks
      }
      chunks = []
      if (status !== undefined) {
        break
      }
    }
  } catch (err) {
    yield ['stderr', `Error running docker: ${err}`]
    yield {error: true}
  }
}

const commands = {
  getArgs() {
    return structuredClone(Deno.args)
  },
  clean: async function* clean() {
    const commands = [
      ['network', 'rm', 'ristretto-build-libraries-internal'],
      ['network', 'rm', 'ristretto-build-libraries-external'],
    ]
    for (const command of commands) {
      yield await runDocker(command)
    }
  },
  buildImages: async function* buildImages() {
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
  createNetworks: async function* createNetworks() {
    const commands = [
      ['network', 'create', '--internal', 'ristretto-build-libraries-internal'],
      ['network', 'create', 'ristretto-build-libraries-external'],
    ]
    for (const command of commands) {
      yield await runDocker(command)
    }
  },
  runBuild: async function* runBuild() {
    const createOutput = await runDocker([
      'create', '--platform=linux/amd64',
      '--network=ristretto-build-libraries-internal',
      '--network-alias=proxy',
      'ristretto-build-libraries-proxy'
    ])
    const proxyContainerId = new TextDecoder().decode(createOutput.stdout).trim()
    yield ['stdout', `-- proxyContainerId: ${JSON.stringify(proxyContainerId)}`]
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
}

async function handleMessage(e) {
  const [cmd, ...args] = e.data
  const port = e.ports[0]
  try {
    if (cmd === 'getArgs') {
      // single command
      const result = await commands[cmd](...args)
      port.postMessage(result)
    } else if (cmd in commands) {
      for await (const result of commands[cmd](...args)) {
        port.postMessage(result)
      }
      port.postMessage({done: true})
    } else {
      throw new Error('invalid command')
    }
  } catch (err) {
    console.error(`Error running \`${cmd}\``, err)
    port.postMessage({error: true})
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