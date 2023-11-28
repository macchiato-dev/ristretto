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

`run-container-build.js`

```js
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
const data = await readFile(['./build-libraries.md'])
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

async function readPaths() {
  return await parentRequest('readPaths')
}

async function readFile(path) {
  return await parentRequest('readFile', path)
}

async function writeFile(path, data) {
  await parentRequest('writeFile', path, data)
}

function arrEquals(a1, a2) {
  return a1.length === a2.length && a1.every((v, i) => v === a2[i])
}

async function build() {
  try {
    const allPaths = await readPaths()
    const paths = [
      [['explore.md']],
      ...allPaths.filter(path => (
        path.at('-1').endsWith('.md') &&
        path.at(0) !== 'build' &&
        path.at(0) !== 'out' &&
        !arrEquals(path, ['README.md']) &&
        !arrEquals(path, ['notebook.md']) &&
        !arrEquals(path, ['explore.md']) &&
        !arrEquals(path, ['build.md'])
      )).map(path => ([path, true])),
    ]
    let output = ''
    for (const [path, wrap] of paths) {
      const text = new TextDecoder().decode(await readFile(path))
      if (wrap) {
        const quotes = '`'.repeat(Math.max(
          (
            text
            .matchAll(new RegExp('^\\s*(`+)', 'gm'))
            .map(m => m[1].length)
            .toArray()
            .toSorted((a, b) => a - b)
            .at(-1) ?? 0
          ) + 1,
          3
        ))
        if (path.some(part => part.includes('/'))) {
          throw new Error('/ found in path component')
        }
        const strPath = path.join('/')
        output = (
          output.trimRight() +
          `\n\n\`${strPath}\`\n\n${quotes}\n${text}\n${quotes}\n`
        )
      } else {
        output = output.trimRight() + "\n\n" + text + "\n"
      }
    }
    const data = new TextEncoder().encode(output.trimLeft())
    await writeFile(['out', 'notebook.md'], data)
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
