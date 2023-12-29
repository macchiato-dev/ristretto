# Build Libraries

This builds node/npm modules with a container image.

It requires an image tagged `ristretto-deno-node`, that can be built with the instructions in [build-docker.md](build-docker.md).

With Docker/Podman it creates:

- an internal-only network
- a container for a proxy with access to the internal-only network and the web
- a container for the build with access to the internal container only
- volumes for caching

It uses a script that shells out to `docker` and runs on the Docker client (the host or a Docker-in-Docker container), and another script in the build container that shells out to `npm`. The script that shells out to `docker` is `run-container-build.js` and the script that shells out to `npm` is `run-module-build.js`. Each of these scripts are run with `deno permissions` that are by necessity fairly broad, because they allow running `docker` and `npm` with any argumens, but have some of the code running in a worker without these permissions, to make them smaller and easeir to audit, as well as to run manually.

## Run Container Build

The Dockerfiles are included here, and if writing them fails, it throws an error.

`Dockerfile.proxy`

```docker
FROM ristretto-deno-node:latest
ADD proxy.js /
ENTRYPOINT []
CMD ["/bin/deno", "run", "--allow-net", "proxy.js"]
```

`proxy.js`

```js
Deno.serve({ port: 3000 }, async request => {
  const url = new URL(request.url)
  url.search = search
  const headers = new Headers(request.headers)
  headers.set('Host', url.hostname)
  return fetch(url, {
    method: request.method,
    headers,
    body: request.body,
    redirect: 'manual',
  })
})
```

`run-container-build.js`

```js
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
  async runNpm() {
    // start the proxy
    const createCmd = new Deno.Command('docker', {
      args: [
        'create', '--platform=linux/amd64', '--rm',
        '--network=ristretto-build-libraries-internal',
        '--network-alias=proxy',
        'ristretto-build-libraries-proxy'
      ]
    })
    const createOutput = await createCmd.output()
    const proxyContainerId = new TextDecoder().decode(createOutput.stdout)
    const connectCmd = new Deno.Command('docker', {
      args: [
        'network', 'connect', 'ristretto-build-libraries-external', proxyContainerId
      ],
    })
    await connectCmd.output()
    const startCommand = new Deno.Command('docker', {
      args: ['start', proxyContainerId]
    })
    await startCmd.output()
    // TODO: run npm in container with just access to internal with proxy set
    const stopCommand = new Deno.Command('docker', {
      args: ['stop', proxyContainerId]
    })
    await stopCmd.output()
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

function logOutput(output) {
  if (output.stdout.byteLength > 0) {
    console.log(new TextDecoder().decode(output.stdout))
  }
  if (output.stderr.byteLength > 0) {
    console.log(new TextDecoder().decode(output.stderr))
  }
}

const commands = {
  async clean() {
    for await (const output of parentRequestMulti('clean')) {
      logOutput(output)
    }
  },
  async buildImage() {
    for await (const output of parentRequestMulti('buildImage')) {
      logOutput(output)
    }
  },
  async createNetworks() {
    for await (const output of parentRequestMulti('createNetworks')) {
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
