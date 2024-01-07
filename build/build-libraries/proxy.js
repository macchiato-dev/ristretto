async function readMessage(conn) {
  let pos = 0
  const arr = new Uint8Array(512)
  let remaining
  for await (const chunk of conn.readable) {
    arr.set(chunk, pos)
    pos += chunk.byteLength
    console.log(`Received chunk of ${chunk.byteLength} bytes`)
    const decoded = new TextDecoder().decode(arr.slice(0, pos))
    console.log(`Decoded: ${decoded}`)
    const match = decoded.match(/\r?\n\r?\n/)
    if (match) {
      const messageEnd = match.index + match[0].length
      remaining = arr.slice(messageEnd, pos)
      break
    }
  }
  return remaining
}

async function handleHttp(conn) {
  const remaining = await readMessage(conn)
  const writer = await conn.writable.getWriter()
  await writer.write(new Uint8Array(new TextEncoder().encode('HTTP/1.1 200 Connection established\r\n\r\n')))
  for await (const chunk of conn.readable) {
    console.log(`read chunk of ${chunk.byteLength} bytes after sending response`)
  }
  console.log('done reading')
}

for await (const conn of Deno.listen({ port: 3000 })) {
  handleHttp(conn)
}