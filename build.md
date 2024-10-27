# Build

This builds Ristretto. It runs a Markdown file with Deno, using a wrapper that gives it access to specific things through postMessage, much like how Ristretto runs.

Run it with this command:


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
    if (!(file.name.startsWith('.') || file.name === '_notas')) {
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
    if (cmd === '_log') {
      const [message] = args
      console.log(message)
      port.postMessage(undefined)
    } else if (cmd === '_err') {
      const [err] = args
      console.error(err)
      port.postMessage(undefined)
    } else if (cmd === 'readPaths') {
      const paths = await Array.fromAsync(readPaths())
      port.postMessage(paths)
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

async function log(message) {
  return await parentRequest('_log', message)
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

async function renderNotebook() {
  const appViewSrc = new TextDecoder().decode(await readFile(['app-view.md']))
  const loaderSrc = new TextDecoder().decode(await readFile(['loader.md']))
  let entry = ''
  for (const block of readBlocksWithNames(loaderSrc)) {
    if (block.name === 'entry.js') {
      entry = loaderSrc.slice(...block.blockRange)
    }
  }
  return `${appViewSrc}\n\n${entry}`
}

async function buildNotebook() {
  const allPaths = await readPaths()
  const sortedPaths = allPaths.sort((a, b) => {
    const withBundle = [a, b].map(path => [path.some(s => s.includes('codemirror-bundle.md')) ? 'b' : 'a', ...path])
    const len = Math.max(...withBundle.map(path => path.length))
    for (let i=0; i < len; i++) {
      const result = (withBundle[0][i] ?? '').localeCompare(withBundle[1][i] ?? '')
      if (result !== 0) {
        return result
      }
    }
    return 0
  })
  const paths = sortedPaths.filter(path => (
    path.at('-1').endsWith('.md') &&
    path.at(0) !== 'build' &&
    path.at(0) !== 'out'
  ))
  let output = await renderNotebook()
  for (const path of paths) {
    const text = new TextDecoder().decode(await readFile(path))
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
  }
  const data = new TextEncoder().encode(output.trimLeft())
  await writeFile(['out', 'notebook.md'], data)
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
    ['build-docker.md'],
    'Dockerfile',
    ['build', 'build-docker', 'Dockerfile']
  )
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
    ['bundle-libraries.md'],
    'run-bundle-libraries.js',
    ['build', 'build-libraries', 'run-bundle-libraries.js']
  )
}

const introScript = `
class Macchiato {
  static {
    function replacementFn() { throw new Error('WebRTC call blocked') }
    Object.defineProperties(window, Object.fromEntries(
      Object.getOwnPropertyNames(window).filter(name => name.includes('RTC')).map(
        name => ([name, {value: replacementFn, configurable: false, writable: false}])
      )
    ))
    this.initialized = true
  }

  static init() {
    if (!this.initialized) {
      throw new Error('Not initialized')
    }
  }

  static modules = {}
  static data = {}
}

Object.defineProperty(window, 'Macchiato', {
  value: Macchiato,
  writable: false,
  configurable: false,
})
`.trimLeft()

// from loader
async function buildModule(name, data) {
  let initAppend = ""
  let append = ""
  const out = data.replaceAll(
    /^\s*export\s+(?:class|function|async\s+function|const)\s+([^\s(]+)/gms,
    (match, p1) => {
      const path = JSON.stringify(name)
      const mref = `Macchiato.modules[${path}]`
      const pref = `[${JSON.stringify(p1)}]`
      initAppend = `\n\n${mref} = {}`
      const s = `${mref}${pref} = ${p1}`
      append += "\n" + s
      return `// append: ${s}\n${match}`
    }
  ).replaceAll(
    /^\s*import\s+(\{[^}]+\})\s+from\s+("[^"]+"|'[^']+')/gms,
    (match, p1, p2) => {
      const vars = p1.replaceAll(' as ', ': ')
      const importPath = p2.slice(1, -1)
      if (importPath.startsWith('/')) {
        const path = JSON.stringify(importPath.slice(1))
        const ref = `Macchiato.modules[${path}]`
        return `const ${vars} = ${ref}`
      } else {
        const path = JSON.stringify(importPath)
        const ref = `Macchiato.externalModules[${path}]`
        return `const ${vars} = ${ref}`
      }
    }
  )
  return (
    `Macchiato.init()\n` + out + initAppend + append
  )
}

async function getSha(src) {
  const data = new TextEncoder().encode(src)
  const shaData = await crypto.subtle.digest('SHA-384', data)
  return await new Promise(r => {
    const fr = new FileReader()
    fr.onload = () => r(fr.result.split(',')[1])
    fr.readAsDataURL(new Blob([shaData]))
  })
}

async function readCsps() {
  const result = {}
  try {
    const src = new TextDecoder().decode(await readFile(['build', 'csps.md']))
    for (const line of src.split("\n")) {
      const match = line.match(/^- `([\w/+]+)` `([\w-]+)` \[([^\]]*)\]/)
      if (match) {
        const [sha, status, name] = match.slice(1)
        result[name] = {sha, status}
      }
    }
  } catch (err) {
    await log(`Error loading CSPs, skipping: ${err}`)
  }
  return result
}

async function buildCsps() {
  const cspInfo = await readCsps()
  const paths = (await readPaths()).filter(path => (
    path.at('-1').endsWith('.md') &&
    path.at(0) !== 'build' &&
    path.at(0) !== 'out'
  )).toSorted((a, b) => a.join('/').localeCompare(b.join('/')))
  let output = `# CSPs\n\n`
  for (const path of paths) {
    const src = new TextDecoder().decode(await readFile(path))
    let blocks = []
    for (const block of readBlocksWithNames(src)) {
      if ((block.name ?? '').endsWith('.js')) {
        blocks.push(block)
      }
    }
    for (const block of blocks.toSorted((a, b) => a.name.localeCompare(b.name))) {
      const blockSrc = src.slice(...block.contentRange)
      const blockPath = `${path.join('/').replace(/.md$/, '')}/${block.name}`
      const sha = await getSha(blockPath, blockSrc)
      const name = `${path.join('/')}/${block.name}`
      const info = cspInfo[name]
      let status = info?.status ?? 'none'
      if (!(status === 'none' || status.startsWith('review-')) && info?.sha !== sha) {
        status = `review-${status}`
      }
      output += `- \`${sha}\` \`${status}\` [${name}](../${path.join('/')})\n`
    }
  }
  await writeFile(['build', 'csps.md'], new TextEncoder().encode(output))
}

async function build() {
  await log(`Building scripts...`)
  await buildScripts()
  await log(`Building notebook...`)
  await buildNotebook()
  await log(`Building CSPs...`)
  await buildCsps()
  await log(`Done.`)
}

try {
  await build()
} catch (err) {
  await parentRequest('_err', `${err}`)
}
close()
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
      new RegExp('(?<=\\n\\r?[ \\t]*\\n\\r?)`([^`]+)`\\s*\\n\\s*$')
    )
    yield ({...block, ...(match ? {name: match[1], blockRange: [block.blockRange[0] - match[0].length, block.blockRange[1]]} : undefined)})
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

`run.sh`

```
deno run --allow-read=. --allow-write=./build,./out --unstable-worker-options run-build.js
```
