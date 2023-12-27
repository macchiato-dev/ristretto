Deno.serve({ port: 3000 }, async request => {
  const { pathname, search } = new URL(request.url)
  const host = request.headers.get('Host')
  const url = new URL(`./${pathname}`, `https://${host}`)
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