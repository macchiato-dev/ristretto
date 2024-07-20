# Loader

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
          const bundleIndex = bundleFiles.findIndex(a => a[0] === block.name && a[1] === subBlock.name)
          const importIndex = importFiles.findIndex(a => a[0] === block.name && a[1] === subBlock.name)
          const dataIndex = dataFiles.findIndex(a => a[0] === block.name && a[1] === subBlock.name)
          if (bundleIndex !== -1) {
            bundleFileData[bundleIndex] = {path: bundleFiles[bundleIndex], content: blockSource.slice(...subBlock.contentRange)}
          }
          if (importIndex !== -1) {
            importFileData[importIndex] = {name: `${parent}/${subBlock.name}`, data: blockSource.slice(...subBlock.contentRange)}
          }
          if (dataIndex !== -1) {
            dataFileData[dataIndex] = {name: `${parent}/${subBlock.name}`, data: blockSource.slice(...subBlock.contentRange)}
          }
        }
      }
    }
    this.bundles = bundleFileData.filter(v => v !== undefined)
    const depFiles = importFileData.filter(v => v !== undefined)
    this.files = [...depFiles, ...files.filter(({name}) => name !== 'app.js'), ...files.filter(({name}) => name === 'app.js')]
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

`builder.js`

```js
export class Builder {
  constructor({src, parentSrc}) {
    this.src = src
    this.parentSrc = parentSrc
  }

  getConfig() {
    const defaultConfig = {bundleFiles: [], importFiles: [], dataFiles: []}
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
    const deps = [...config.bundleFiles, ...config.importFiles, ...config.dataFiles].map(a => a[0])
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
