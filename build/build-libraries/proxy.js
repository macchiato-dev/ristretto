async function forward(outConn, writer) {
  try {
    for await (const chunk of outConn.readable) {
      console.log(`read chunk of ${chunk.byteLength} bytes from outbound connection`)
      try {
        await writer.write(chunk)
      } catch (err) {
        console.error('Error writing to inbound connection')
      }
    }
  } catch (err) {
    console.error('Error forwarding from outbound to inbound connection')
  }
}

async function handleHttp(conn) {
  try {
    let pos = 0
    const arr = new Uint8Array(512)
    let outWriter
    // TODO: don't let reading of the stream be delayed by setting up the writer and network connection
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
          const hostname = proxyUrl[0]
          const port = Number(proxyUrl[1])
          const connectArgs = {hostname, port}
          const writer = await conn.writable.getWriter()
          await writer.write(new Uint8Array(new TextEncoder().encode('HTTP/1.1 200 Connection established\r\n\r\n')))
          console.log(`Connecting to hostname "${hostname}", port ${port}...`)
          const outConn = await Deno.connect(connectArgs)
          outWriter = await outConn.writable.getWriter()
          // TODO: send remaining
          forward(outConn, writer)
        }
      } else {
        console.log(`read chunk of ${chunk.byteLength} bytes after sending response`)
        try {
          await outWriter.write(chunk)
        } catch (err) {
          console.error('Error writing to outbound connection', err)
        }
      }
    }
  } catch (err) {
    console.error('error in HTTP handler')
  }
}

// see if a plain old request can be sent
for await (const conn of Deno.listen({ port: 3000 })) {
  handleHttp(conn)
}