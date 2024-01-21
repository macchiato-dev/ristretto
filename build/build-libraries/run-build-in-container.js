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

async function* getFiles(path) {
  for await (const entry of Deno.readDir(path)) {
    if (entry.isDirectory) {
      const dirPath = `${path}${entry.name}/`
      for await (const childPath of getFiles(dirPath)) {
        yield childPath
      }
    } else if (entry.name.match(/\.(js|json|mjs)$/i) && entry.name !== './run-container-build.js') {
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
    for await (const path of getFiles('./')) {
      const content = await Deno.readTextFile(path)
      const outputDoc = `\n\`\`\`\n\n\`${path.slice(2)}\`\n\n\`\`\`\n${content + (content.endsWith("\n") ? '' : "\n")}\`\`\`\n`
      yield ['stdout', new TextEncoder().encode(outputDoc)]
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