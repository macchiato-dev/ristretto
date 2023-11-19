import { join } from 'https://deno.land/std@0.207.0/path/mod.ts'

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
  if (path.length === 1 && path[0] === 'notebook.md') {
    await Deno.writeTextFile(join('.', ...path), new TextDecoder().decode(data))
  } else {
    throw new Error('Not in list of files permitted for writing')
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
