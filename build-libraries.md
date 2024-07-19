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
  const result = [
    ['stdout', `-- npm ${args.join(' ')}`],
    ...(output.stdout?.byteLength > 0 ? [['stdout', output.stdout]] : []),
    ...(output.stderr?.byteLength > 0 ? [['stderr', output.stderr]] : []),
  ]
  if (output.code === 0) {
    return result
  } else {
    return [
      ...result,
      ['stderr', `-- Received nonzero exit code: ${output.code}`]
    ]
  }
}

const packages = [
  '@rollup/browser@3.29.1',
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
  '@codemirror/lang-markdown',
  '@codemirror/lang-python',
  '@codemirror/lang-rust',
  '@codemirror/lang-xml',
  '@codemirror/lang-sql',
  '@codemirror/lang-wast',
  '@lezer/highlight',
  'prosemirror-state',
  'prosemirror-view',
  'prosemirror-model',
  'prosemirror-schema-basic',
  'prosemirror-schema-list',
  'prosemirror-example-setup',
  'prosemirror-history',
  'prosemirror-keymap',
  'prosemirror-commands',
]

async function* getFiles(path) {
  for await (const entry of Deno.readDir(path)) {
    if (entry.isDirectory) {
      const dirPath = `${path}${entry.name}/`
      for await (const childPath of getFiles(dirPath)) {
        yield childPath
      }
    } else if (entry.name.match(/\.(js|json|mjs)$/i) && entry.name !== './run-build-in-container.js') {
      yield `${path}${entry.name}`
    }
  }
}

const commands = {
  getArgs() {
    return structuredClone(Deno.args)
  },
  install: async function* install() {
    yield ['stdout', new TextEncoder().encode(`Installing packages:\n\n\`\`\`\n`)]
    const setOutput = await runNpm(['set', 'proxy=http://proxy:3000/'])
    yield setOutput
    const initOutput = await runNpm(['init', '-y'])
    yield initOutput
    const installOutput = await runNpm(['install', ...packages])
    yield installOutput
    yield ['stdout', new TextEncoder().encode(`\n\n\`\`\`\n\n\n\n`)]
    for await (const path of getFiles('./')) {
      const content = await Deno.readFile(path)
      yield ['stdout', new TextEncoder().encode(`\n\n\`${path.slice(2)}\`\n\n\`\`\`\`\`\n`)]
      yield ['stdout', content]
      yield ['stdout', new TextEncoder().encode(`${(content.at(-1) === 10 ? '' : "\n")}\`\`\`\`\`\n\n`)]
    }
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

function iterResult(result) {
  if (result?.done) {
    return {done: true}
  } else {
    return {value: result}
  }
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
            return Promise.resolve(iterResult(results.shift()))
          } else {
            return new Promise((resolve, _) => {
              resolves.push(value => { resolve(iterResult(value)) })
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

async function* parentRequestMulti(...data) {
  const channel = new MessageChannel()
  const iterator = eventToIterator(
    handler => { channel.port1.onmessage = ({data}) => handler(data) },
    () => channel.port1.close()
  )
  postMessage(data, [channel.port2])
  for await (const message of iterator) {
    if (Array.isArray(message) && typeof message[0] === 'string') {
      yield message
    } else if (Array.isArray(message)) {
      for (const outputItem of message) {
        yield outputItem
      }
    } else if (message?.error) {
      throw new Error('Received error from request to parent')
    } else {
      console.error('unexpected message', message)
      throw new Error('Received an unexpected message from request to parent')
    }
  }
}

async function logOutput(output) {
  const stream = output[0] === 'stdout' ? Deno.stdout : Deno.stderr
  await stream.write(
    typeof output[1] === 'string' ?
    new TextEncoder().encode(output[1] + "\n") :
    output[1]
  )
}

const commands = {
  async build() {
    for await (const output of parentRequestMulti('install')) {
      await logOutput(output)
    }
  }
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
  try {
    for await (const chunk of outConn.readable) {
      console.log(`read chunk of ${chunk.byteLength} bytes from outbound connection`)
      try {
        await writer.write(chunk)
      } catch (err) {
        console.error('Error writing to inbound connection')
      }
    }
  } catch (err) {
    console.error('Error forwarding from outbound to inbound connection')
  }
}

async function handleHttp(conn) {
  try {
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
  } catch (err) {
    console.error('error in HTTP handler')
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
  return [
    ['stdout', `-- docker ${args.join(' ')}`],
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
          chunks.push(['stderr', chunk])
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
      if (status !== undefined) {
        break
      }
      chunks = []
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
    const commandOutput = createOutput.find(v => (
      v[0] === 'stdout' && !(typeof v[1] === 'string' && v[1].startsWith('-- '))
    ))
    const proxyContainerId = new TextDecoder().decode(commandOutput[1]).trim()
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

    const outFile = await Deno.open(
      './build/build-libraries/library-source.md',
      {write: true, create: true, truncate: true}
    )
    const outWriter = outFile.writable.getWriter()
    for await (const output of runDockerStream([
      'run', '--tty=false', '--platform=linux/amd64',
      '--network=ristretto-build-libraries-internal',
      'ristretto-build-libraries-build-in-container'
    ])) {
      yield output
      for (const outputItem of (typeof output[0] === 'string' ? [output] : output)) {
        if (outputItem[0] === 'stdout') {
          await outWriter.write(
            typeof outputItem[1] === 'string' ?
            new TextEncoder().encode(outputItem[1]) :
            outputItem[1]
          )
        }
      }
    }
    outFile.close()

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

function iterResult(result) {
  if (result?.done) {
    return {done: true}
  } else {
    return {value: result}
  }
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
            return Promise.resolve(iterResult(results.shift()))
          } else {
            return new Promise((resolve, _) => {
              resolves.push(value => { resolve(iterResult(value)) })
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

async function* parentRequestMulti(...data) {
  const channel = new MessageChannel()
  const iterator = eventToIterator(
    handler => { channel.port1.onmessage = ({data}) => handler(data) },
    () => channel.port1.close()
  )
  postMessage(data, [channel.port2])
  for await (const message of iterator) {
    if (Array.isArray(message) && typeof message[0] === 'string') {
      yield message
    } else if (Array.isArray(message)) {
      for (const outputItem of message) {
        yield outputItem
      }
    } else if (message?.error) {
      throw new Error('Received error from request to parent')
    } else {
      console.error('unexpected message', message)
      throw new Error('Received an unexpected message from request to parent')
    }
  }
}

async function logOutput(output) {
  const stream = output[0] === 'stdout' ? Deno.stdout : Deno.stderr
  await stream.write(
    typeof output[1] === 'string' ?
    new TextEncoder().encode(output[1] + "\n") :
    output[1]
  )
}

const commands = {
  async clean() {
    for await (const output of parentRequestMulti('clean')) {
      await logOutput(output)
    }
  },
  async buildImages() {
    for await (const output of parentRequestMulti('buildImages')) {
      await logOutput(output)
    }
  },
  async createNetworks() {
    for await (const output of parentRequestMulti('createNetworks')) {
      await logOutput(output)
    }
  },
  async runBuild() {
    for await (const output of parentRequestMulti('runBuild')) {
      await logOutput(output)
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
