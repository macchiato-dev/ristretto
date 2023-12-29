Deno.serve({ port: 3000 }, async request => {
  const url = new URL(request.url)
  url.search = search
  const headers = new Headers(request.headers)
  headers.set('Host', url.hostname)
  return fetch(url, {
    method: request.method,
    headers,
    body: request.body,
    redirect: 'manual',
  })
})