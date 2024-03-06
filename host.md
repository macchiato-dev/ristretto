# Host

This is the host for Ristretto. It facilitates uploading data, downloading data, and following links in a controlled manner.

It uses web components that are developed in another notebook. They are inlined here so they can easily be inspected.

## Requests

Requests are sent through postMessage with a MessageChannel.

## Modal Dialog

This shows a modal dialog with a backdrop, that can be called from inside the container. This dialog contains

## Uploading

The uploading dialog has a draggable and clickable upload area, and an upload button. When the upload button is clicked, the data is submitted by a post message to the requests.