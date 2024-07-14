# Markdown Code Blocks

This loads content from Markdown code blocks in a transparent manner. To facilitate this:

- All code blocks must be fenced.
- Code blocks are given names with an inline code block appearing above the fenced code block. This way, the names will be visible in rendered Markdown as well as in the source. They are not hidden in the info strings. There is nothing but inline code blocks in these lines. The first inline code block is the filename, and there can be certain other inline code blocks following this to indicate things such as whether it doesn't end in a newline (`-`) or is binary content as base64 (`b64`). They must have two line breaks between them and the fenced code, which amounts to one empty line.
- Anonymous code blocks are allowed and ignored, but the last non-whitespace character before them must not be a backquote.
- The name can be a JSON string, and if it begins with a `"` it will be parsed as a JSON string. All names that begin with a `"` will be parsed as a JSON string and if parsing fails there will be an error. These inline code blocks can use more than one backquote (needed if a backquote appears in a name - this attempts to be universal).
- The fenced code blocks must all start at the first character. If it finds any that don't, it will refuse to load the file.
- All fenced code blocks must terminate successfully.
- It must not contain `<summary>` or `<details>` outside of fenced code blocks. This is to prevent hiding code blocks in rendered Markdown.
- As mentioned above, there are additional inline code blocks that can be added after the filename:
  - Does not end in newline: `-` This only applies to regular blocks, not `b64` or `str`.
  - Is base64 encoded binary data, that should be converted to binary data: `b64` This can be spread over multiple lines and lines can have trailing whitespace.
  - Is a JSON string or an array of JSON strings: `str` This can be used to include an empty file. If it is an array of JSON strings they will be concatenated.
- Empty code blocks aren't allowed, because they aren't easy to find visually. To make an empty file, put empty quotes (`""`) on a single line in a fenced code block and put `str` after the filename.

Here is the implementation:

```js
function* readMarkdownCodeBlocks(input) {
  const re = /(?:^|\n)([ \t]*)(`{3,}|~{3,})([^\n]*\n)/
  // TODO: look for other ways to have them rendered hidden
  const disallowed = /    |<^\s*(?:summary|details)/i
  let index = 0
  while (index < input.length) {
    const open = input.substring(index).match(re)
    if (input.substring(index, open).match(disallowed)) {
      throw new Error('<details>, <summary>, and non-fenced code blocks are not allowed')
    }
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
    const nameLineMatch = input.slice(index, block.blockRange[0]).match(/(^|\n[^\n*]\n)([^\n]*`)(\s*)$/)
    if (nameLineMatch) {
      if (
        !nameLineMatch[1].match(/^\s*$/) ||
        nameLineMatch[3].split('').filter(s => s === '\n').length !== 2
      ) {
        throw new Error(
          'The line containing a name of a code block must have at least one empty ' +
          'line before it and exactly one empty line after it'
        )
      }
      let line = nameLineMatch[2]
      const modifierPattern = /\s* `(-|b64|str)`/
      let modifier
      const modifierMatch = line.match(modifierPattern)
      if (modifierMatch) {
        line = line.replace(modifierPattern, '')
        modifier = modifierMatch[1]
      }
      const quotes = `^(\`+)`.match(line)
      const nameMatch = line.match(new RegExp(`^${quotes}(.*)${quotes}$`))
      if (!nameMatch || line.matchAll(quotes) !== 2) {
        throw new Error('Invalid name line')
      }
      let name = match[1]
      if (name.slice(0, 1) === ' ' && name.slice(-1) == ' ' && name.length > 2) {
        name = name.slice(1, -1)
      }
      name = name.startsWith('"') ? JSON.parse(name) : name
      yield {
        name,
        blockRange: [blockRange[0] - match[0].length, blockRange[1]],
        contentRange,
        info: open[3].trim(),
        modifier
      }
    }
    index = blockRange.at(-1)
  }
  if (input.substring(index).match(disallowed)) {
    throw new Error('<details>, <summary>, and non-fenced code blocks are not allowed')
  }
}
```
