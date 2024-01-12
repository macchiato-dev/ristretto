async function parentRequest(...data) {
  const channel = new MessageChannel()
  const result = await new Promise((resolve, _) => {
    channel.port1.onmessage = (message) => {
      channel.port1.close()
      resolve(message.data)
    }
    postMessage(data, [channel.port2])
  })
  if (result === false) {
    throw new Error(
      `Received false from parent request ${JSON.stringify(data[0])} in worker`
    )
  }
  return result
}

function eventToIterator(subscribe, unsubscribe) {
  const resolves = []
  const results = []
  subscribe(result => {
    if (resolves.length > 0) {
      (resolves.shift())(result)
    } else {
      results.push(result)
    }
  })
  return {
    [Symbol.asyncIterator]() {
      return {
        next() {
          if (results.length > 0) {
            return Promise.resolve(results.shift())
          } else {
            return new Promise((resolve, _) => {
              resolves.push(resolve)
            })
          }
        },
        return() {
          unsubscribe()
        }
      }
    }
  }
}

function parentRequestMulti(...data) {
  const channel = new MessageChannel()
  const iterator = eventToIterator(
    handler => { channel.port1.onmessage = ({data}) => handler(data) },
    () => channel.port1.close()
  )
  postMessage(data, [channel.port2])
  return iterator
}

function logOutput(output) {
  if (output.stdout.byteLength > 0) {
    console.log(new TextDecoder().decode(output.stdout))
  }
  if (output.stderr.byteLength > 0) {
    console.log(new TextDecoder().decode(output.stderr))
  }
}

const commands = {
  async install() {
    for await (const output of parentRequestMulti('install')) {
      logOutput(output)
    }
  },
}

async function build() {
  try {
    const [cmd, ...args] = await parentRequest('getArgs')
    if (cmd in commands) {
      await commands[cmd](...args)
    } else {
      console.error(
        ((cmd ?? undefined) === undefined) ?
        'missing command' :
        `invalid command: ${cmd}`
      )
    }
    close()
  } catch (err) {
    console.error(err)
    close()
  }
}

await build()