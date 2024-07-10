export class AccessView extends HTMLElement {
  closeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
    <path fill="currentColor" d="m12 13.4l-2.9 2.9q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7l2.9-2.9l-2.9-2.875q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l2.9 2.9l2.875-2.9q.275-.275.7-.275t.7.275q.3.3.3.713t-.3.687L13.375 12l2.9 2.9q.275.275.275.7t-.275.7q-.3.3-.712.3t-.688-.3z"/>
  </svg>`

  warnings = {
    download: (
      'This download dialog was triggered from inside the Ristretto sandbox. ' +
      'The sandbox protects content from leaving the sandbox, even with untrusted code, but ' +
      'downloading, along with copying to the clipboard and following links, is a way content ' +
      'can leave the sandbox. Be careful when downloading, opening, and sending files.'
    ),
    upload: (
      'This upload dialog was triggered from inside the Ristretto sandbox. ' +      
      'The sandbox protects content from leaving the sandbox without user action, ' +
      'but if you later download, copy to the clipboard, or follow a link, ' +
      'the data could leave the sandbox. Be careful when uploading private data ' +
      'and later downloading it, that you trust the code or have reviewed the ' +
      'downloaded data. Unlike downloads or following links, file inputs can ' +
      'work inside the Ristretto sandbox, so untrusted code could create a dialog ' +
      'that looks just like this one. To check that this dialog is running outside the sandbox, ' +
      'try following the link at the end. If it is inside the sandbox it will not open ' +
      'directly. '
    ),
    link: (
      'This link dialog was triggered from inside the Ristretto sandbox. ' +
      'The sandbox protects content from leaving the sandbox, even with untrusted code, but ' +
      'following links, along with downloading and copying to the clipboard, is a way content ' +
      'can leave the sandbox. Be careful when downloading, opening, and sending files.'
    ),
  }

  connectedCallback() {
    this.attachShadow({mode: 'open'})
    this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]
    const sheets = [...document.adoptedStyleSheets].filter(v => v !== this.constructor.globalStyles)
    document.adoptedStyleSheets = [...sheets, this.constructor.globalStyles]
    this.dialogEl = document.createElement('dialog')
    this.dialogEl.addEventListener('click', e => {
      const rect = this.dialogEl.getBoundingClientRect()
      const clickedInside = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      )
      if (e.target === this.dialogEl && !clickedInside) {
        this.close()
      }
    })
    const header = document.createElement('div')
    header.classList.add('header')
    this.heading = document.createElement('h1')
    const closeButton = document.createElement('button')
    closeButton.innerHTML = this.closeIcon
    closeButton.addEventListener('click', () => {
      this.close()
    })
    header.append(this.heading, closeButton)
    this.content = document.createElement('div')
    this.content.classList.add('content')
    this.footer = document.createElement('div')
    this.footer.classList.add('footer')
    this.dialogEl.append(header, this.content, this.footer)
    this.shadowRoot.append(this.dialogEl)
  }

  show() {
    this.dialogEl.classList.add('opened')
    this.dialogEl.showModal()
  }

  close() {
    this.dialogEl.classList.remove('opened')
    this.dialogEl.classList.add('closing')
    setTimeout(() => {
      this.dialogEl.close()
      this.dialogEl.classList.remove('closing')
      for (const url of this.urls ?? []) {
        URL.revokeObjectURL(url)
      }
    }, 350)
  }

  get open() {
    return this.dialogEl.open
  }

  download(name, blob) {
    if (this.open) {
      return
    }
    const files = [{name, blob}].map(({name, blob}) => {
      const url = URL.createObjectURL(blob)
      return {name, url}
    })
    this.urls = files.map(({url}) => url)
    this.heading.innerText = 'Download'
    this.footer.innerText = this.warnings.download
    const fileDivs = files.map(({name, url}) => {
      const div = document.createElement('div')
      div.classList.add('download-file')
      const nameEl = document.createElement('input')
      nameEl.type = 'text'
      nameEl.value = name
      const a = document.createElement('a')
      a.innerText = 'Download'
      a.href = url
      a.download = name
      nameEl.addEventListener('input', () => {
        a.download = nameEl.value
      })
      const sizeEl = document.createElement('div')
      sizeEl.innerText = `${blob.size} bytes`
      sizeEl.classList.add('size')
      div.append(nameEl, a, sizeEl)
      return div
    })
    this.content.replaceChildren(...fileDivs)
    this.show()
  }

  upload() {
    if (this.open) {
      return
    }
    this.heading.innerText = 'Upload'
    this.footer.innerText = this.warnings.upload
    const testLink = document.createElement('a')
    testLink.href = 'https://en.wikipedia.org/'
    testLink.target = '_blank'
    testLink.innerText = 'Test link to Wikipedia'
    this.footer.append(testLink)
    this.uploadFileList = document.createElement('div')
    this.uploadFileList.classList.add('upload-file-list')
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.multiple = true
    fileInput.addEventListener('change', e => {
      this.appendUploadFiles([...e.target.files])
      e.target.value = null
    })
    this.content.replaceChildren(fileInput, this.uploadFileList)
    this.show()
  }

  appendUploadFiles(uploadFiles) {
    const fileDivs = uploadFiles.map(({name, url}) => {
      const div = document.createElement('div')
      div.classList.add('upload-file')
      const nameEl = document.createElement('input')
      nameEl.type = 'text'
      nameEl.value = name
      const a = document.createElement('a')
      a.innerText = 'Download'
      a.href = url
      a.download = name
      nameEl.addEventListener('input', () => {
        a.download = nameEl.value
      })
      div.append(nameEl)
      return div
    })
    this.uploadFileList.append(...fileDivs)
  }

  link(url) {
    if (this.open) {
      return
    }
    this.heading.innerText = 'Link'
    const links = [url].map(url => {
      const a = document.createElement('a')
      a.href = url
      a.innerText = a
      a.target = '_blank'
      return a
    })
    this.content.replaceChildren(...links)
    this.show()
  }

  static get styles() {
    if (!this._styles) {
      this._styles = new CSSStyleSheet()
      this._styles.replaceSync(`
        dialog {
          margin-top: 20px;
          margin-right: 20px;
          min-width: 300px;
          max-width: 400px;
          border: 2px solid rgba(50, 50, 50);
          border-radius: 6px;
          font-family: sans-serif;
          background: rgb(206 212 220);
        }
        dialog::backdrop {
          opacity: 0;
          transition: opacity 0.3s ease-in;
          background-color: rgba(127, 127, 127, .20);
        }
        dialog.opened::backdrop {
          opacity: 1;
        }
        dialog.closing {
          visibility: hidden;
        }
        dialog.closing::backdrop {
          visibility: visible;
        }
        .header {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
        }
        .header h1 {
          padding: 0;
          margin: 0;
          flex-grow: 1;
          font-size: 24px;
        }
        .header button {
          all: unset;
          cursor: pointer;
        }
        .content, .footer {
          margin-top: 10px;
        }
        .download-file {
          display: flex;
          flex-direction: row;
          gap: 10px;
          align-items: center;
        }
        input[type=text] {
          flex-grow: 1;
          outline: none;
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(0, 0, 0, 0.4);
          padding: 5px;
          border-radius: 4px;
          font-size: 16px;
        }
        .download-file .size {
          font-size: 12px;
          min-width: 80px;
          text-align: right;
          padding-right: 10px;
        }
        .upload-file-list {
          padding-top: 10px;
        }
        .upload-file {
          display: flex;
          flex-direction: row;
          gap: 10px;
          align-items: center;
        }
        .footer {
          padding-right: 10px;
          font-size: 14px;
          margin-top: 20px;
          margin-bottom: 5px;
        }
      `)
    }
    return this._styles
  }

  static get globalStyles() {
    if (!this._globalStyles) {
      this._globalStyles = new CSSStyleSheet()
      this._globalStyles.replaceSync(``)
    }
    return this._globalStyles
  }
}