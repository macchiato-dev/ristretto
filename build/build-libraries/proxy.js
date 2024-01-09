async function forward(outConn, writer) {
  for await (const chunk of outConn.readable) {
    console.log(`read chunk of ${chunk.byteLength} bytes from outbound connection`)
    await writer.write(chunk)
  }
}

async function handleHttp(conn) {
  let pos = 0
  const arr = new Uint8Array(512)
  let outWriter
  for await (const chunk of conn.readable) {
    if (outWriter === undefined) {
      arr.set(chunk, pos)
      pos += chunk.byteLength
      console.log(`Received chunk of ${chunk.byteLength} bytes`)
      const decoded = new TextDecoder().decode(arr.slice(0, pos))
      console.log(`Decoded: ${decoded}`)
      const match = decoded.match(/\r?\n\r?\n/)
      if (match) {
        const messageEnd = match.index + match[0].length
        const message = decoded.slice(0, messageEnd)
        const remaining = arr.slice(new TextEncoder().encode(message).byteLength, pos)
        const proxyUrl = message.match(/CONNECT (\S+) HTTP/)[1].split(':')
        const connectArgs = {hostname: proxyUrl[0], port: Number(proxyUrl[1])}
        const outConn = await Deno.connect(connectArgs)
        outConn.setKeepAlive(true)
        const writer = await conn.writable.getWriter()
        await writer.write(new Uint8Array(new TextEncoder().encode('HTTP/1.1 200 Connection established\r\n\r\n')))
        outWriter = await outConn.writable.getWriter()
        // TODO: send remaining
        forward(outConn, writer)
      }
    } else {
      console.log(`read chunk of ${chunk.byteLength} bytes after sending response`)
      await outWriter.write(chunk)
    }
  }
}

for await (const conn of Deno.listen({ port: 3000 })) {
  handleHttp(conn)
}