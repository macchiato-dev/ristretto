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
      const paths = await Array.fromAsync(readPaths())
      paths.sort((a, b) => {
        const [strA, strB] = [join(...a), join(...b)]
        const hasBundle = [strA, strB].map(s => s.includes('codemirror-bundle.md') ? 'b' : 'a')
        const hasBundleCompare = hasBundle[0].localeCompare(hasBundle[1])
        return (hasBundleCompare !== 0) ? hasBundleCompare : strA.localeCompare(strB)
      })
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