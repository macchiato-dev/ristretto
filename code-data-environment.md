# Code & Data Environment

This is a code & data environment where you can upload your data and run code on it in a controlled manner. The code is easily auditable, sandboxed, or a mix of the two.

When you first load it, there isn't much code running outside of the sandbox. There is some code running in WebAssembly and rendering into an iFrame with a strict Content-Security-Policy and only a small amount of JavaScript allowed on the page. There is a link to inspect it and install it. After that, you can inspect and install the plugins.

The code running outside the WebAssembly sandbox before plugins are loaded is designed to either be easily inspectable or to be a particular version of a well-known library. For instance, there is highlight.js and the CodeMirror editor.

The plugins vary in their approach to auditing and sandboxing.