# Storage

This sets up storage for the modifications and writes them to backends, such as memory, SessionStorage, LocalStorage, and an API.

It also allows viewing and reverting of changes, as well as duplicating.

It can also update a Markdown file. The data is ordered.

`storage.js`

```js
export class Storage {
  constructor() {
    this.data = {}
  }

  get(path) {
  }

  set(path, value, at=undefined, before=false) {
  }
}
```
