# Loader

`loader.js`

```js
const defaultIntro = `

window.Macchiato = {
  modules: {},
}

`.trim()

export class Loader {
  constructor(files) {
    this.files = files
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
