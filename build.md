# Build

This builds Ristretto. It runs a Markdown file with Deno, using a wrapper that gives it access to specific things through postMessage, much like how Ristretto runs.

Run it with this command:

```
deno run --allow-read=. --allow-write=./build,./out --unstable-worker-options run-build.js
```

`run-build.js`

```js
import { join } from 'https://deno.land/std@0.207.0/path/mod.ts'

let writeReady = false

async function initWrite() {
  if (!writeReady) {
    for (const dir of ['build', 'out']) {
      try {
        await Deno.stat(join('.', dir))
      } catch (e) {
        if (e instanceof Deno.errors.NotFound) {
          await Deno.mkdir(join('.', dir))
        }
      }
    }
    writeReady = true
  }
}

async function* readPaths(suffix = '.md', parent = []) {
  const dirs = []
  for await (const file of Deno.readDir(join('.', ...parent))) {
    if (!file.name.startsWith('.')) {
      if (file.isDirectory) {
        dirs.push(file.name)
      } else if (file.name.endsWith(suffix)) {
        yield [...parent, file.name]
      }
    }
  }
  for (const dir of dirs) {
    for await (const path of readPaths(suffix, [...parent, dir])) {
      yield path
    }
  }
}

async function readFile(path) {
  return await Deno.readFile(join('.', ...path))
}

async function writeFile(path, data) {
  await initWrite()
  const [topDir, ...rest] = path
  if (['build', 'out'].includes(topDir)) {
    const writePath = join('.', topDir, ...rest)
    if (writePath.match(/\.(md|html|json|js|svg)$/)) {
      await Deno.writeTextFile(writePath, new TextDecoder().decode(data))
    } else if (writePath.match(/\.(png|webm|jpe?g|ico)$|Dockerfile\.?/)) {
      await Deno.writeFile(writePath, data)
    } else {
      throw new Error('File type not allowed')
    }
  } else {
    throw new Error('Access denied')
  }
  await Deno.readFile(join('.', ...path))
}

async function handleMessage(e) {
  const [cmd, ...args] = e.data
  const port = e.ports[0]
  try {
    if (cmd === 'readPaths') {
      port.postMessage(await Array.fromAsync(readPaths()))
    } else if (cmd === 'readFile') {
      const [path] = args
      const data = await readFile(path)
      port.postMessage(data, [data.buffer])
    } else if (cmd === 'writeFile') {
      const [path, data] = args
      port.postMessage(await writeFile(path, data))
    } else {
      throw new Error(`Invalid command sent from worker: ${cmd}`)
    }
  } catch (err) {
    console.error('Error providing output for worker', err)
    port.postMessage(false)
  }
  port.close()
}

const re = /(?:^|\n)\s*\n`entry.js`\n\s*\n```.*?\n(.*?)```\s*(?:\n|$)/s
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
```

`build.js`

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

async function buildNotebook() {
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

async function buildScript(path, blockName, out) {
  const src = new TextDecoder().decode(await readFile(path))
  if (blockName !== undefined) {
    for (const block of readBlocksWithNames(src)) {
      if (block.name === blockName) {
        const data = new TextEncoder().encode(src.slice(...block.contentRange))
        await writeFile(out, data)
      }
    }
  } else {
    await writeFile(out, new TextEncoder().encode(src))
  }
}

async function buildScripts() {
  await buildScript(
    ['build-libraries.md'],
    'run-container-build.js',
    ['build', 'build-libraries', 'run-container-build.js']
  )
  await buildScript(
    ['build-libraries.md'],
    'Dockerfile.proxy',
    ['build', 'build-libraries', 'Dockerfile.proxy']
  )
  await buildScript(
    ['build-libraries.md'],
    'proxy.js',
    ['build', 'build-libraries', 'proxy.js']
  )
  await buildScript(
    ['build-libraries.md'],
    undefined,
    ['build', 'build-libraries', 'build-libraries.md']
  )
  await buildScript(
    ['build-libraries.md'],
    'Dockerfile.build-in-container',
    ['build', 'build-libraries', 'Dockerfile.build-in-container']
  )
  await buildScript(
    ['build-libraries.md'],
    'run-build-in-container.js',
    ['build', 'build-libraries', 'run-build-in-container.js']
  )
  await buildScript(
    ['build-docker.md'],
    'Dockerfile',
    ['build', 'build-docker', 'Dockerfile']
  )
}

async function build() {
  await buildScripts()
  await buildNotebook()
}

await build()
```

`entry.js`

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
    if (
      block.name !== undefined && block.name.endsWith('.js') &&
      block.name !== 'run-build.js' && block.name !== 'entry.js'
    ) {
      const blockSrc = src.slice(...block.contentRange)
      await import(`data:text/javascript;base64,${btoa(blockSrc)}`)
    }
  }
}

run(__source)
```
