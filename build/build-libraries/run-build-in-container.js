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