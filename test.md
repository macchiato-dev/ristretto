# Test runner

This is for running tests, which can be reported using data display components, on a web page or on a CLI.

`test.js`

```js
class TestSuite {
  constructor() {
    this.tests = []
  }

  test(desc, fn) {
    this.tests.push({desc, fn})
  }

  async run() {
    for (const test of this.tests) {
      try {
        test.result = await test.fn()
      } catch (e) {
        test.error = e
      }
    }
  }
}
```
