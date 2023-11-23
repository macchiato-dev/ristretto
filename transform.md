# Transform


`thumbnail.svg`

```svg
<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <style>
    svg {
      filter: sepia(.7);  // filters on more specific elemtns are not showing in Safari
    }
  </style>
  <g transform="scale(1.4)">
    <image href="${image('cat.png.md/cat.png')}" width="128" height="128" />
  </g>
</svg>
```
