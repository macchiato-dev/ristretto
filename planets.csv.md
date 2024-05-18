# Planets

## The data

`planets.csv`

```csv
Planet,Mean distance from the Sun,Equatorial radius,Surface area,Volume,Mass
Mercury,"57,909,175","2,440.53","75,000,000",6.083×10^10,3.302×10^23
Venus,"108,208,930","6,051.8","460,000,000",9.28×10^11,4.8690×10^24
Earth,"149,597,890","6,378.1366","510,000,000",1.083×10^12,5.972×10^24
Mars,"227,936,640","3,396.19","140,000,000",1.6318×10^11,6.4191×10^23
Jupiter,"778,412,010","71,492","64,000,000,000",1.431×10^15,1.8987×10^27
Saturn,"1,426,725,400","60,268","44,000,000,000",8.27×10^14,5.6851×10^26
Uranus,"2,870,972,200","25,559","8,100,000,000",6.834×10^13,8.6849×10^25
Neptune,"4,498,252,900","24,764","7,700,000,000",6.254×10^13,1.0244×10^26
```

Source: Wikipedia. License: [Creative Commons Attribution-ShareAlike License 4.0](https://en.wikipedia.org/wiki/Wikipedia:Text_of_the_Creative_Commons_Attribution-ShareAlike_4.0_International_License)

## Extracting the data

Go to [List of gravitationally rounded objects of the Solar System
](https://en.wikipedia.org/wiki/List_of_gravitationally_rounded_objects_of_the_Solar_System) on Wikipedia and run this in the console:

```js
const heading = [...document.querySelectorAll('h2')].find(el => el.innerText.match(/Planets\s*\[/))
const elementsAfterHeading = [...heading.parentNode.children].slice([...heading.parentNode.children].indexOf(heading) + 1)
const elements = elementsAfterHeading.slice(0, elementsAfterHeading.findIndex(e => e.tagName.toLowerCase() === 'h2'))
const tables = elements.map(el => ([...(el.tagName.toLowerCase() === 'table' ? [el]: []), ...el.querySelectorAll('table')])).flat()
const table = tables.toSorted((a, b) => (a.querySelectorAll('tr').length - b.querySelectorAll('tr').length)).at(-1)
const rows = [...table.querySelectorAll('tr')]
const header = rows.toSorted((a, b) => (a.querySelectorAll('th').length - b.querySelectorAll('th').length)).at(-1)
function cols(row) {
  return [...row.children].map(el => {
    const colspan = el.getAttribute('colspan') ? Number(el.getAttribute('colspan')) : 0
    const arr = Array(colspan).fill(undefined)
    arr[0] = el
    return arr
  }).flat()
}
const headerCols = cols(header)
const fieldRows = ['distance', 'radius', 'area', 'volume', 'mass'].map(name => (
    cols(rows.find(row => [...row.children].slice(0, 3).some(col => col.innerText.toLowerCase().includes(name))))
))
const headerFields = (
  headerCols
  .map((el, i) => ([el, i]))
  .filter(el => el[0])
  .map(([el, i]) => ([el.innerText.match(/\w+/), i]))
  .filter(v => v[0])
  .map(([match, i]) => ([match[0], i]))
)
const data = [
  ['Planet', ...fieldRows.map(row => row[0].innerText.replaceAll(/\s+/g, ' '))],
  ...headerFields.map(([name, i]) => ([
    name,
    ...fieldRows.map(row => row[i].innerText.split('\n')[0].replace('×10', '×10^'))
  ])),
]
data.map(row => row.map(cell => cell.match(/[,"]/) ? `"${cell.replaceAll('"', '""')}"` : cell).join(',')).join('\r\n')
```

`thumbnail.svg`

```svg
<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" fill="#111">
  <style>
    svg {
      background-color: #000;
    }
    .color1 {
      fill: #78c;
    }
    .color2 {
      fill: #aaa;
    }
  </style>
  <g transform="translate(10, 20)">
    <rect x="20" y="20" width="60" height="20" class="color1" />
    <rect x="90" y="20" width="60" height="20" class="color1" />
    <rect x="160" y="20" width="60" height="20" class="color1" />
  </g>
  <g transform="translate(10, 50)">
    <rect x="20" y="20" width="60" height="20" class="color2" />
    <rect x="90" y="20" width="60" height="20" class="color2" />
    <rect x="160" y="20" width="60" height="20" class="color2" />
  </g>
  <g transform="translate(10, 80)">
    <rect x="20" y="20" width="60" height="20" class="color2" />
    <rect x="90" y="20" width="60" height="20" class="color2" />
    <rect x="160" y="20" width="60" height="20" class="color2" />
  </g>
  <g transform="translate(10, 110)">
    <rect x="20" y="20" width="60" height="20" class="color2" />
    <rect x="90" y="20" width="60" height="20" class="color2" />
    <rect x="160" y="20" width="60" height="20" class="color2" />
  </g>
  <g transform="translate(10, 140)">
    <rect x="20" y="20" width="60" height="20" class="color2" />
    <rect x="90" y="20" width="60" height="20" class="color2" />
    <rect x="160" y="20" width="60" height="20" class="color2" />
  </g>
  <g transform="translate(10, 170)">
    <rect x="20" y="20" width="60" height="20" class="color2" />
    <rect x="90" y="20" width="60" height="20" class="color2" />
    <rect x="160" y="20" width="60" height="20" class="color2" />
  </g>
</svg>
```
