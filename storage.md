# Storage

This sets up storage for the modifications and writes them to backends, such as memory, SessionStorage, LocalStorage, and an API.

It also allows viewing and reverting of changes, as well as duplicating.

It can also update a Markdown file. The data is ordered, so that if a file is inserted within a list of files, it will be inserted at the location in the Markdown file.

`storage.js`

```js
export class Storage {
  constructor(source) {
    this.source = source
    this.data = {}
    this.keys = undefined
    this.deleted = {}
  }

  get(key) {
    if (path in data) {
      return this.data[path]
    }
    for (const block of Storage.readBlocksWithNames(this.source)) {
      if (block.name === key) {
        return {data: this.source.slice(...block.contentRange), info: block.info}
      }
    }
  }

  set(key, value, at=undefined, before=false) {
    if (at !== undefined) {
      if (this.keys === undefined) {
        this.keys = this.readKeys()
        for (const key of Object.keys(this.data)) {
          if (!this.keys.includes(key)) {
            this.keys.push(key)
          }
        }
      }
      const index = this.keys.index(at)
      if (at === -1) {
        this.keys.push(key)
      } else {
        this.keys.splice(before ? index : (index + 1), 0, key)
      }
    }
    this.data[key] = value
    delete this.deleted[key]
  }

  delete(key) {
    this.deleted[key] = true
  }

  get updatedSource() {
    return this.source  // TODO: update
  }

  readKeys() {
    const keys = []
    for (const block of Storage.readBlocksWithNames(this.source)) {
      if (block.name) {
        result.push(block.name)
      }
    }
    return keys
  }

  static *readBlocks(input) {
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

  static *readBlocksWithNames(input) {
    for (const block of readBlocks(input)) {
      const match = input.slice(0, block.blockRange[0]).match(
        new RegExp('(?<=\\n\\r?[ \\t]*\\n\\r?)`([^`]+)`\\s*\\n\\s*$')
      )
      yield ({...block, ...(match ? {name: match[1], blockRange: [block.blockRange[0] - match[0].length, block.blockRange[1]]} : undefined)})
    }
  }
}
```
