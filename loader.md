# Loader

This loads a notebook into an iFrame so it can be run. The imports and exports of modules are replaced with use of `Macchiato.modules`.

There are three parts:

- `builder.js`: This is run inside of an outer frame with access to all the source needed and finds the requested source and puts it in a smaller Markdown file to be sent to the inner frame.
- `loader.js`: This takes the notebook and deps code from the Markdown file and rewrites the imports and exports to be run inside an iframe. They are changed to load and store modules using `Macchiato.modules`.
- `entry.js`: This sets functions for reading the Markdown blocks, and then uses them to read and run `loader.js`, which in turn uses `loader.js` to load and run the code.

## Builder

This is given the source and the source of the parent page. It reads the config from `notebook.json` which contains the deps, and it gets them from the parentSource and generates a markdown file with them.

`builder.js`

```js
export class Builder {
  constructor({src, parentSrc}) {
    this.src = src
    this.parentSrc = parentSrc
  }

  getConfig() {
    const defaultConfig = {
      bundleFiles: [],
      importFiles: [],
      dataFiles: [],
      includeFiles: [],
    }
    for (const block of readBlocksWithNames(this.src)) {
      if (block.name === 'notebook.json') {
        return {...defaultConfig, ...JSON.parse(this.src.slice(...block.contentRange))}
      }
    }
    return defaultConfig
  }

  getDeps() {
    let result = ''
    let entry = ''
    let loader = ''
    const config = this.getConfig()
    const deps = [
      ...config.bundleFiles,
      ...config.importFiles,
      ...config.dataFiles,
      ...config.includeFiles,
    ].map(v => Array.isArray(v) ? v[0] : v)
    for (const block of readBlocksWithNames(this.parentSrc)) {
      if (block.name === 'loader.md') {
        loader = `\n\n` + this.parentSrc.slice(...block.blockRange)
        const blockContent = this.parentSrc.slice(...block.contentRange)
        for (const subBlock of readBlocksWithNames(blockContent)) {
          if (subBlock.name === 'entry.js') {
            entry = `\n\n` + blockContent.slice(...subBlock.blockRange)
          }
        }
      } else if (deps.includes(block.name)) {
        result += `\n\n` + this.parentSrc.slice(...block.blockRange)
      }
    }
    return entry + loader + result
  }
}
```

## Loader

The Loader takes the sources and transforms them to run inside an iframe, by making the imports and exports use Macchiato.modules.

`loader.js`

```js
const defaultIntro = `

window.Macchiato = {
  modules: {},
  data: {}
}

`.trim()

export class Loader {
  constructor(src) {
    this.src = src
  }

  getBlockContent(blockName, subBlockName = undefined) {
    for (const block of readBlocksWithNames(this.src)) {
      if (block.name === blockName) {
        const blockSource = this.src.slice(...block.contentRange)
        if (subBlockName === undefined) {
          return blockSource
        } else {
          for (const subBlock of readBlocksWithNames(blockSource)) {
            if (subBlock.name === subBlockName)
            return blockSource.slice(...subBlock.contentRange)
          }
        }
      }
    }
  }

  getConfig() {
    const configBlock = this.getBlockContent('notebook.json')
    const defaultConfig = {bundleFiles: [], importFiles: [], dataFiles: []}
    if (configBlock) {
      try {
        return {...defaultConfig, ...JSON.parse(configBlock)}
      } catch (err) {
        return defaultConfig
      }
    } else {
      return defaultConfig
    }
  }

  read() {
    this.config = this.getConfig()
    const {importFiles, bundleFiles, dataFiles} = this.config
    const importNotebooks = [...importFiles, ...bundleFiles, ...dataFiles].map(a => a[0])
    const files = []
    const importFileData = importFiles.map(v => undefined)
    const bundleFileData = bundleFiles.map(v => undefined)
    const dataFileData = dataFiles.map(v => undefined)
    for (const block of readBlocksWithNames(this.src)) {
      if ((block.name || '').endsWith('.js') && block.name !== 'entry.js') {
        files.push({name: block.name, data: this.src.slice(...block.contentRange)})
      }
      if (importNotebooks.includes(block.name)) {
        const blockSource = this.src.slice(...block.contentRange)
        const parent = block.name.match(/(^.*)\.md$/)[1]
        const blockBundleFiles = bundleFiles.map(a => a[0] === block.name).map(a => a[1])
        const blockImportFiles = importFiles.map(a => a[0] === block.name).map(a => a[1])
        for (const subBlock of readBlocksWithNames(blockSource)) {
          const bundleIndex = bundleFiles.findIndex(
            a => a[0] === block.name && a[1] === subBlock.name
          )
          const importIndex = importFiles.findIndex(
            a => a[0] === block.name && a[1] === subBlock.name
          )
          const dataIndex = dataFiles.findIndex(
            a => a[0] === block.name && a[1] === subBlock.name
          )
          if (bundleIndex !== -1) {
            bundleFileData[bundleIndex] = {
              path: bundleFiles[bundleIndex],
              content: blockSource.slice(...subBlock.contentRange)}
          }
          if (importIndex !== -1) {
            importFileData[importIndex] = {
              name: `${parent}/${subBlock.name}`,
              data: blockSource.slice(...subBlock.contentRange)
            }
          }
          if (dataIndex !== -1) {
            dataFileData[dataIndex] = {
              name: `${parent}/${subBlock.name}`,
              data: blockSource.slice(...subBlock.contentRange)
            }
          }
        }
      }
    }
    this.bundles = bundleFileData.filter(v => v !== undefined)
    const depFiles = importFileData.filter(v => v !== undefined)
    this.files = [
      ...depFiles,
      ...files.filter(({name}) => name !== 'app.js'),
      ...files.filter(({name}) => name === 'app.js')
    ]
    this.dataFiles = dataFileData.filter(v => v !== undefined)
  }

  buildStyle(file) {
    const style = document.createElement('style')
    style.textContent = file.data
    return style.outerHTML
  }

  buildModule(name, data) {
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
      out + initAppend + append
    )
  }

  buildDataModule(name, data) {
    const path = JSON.stringify(name)
    const mref = `Macchiato.data[${path}]`
    const dataStr = JSON.stringify(data)
    return `${mref} = ${dataStr}`
  }

  buildReplace(filesMap) {
    if ('_replace.js' in filesMap) {
      const rSrc = filesMap['_replace.js']
      return new Function(
        rSrc.match(/\((\w+)\)/)[1],
        rSrc.slice(
          rSrc.indexOf('{') + 1,
          rSrc.lastIndexOf('}')
        )
      )
    } else {
      return ({data}) => data
    }
  }

  build() {
    const filesMap = Object.fromEntries(
      this.files.map(
        ({name, data}) => ([name, data])
      )
    )
    const replace = this.buildReplace(filesMap)
    const intro = this.buildModule(
      '_intro.js',
      replace({
        name: '_intro.js',
        data: (
          '_intro.js' in filesMap ? 
          filesMap['_intro.js'] :
          defaultIntro
        ),
        files: this.files,
      })
    )
    const modules = this.files.filter(({name}) => (
      name.endsWith('.js') && 
      !name.startsWith('_')
    )).map(file => (
      this.buildModule(
        file.name,
        replace({...file, files: this.files}),
      )
    ))
    const dataModules = this.dataFiles.map(file => (
      this.buildDataModule(file.name, file.data)
    ))
    const styles = this.files.filter(({name}) => (
      name.endsWith('.css')
    )).map(file => (
      this.buildStyle(file)
    ))
    this.styles = styles
    this.intro = intro
    this.scripts = [...dataModules, ...modules]
  }

  render(document) {
    const script = document.createElement('script')
    script.type = 'module'
    script.textContent = this.intro
    document.head.append(script)
    for (const bundle of this.bundles) {
      const scriptSrc = bundle.content
      const scriptEl = document.createElement('script')
      scriptEl.type = 'module'
      scriptEl.textContent = scriptSrc
      document.head.appendChild(scriptEl)
    }
    for (const styleText of this.styles) {
      const style = document.createElement('style')
      style.textContent = styleText
      document.head.append(style)
    }
    for (const scriptText of this.scripts) {
      const script = document.createElement('script')
      script.type = 'module'
      script.textContent = scriptText
      document.head.append(script)
    }
  }
}
```

## Entry

This sets the functions for reading code blocks from Markdown, and then reads the code block for the loader, and runs the loader, which in turn loads and runs the notebook with its dependencies.

TODO: set `readBlocks`, `readBlocksWithNames`, and `__source` on the global Macchiato object, and update all the references to it.

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
    if (block.name === 'loader.md') {
      const blockSrc = src.slice(...block.contentRange)
      for (const subBlock of readBlocksWithNames(blockSrc)) {
        if (subBlock.name === 'loader.js') {
          const subBlockSrc = blockSrc.slice(...subBlock.contentRange)
          const {Loader} = await import(`data:text/javascript;base64,${btoa(subBlockSrc)}`)
          const loader = new Loader(__source)
          loader.read()
          loader.build()
          loader.render(document)
        }
      }
    }
  }
}

run(__source)
```

## Tests

This runs tests inside the notebook, displaying the results in a table.

`TestView.js`

```js
import {Loader} from '/loader.js'
import {Builder} from '/builder.js'

export class TestView extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    const results = [
      'testClass',
      'testFunction',
      'testConst',
    ].map(name => {
      const el = document.createElement('td')
      try {
        const result = this[name].call(this)
        const frame = this.createFrame(result)
        const message = document.createElement('span')
        const listener = addEventListener('message', e => {
          if (e.source === frame.contentWindow) {
            message.innerText = e.data
            removeEventListener('message', listener)
            el.classList.add('pass')
          }
        })
        el.append(frame, message)
      } catch (e) {
        el.innerText = `Error: ${e}`
        el.classList.add('error')
      }
      const tr = document.createElement('tr')
      const nameEl = document.createElement('th')
      nameEl.innerText = name
      tr.append(nameEl, el)
      return tr
    })
    const table = document.createElement('table')
    table.append(...['thead', 'tbody'].map(tag => document.createElement(tag)))
    table.children[0].append(...['Test', 'Result'].map(s => {
      const el = document.createElement('th')
      el.innerText = s
      return el
    }))
    table.children[1].append(...results)
    this.shadowRoot.append(table)
  }

  createFrame(notebookSrc) {
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
    `.trim()
    const src = `
<!doctype html>
<html>
<head>
  <title>preview</title>
<script type="module">
${runEntry}
</script>
</head>
<body>
</body>
</html>
`.trim()
    const frame = document.createElement('iframe')
    frame.sandbox = 'allow-scripts'
    frame.src = `data:text/html;base64,${btoa(src.trim())}`
    frame.addEventListener('load', () => {
      const messageText = `\n\n${notebookSrc}\n\n`
      const messageData = new TextEncoder().encode(messageText)
      frame.contentWindow.postMessage(
        ['notebook', messageData],
        '*',
        [messageData.buffer]
      )
    }, {once: true})
    return frame
  }

  runTest(testSrc) {
    const [entrySrc, loaderSrc] = ['entry.js', 'loader.js'].map(filename => {
      const block = Array.from(readBlocksWithNames(__source)).find(({name}) => name === filename)
      return __source.slice(...block.contentRange)
    })
    const src = `# Run Test

${testSrc}

${'`loader.md`'}

${'````md'}
# Loader

${'`loader.js`'}

${'```js'}
${loaderSrc}
${'```'}

${'````'}

${'`entry.js`'}

${'```js'}
${entrySrc}
${'```'}

`
    return src
  }

  testClass() {
    return this.runTest(`
${'`TestClass.js`'}

${'```js'}
${`export`} class TestClass {
  sayHi() {
    return 'Hi!'
  }
}
${'```'}

${'`run.js`'}

${'```js'}
${`import`} {TestClass} from '/TestClass.js'

const test = new TestClass()
parent.postMessage(test.sayHi(), '*')
console.log('posted message')

${'```'}
`)
  }

  testFunction() {
    return this.runTest(
`${'`testFunction.js`'}

${'```js'}
${`export`} function testFunction() {
  return 'Hi!'
}
${'```'}

${'`run.js`'}

${'```js'}
${`import`} {testFunction} from '/testFunction.js'

parent.postMessage(testFunction(), '*')
console.log('posted message')

${'```'}`
    )
  }

  testConst() {
    
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        :host {
          color: white;
          height: 50px;
          background-color: yellow;
        }
        table {
          border-collapse: collapse;
        }
        td, th {
          border: 2px solid black;
          background-color: #555;
          padding: 5px;
        }
        .pass {
          background-color: green;
        }
        .error, .fail {
          background-color: red;
        }
        iframe {
          width: 18px;
          height: 18px;
          border: 1px solid black;
        }
      `)
    }
    return this._styles
  }
}
```

`app.js`

```js
import {TestView} from '/TestView.js'

customElements.define('test-view', TestView)

function setup() {
  const testView = document.createElement('test-view')
  document.body.append(testView)
}

setup()
```
