# Loader

`loader.js`

```js
const defaultIntro = `

window.Macchiato = {
  modules: {},
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
    const defaultConfig = {importFiles: {}}
    if (configBlock) {
      try {
        return JSON.parse(configBlock)
      } catch (err) {
        return defaultConfig
      }
    } else {
      return defaultConfig
    }
  }

  read() {
    const config = this.getConfig()
    const importFiles = config.importFiles
    const importNotebooks = Object.keys(importFiles)
    const files = []
    for (const block of readBlocksWithNames(this.src)) {
      if (block.name && block.name.endsWith('.js') && !['entry.js', 'run.js', 'NotebookView.js'].includes(block.name)) {
        files.push({name: block.name, data: this.src.slice(...block.contentRange)})
      }
      if (importNotebooks.includes(block.name)) {
        const blockSource = this.src.slice(...block.contentRange)
        const parent = block.name.match(/(^.*)\.md$/)[1]
        for (const subBlock of readBlocksWithNames(blockSource)) {
          if (importFiles[block.name].includes(subBlock.name)) {
            files.push({name: `${parent}/${subBlock.name}`, data: blockSource.slice(...subBlock.contentRange)})
          }
        }
      }
    }
    this.files = [...files.filter(({name}) => name !== 'app.js'), ...files.filter(({name}) => name === 'app.js')]
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
      /^\s*export\s+(?:class|function|async\s+function|const)\s+(\S+)/gms,
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
        const path = JSON.stringify(
          importPath.slice(
            importPath.indexOf('/') + 1
          )
        )
        const ref = `Macchiato.modules[${path}]`
        return `const ${vars} = ${ref}`
      }
    )
    return (
      out + initAppend + append
    )
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
    const styles = this.files.filter(({name}) => (
      name.endsWith('.css')
    )).map(file => (
      this.buildStyle(file)
    ))
    this.styles = styles
    this.scripts = [intro, ...modules]
  }

  loadLibraries(document) {
    const codeMirrorSource = this.getBlockContent('codemirror-bundle.md', 'codemirror-bundle.js')
    const codeMirrorScript = document.createElement('script')
    codeMirrorScript.type = 'module'
    codeMirrorScript.textContent = codeMirrorSource
    document.head.appendChild(codeMirrorScript)
  }

  render(document) {
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
    if (block.name === 'loader.md') {
      const blockSrc = src.slice(...block.contentRange)
      for (const subBlock of readBlocksWithNames(blockSrc)) {
        if (subBlock.name === 'loader.js') {
          const subBlockSrc = blockSrc.slice(...subBlock.contentRange)
          const {Loader} = await import(`data:text/javascript;base64,${btoa(subBlockSrc)}`)
          const loader = new Loader(__source)
          loader.read()
          loader.build()
          // loader.loadLibraries(document)
          loader.render(document)
        }
      }
    }
  }
}

run(__source)
```