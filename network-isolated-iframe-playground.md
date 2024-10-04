# Network Isolated iframe Playground

This is an playground for an attempt at a network isolated sandboxed iframe that has the `allow-scripts` permission, that works offline.

Through a Content Security Policy, it can be made difficult to send anything to the network. Alas, there is the loophole of WebRTC ICE servers, which currently aren't covered by the Content-Security-Policy as implemented in the latest browsers. There is also prefetch and following links. The following links can be prevented by wrapping the sandboxed code in two iframes.

It accepts an HTML page that may contain `<script src="module">` elements that will be run, after prepending something to them that attempts to remove access to WebRTC, if that check is enabled.

It has a toggleable defense against the WebRTC globals.