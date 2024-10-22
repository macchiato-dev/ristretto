# Exfiltration-resistant iframe Playground

This is an attempt at an iframe with allow-scripts enabled that prevents data exfiltration.

Through a Content Security Policy, it can be made difficult to send anything to the network. Alas, there is the loophole of WebRTC ICE servers, which currently aren't covered by the Content-Security-Policy as implemented in the latest browsers. There is also prefetch, as well as the following of links. The following of links can be prevented by wrapping the sandboxed code in two iframes.

