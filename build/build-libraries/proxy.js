async function handleHttp(conn) {
  let pos = 0
  const arr = new Uint8Array(512)
  let remaining
  let message
  for await (const chunk of conn.readable) {
    if (message === undefined) {
      arr.set(chunk, pos)
      pos += chunk.byteLength
      console.log(`Received chunk of ${chunk.byteLength} bytes`)
      const decoded = new TextDecoder().decode(arr.slice(0, pos))
      console.log(`Decoded: ${decoded}`)
      const match = decoded.match(/\r?\n\r?\n/)
      if (match) {
        const messageEnd = match.index + match[0].length
        message = decoded.slice(0, messageEnd)
        remaining = arr.slice(new TextEncoder().encode(message).byteLength, pos)
        const writer = await conn.writable.getWriter()
        await writer.write(new Uint8Array(new TextEncoder().encode('HTTP/1.1 200 Connection established\r\n\r\n')))
      }
    } else {
      console.log(`read chunk of ${chunk.byteLength} bytes after sending response`)
    }
  }
}

for await (const conn of Deno.listen({ port: 3000 })) {
  handleHttp(conn)
}