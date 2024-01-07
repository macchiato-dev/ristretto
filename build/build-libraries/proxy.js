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
    await e.respondWith(new Response(null, {
      status: 200,
      statusText: 'OK',
      headers: {Connection: 'Keep-Alive'},
    }))
  }
  const serverUrlInfo = new URL(serverUrl)
  try {
    const connectArgs = {hostname: serverUrlInfo.hostname, port: Number(serverUrlInfo.port)}
    const outConn = await Deno.connect(connectArgs)
    await conn.readable.pipeTo(outConn.writable)
    await outConn.readable.pipeTo(conn.writable)
  } catch (err) {
    console.error('Error creating connection', err)
  }
}

for await (const conn of Deno.listen({ port: 3000 })) {
  handleHttp(conn)
}