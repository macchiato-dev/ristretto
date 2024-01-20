# Build Libraries

This builds node/npm modules with a container image.

It requires an image tagged `ristretto-deno-node`, that can be built with the instructions in [build-docker.md](build-docker.md).

With Docker/Podman it creates:

- an internal-only network
- a container for a proxy with access to the internal-only network and the web
- a container for the build with access to the internal container only
- volumes for caching

It uses a script that shells out to `docker` and runs on the Docker client (the host or a Docker-in-Docker container), and another script in the build container that shells out to `npm`. The script that shells out to `docker` is `run-container-build.js` and the script that shells out to `npm` is `run-build-in-container.js`. Each of these scripts are run with `deno permissions` that are by necessity fairly broad, because they allow running `docker` and `npm` with any arguments, but have some of the code running in a worker without these permissions, to make them smaller and easeir to audit, as well as to run manually.

## Build inside container

This build runs inside the container and is used to run npm.

`Dockerfile.build-in-container`

```docker
FROM ristretto-deno-node:latest
WORKDIR /app
ADD build-libraries.md /app
ADD run-build-in-container.js /app
ENTRYPOINT []
CMD ["/bin/deno", "run", "--allow-net", "--allow-read=/app", "--allow-write=/app", "--allow-run=npm", "run-build-in-container.js", "build"]
```

`run-build-in-container.js`

```js
async function runNpm(args) {
  const output = await new Deno.Command('npm', {
    args,
  }).output()
  return {...output, command: `npm ${args.join(' ')}`}
}

const packages = [
  '@rollup/browser',
  '@codemirror/autocomplete',
  '@codemirror/commands',
  '@codemirror/language',
  '@codemirror/lint',
  '@codemirror/search',
  '@codemirror/state',
  '@codemirror/view',
  '@codemirror/lang-html',
  '@codemirror/lang-css',
  '@codemirror/lang-json',
  '@codemirror/lang-javascript',
]

const commands = {
  getArgs() {
    return structuredClone(Deno.args)
  },
  install: {
    fn: async function* install() {
      yield {stdout: `Installing packages:\n\n\`\`\`\n`}
      yield await runNpm(['set', 'proxy=http://proxy:3000/'])
      yield await runNpm(['init', '-y'])
      yield await runNpm(['install', ...packages])
      const packageJson = await Deno.readTextFile('package.json')
      const outputDoc = `\n\`\`\`\n\n\`package.json\`\n\n\`\`\`\n${packageJson}\`\`\`\n`
      yield {stdout: new TextEncoder().encode(outputDoc)}
    },
    multi: true,
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

const re = /(?:^|\n)\s*\n`build-in-container-entry.js`\n\s*\n```.*?\n(.*?)```\s*(?:\n|$)/s
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
const data = await Deno.readFile('./build-libraries.md')
worker.postMessage(['notebook', data], [data.buffer])
```

`build-in-container.js`

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

function eventToIterator(subscribe, unsubscribe) {
  const resolves = []
  const results = []
  subscribe(result => {
    if (resolves.length > 0) {
      (resolves.shift())(result)
    } else {
      results.push(result)
    }
  })
  return {
    [Symbol.asyncIterator]() {
      return {
        next() {
          if (results.length > 0) {
            return Promise.resolve(results.shift())
          } else {
            return new Promise((resolve, _) => {
              resolves.push(resolve)
            })
          }
        },
        return() {
          unsubscribe()
        }
      }
    }
  }
}

function parentRequestMulti(...data) {
  const channel = new MessageChannel()
  const iterator = eventToIterator(
    handler => { channel.port1.onmessage = ({data}) => handler(data) },
    () => channel.port1.close()
  )
  postMessage(data, [channel.port2])
  return iterator
}

function logValue(value, prefix = '') {
  if (typeof value === 'string') {
    console.log(prefix + value)
  } else if (value?.byteLength > 0) {
    console.log(prefix + new TextDecoder().decode(value))
  }
}

function logOutput(output) {
  logValue(output.command, '-- ')
  logValue(output.stdout)
  logValue(output.stderr)
}

const commands = {
  async build() {
    for await (const output of parentRequestMulti('install')) {
      logOutput(output)
    }
  },
}

async function build() {
  try {
    const [cmd, ...args] = await parentRequest('getArgs')
    if (cmd in commands) {
      await commands[cmd](...args)
    } else {
      console.error(
        ((cmd ?? undefined) === undefined) ?
        'missing command' :
        `invalid command: ${cmd}`
      )
    }
    close()
  } catch (err) {
    console.error(err)
    close()
  }
}

await build()
```

`build-in-container-entry.js`

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
    if (block.name === 'build-in-container.js') {
      const blockSrc = src.slice(...block.contentRange)
      await import(`data:text/javascript;base64,${btoa(blockSrc)}`)
    }
  }
}

run(__source)
```

## Proxy

The Dockerfile is here, and if writing it fails, it throws an error.

`Dockerfile.proxy`

```docker
FROM ristretto-deno-node:latest
ADD proxy.js /
ENTRYPOINT []
CMD ["/bin/deno", "run", "--allow-net", "proxy.js"]
```

This is an HTTP proxy that reads a host and port from CONNECT, responds, and tunnels all traffic after the response to the specified host and port.

`proxy.js`

```js
async function forward(outConn, writer) {
  for await (const chunk of outConn.readable) {
    console.log(`read chunk of ${chunk.byteLength} bytes from outbound connection`)
    try {
      await writer.write(chunk)
    } catch (err) {
      console.error('Error writing to outbound connection')
    }
  }
}

async function handleHttp(conn) {
  let pos = 0
  const arr = new Uint8Array(512)
  let outWriter
  // TODO: don't let reading of the stream be delayed by setting up the writer and network connection
  for await (const chunk of conn.readable) {
    if (outWriter === undefined) {
      arr.set(chunk, pos)
      pos += chunk.byteLength
      console.log(`Received chunk of ${chunk.byteLength} bytes`)
      const decoded = new TextDecoder().decode(arr.slice(0, pos))
      console.log(`Decoded: ${decoded}`)
      const match = decoded.match(/\r?\n\r?\n/)
      if (match) {
        const messageEnd = match.index + match[0].length
        const message = decoded.slice(0, messageEnd)
        const remaining = arr.slice(new TextEncoder().encode(message).byteLength, pos)
        const proxyUrl = message.match(/CONNECT (\S+) HTTP/)[1].split(':')
        const hostname = proxyUrl[0]
        const port = Number(proxyUrl[1])
        const connectArgs = {hostname, port}
        const writer = await conn.writable.getWriter()
        await writer.write(new Uint8Array(new TextEncoder().encode('HTTP/1.1 200 Connection established\r\n\r\n')))
        console.log(`Connecting to hostname "${hostname}", port ${port}...`)
        const outConn = await Deno.connect(connectArgs)
        outWriter = await outConn.writable.getWriter()
        // TODO: send remaining
        forward(outConn, writer)
      }
    } else {
      console.log(`read chunk of ${chunk.byteLength} bytes after sending response`)
      try {
        await outWriter.write(chunk)
      } catch (err) {
        console.error('Error writing to outbound connection', err)
      }
    }
  }
}

// see if a plain old request can be sent
for await (const conn of Deno.listen({ port: 3000 })) {
  handleHttp(conn)
}
```

## Run Container Build

This gives access to the build script to run commands and access resources needed to build the libraries.

`run-container-build.js`

```js
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
```


## The build script

This is run in the sandboxed worker by the entry point, and it calls into the parent.

`container-build.js`

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

function eventToIterator(subscribe, unsubscribe) {
  const resolves = []
  const results = []
  subscribe(result => {
    if (resolves.length > 0) {
      (resolves.shift())(result)
    } else {
      results.push(result)
    }
  })
  return {
    [Symbol.asyncIterator]() {
      return {
        next() {
          if (results.length > 0) {
            return Promise.resolve(results.shift())
          } else {
            return new Promise((resolve, _) => {
              resolves.push(resolve)
            })
          }
        },
        return() {
          unsubscribe()
        }
      }
    }
  }
}

function parentRequestMulti(...data) {
  const channel = new MessageChannel()
  const iterator = eventToIterator(
    handler => { channel.port1.onmessage = ({data}) => handler(data) },
    () => channel.port1.close()
  )
  postMessage(data, [channel.port2])
  return iterator
}

function logValue(value, prefix = '') {
  if (typeof value === 'string') {
    console.log(prefix + value)
  } else if (value?.byteLength > 0) {
    console.log(prefix + new TextDecoder().decode(value))
  }
}

function logOutput(output) {
  logValue(output.command, '-- ')
  logValue(output.stdout)
  logValue(output.stderr)
}

const commands = {
  async clean() {
    for await (const output of parentRequestMulti('clean')) {
      logOutput(output)
    }
  },
  async buildImages() {
    for await (const output of parentRequestMulti('buildImages')) {
      logOutput(output)
    }
  },
  async createNetworks() {
    for await (const output of parentRequestMulti('createNetworks')) {
      logOutput(output)
    }
  },
  async runBuild() {
    for await (const output of parentRequestMulti('runBuild')) {
      logOutput(output)
    }
  },
}

async function build() {
  try {
    const [cmd, ...args] = await parentRequest('getArgs')
    if (cmd in commands) {
      await commands[cmd](...args)
    } else {
      console.error(
        ((cmd ?? undefined) === undefined) ?
        'missing command' :
        `invalid command: ${cmd}`
      )
    }
    close()
  } catch (err) {
    console.error(err)
    close()
  }
}

await build()
```

`container-build-entry.js`

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
    if (block.name === 'container-build.js') {
      const blockSrc = src.slice(...block.contentRange)
      await import(`data:text/javascript;base64,${btoa(blockSrc)}`)
    }
  }
}

run(__source)
```
