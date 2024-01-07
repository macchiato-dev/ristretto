async function forward(readable, writable, {name}) {
  for await (const chunk of readable) {
    console.log(`Read ${chunk.byteLength} from ${name}`)
    const result = writable.write(chunk)
    console.log(`Write to ${name} returned ${result}`)
  }
  console.log(`${name} returned`)
}

async function handleHttp(conn) {
  conn.setKeepAlive(true)
  let serverUrl
  let promise
  const httpConn = Deno.serveHttp(conn)
  const e = await httpConn.nextRequest()
  console.log({headers: e.request.headers})
  if (e.request.method === 'CONNECT') {
    serverUrl = e.request.url
    console.log({serverUrl})
    // await e.respondWith(new Response(null, {
    //   status: 200,
    //   statusText: 'OK',
    //   headers: {Connection: 'Keep-Alive'},
    // }))
    console.log({writableLocked: conn.writable.locked})
    const writer = await conn.writable.getWriter()
    const result = await writer.write(new Uint8Array(new TextEncoder().encode('HTTP/1.1 200 Connection established\r\n\r\n')))
    console.log(`Result of writing Connection established: ${result}`)
    const serverUrlInfo = new URL(serverUrl)
    try {
      const connectArgs = {hostname: serverUrlInfo.hostname, port: Number(serverUrlInfo.port)}
      const outConn = await Deno.connect(connectArgs)
      await Promise.allSettled([forward(conn.readable, outConn.writable), forward(outConn.readable, conn.writable)])
    } catch (err) {
      console.error('Error creating connection', err)
    }
  }
}

for await (const conn of Deno.listen({ port: 3000 })) {
  handleHttp(conn)
}