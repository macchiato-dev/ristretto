# Transform

`TransformView.js`

```js
export default class TransformView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({mode: 'open'})
    this.imageEl = document.createElement('img')
    this.imageEl.src = this.dataUrl
    this.imageEl.load = e => {
      this.showImage()
      this.buildHistogram()
    }
    this.canvasEl = document.createElement('canvas')
    this.canvasEl.setAttribute('height', '256')
    this.canvasEl.setAttribute('width', '256')
    this.graphEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    this.graphEl.setAttribute('viewBox', '0 0 256 256')
    this.graphEl.setAttribute('fill', 'currentColor')
    this.shadowRoot.append(this.imageEl, this.canvasEl, this.graphEl)
  }

  connectedCallback() {
    const globalStyle = document.createElement('style')
    globalStyle.textContent = `
      body {
        margin: 0;
        padding: 0;
      }
    `
    document.head.append(globalStyle)
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: flex;
        height: 100vh;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 10px;
      }
      img {
        display: none;
      }
      img, canvas, svg {
        height: 256px;
        width: 256px;
      }
      svg {
        min-height: 256px;
        min-width: 256px;
        background: #ccc;
      }
    `
    this.shadowRoot.append(style)
    this.showImage()
    this.buildHistogram()
  }

  get dataUrl() {
    for (const block of readBlocksWithNames(__source)) {
      if (block.name === 'image.png') {
        const data = __source.slice(...block.contentRange)
        return `data:image/png;base64,${data}`
      }
    }
  }

  showImage() {
    const ctx = this.canvasEl.getContext('2d')
    ctx.drawImage(this.imageEl, 0, 0, 256, 256, 0, 0, 256, 256)
  }

  buildHistogram() {
    const ctx = this.canvasEl.getContext('2d')
    const pixels = ctx.getImageData(0, 0, this.canvasEl.width, this.canvasEl.height).data
    const counts = Array(256).fill(0)
    for (let i=0; i < pixels.length; i += 4) {
      counts[Math.floor((pixels[i] + pixels[i + 1] + pixels[i + 3]) / 3)] += 1
    }
    const maxCount = Math.max(...counts)
    for (let i=0; i < 256; i++) {
      const height = Math.round(256 * (counts[i] / maxCount))
      if (height > 0) {
        const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        bar.setAttribute('x', i)
        bar.setAttribute('y', 256 - height)
        bar.setAttribute('width', 1)
        bar.setAttribute('height', height)
        this.graphEl.appendChild(bar)
      }
    }
  }
}

customElements.define('transform-view', TransformView)
```

`run.js`

```js
async function setup() {
  const transformView = document.createElement('transform-view')
  document.body.replaceChildren(transformView)
}

await setup()
```

`thumbnail.svg`

```svg
<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" fill="#222"><rect x="85" y="230" width="1" height="26"></rect><rect x="86" y="253" width="1" height="3"></rect><rect x="87" y="253" width="1" height="3"></rect><rect x="88" y="251" width="1" height="5"></rect><rect x="89" y="249" width="1" height="7"></rect><rect x="90" y="251" width="1" height="5"></rect><rect x="91" y="245" width="1" height="11"></rect><rect x="92" y="251" width="1" height="5"></rect><rect x="93" y="244" width="1" height="12"></rect><rect x="94" y="243" width="1" height="13"></rect><rect x="95" y="240" width="1" height="16"></rect><rect x="96" y="240" width="1" height="16"></rect><rect x="97" y="234" width="1" height="22"></rect><rect x="98" y="231" width="1" height="25"></rect><rect x="99" y="230" width="1" height="26"></rect><rect x="100" y="230" width="1" height="26"></rect><rect x="101" y="224" width="1" height="32"></rect><rect x="102" y="217" width="1" height="39"></rect><rect x="103" y="208" width="1" height="48"></rect><rect x="104" y="206" width="1" height="50"></rect><rect x="105" y="196" width="1" height="60"></rect><rect x="106" y="196" width="1" height="60"></rect><rect x="107" y="185" width="1" height="71"></rect><rect x="108" y="182" width="1" height="74"></rect><rect x="109" y="159" width="1" height="97"></rect><rect x="110" y="165" width="1" height="91"></rect><rect x="111" y="153" width="1" height="103"></rect><rect x="112" y="159" width="1" height="97"></rect><rect x="113" y="131" width="1" height="125"></rect><rect x="114" y="136" width="1" height="120"></rect><rect x="115" y="115" width="1" height="141"></rect><rect x="116" y="143" width="1" height="113"></rect><rect x="117" y="106" width="1" height="150"></rect><rect x="118" y="116" width="1" height="140"></rect><rect x="119" y="103" width="1" height="153"></rect><rect x="120" y="102" width="1" height="154"></rect><rect x="121" y="88" width="1" height="168"></rect><rect x="122" y="91" width="1" height="165"></rect><rect x="123" y="72" width="1" height="184"></rect><rect x="124" y="73" width="1" height="183"></rect><rect x="125" y="57" width="1" height="199"></rect><rect x="126" y="58" width="1" height="198"></rect><rect x="127" y="28" width="1" height="228"></rect><rect x="128" y="4" width="1" height="252"></rect><rect x="129" y="0" width="1" height="256"></rect><rect x="130" y="11" width="1" height="245"></rect><rect x="131" y="38" width="1" height="218"></rect><rect x="132" y="33" width="1" height="223"></rect><rect x="133" y="45" width="1" height="211"></rect><rect x="134" y="24" width="1" height="232"></rect><rect x="135" y="44" width="1" height="212"></rect><rect x="136" y="27" width="1" height="229"></rect><rect x="137" y="40" width="1" height="216"></rect><rect x="138" y="26" width="1" height="230"></rect><rect x="139" y="45" width="1" height="211"></rect><rect x="140" y="19" width="1" height="237"></rect><rect x="141" y="35" width="1" height="221"></rect><rect x="142" y="23" width="1" height="233"></rect><rect x="143" y="35" width="1" height="221"></rect><rect x="144" y="30" width="1" height="226"></rect><rect x="145" y="33" width="1" height="223"></rect><rect x="146" y="15" width="1" height="241"></rect><rect x="147" y="35" width="1" height="221"></rect><rect x="148" y="41" width="1" height="215"></rect><rect x="149" y="33" width="1" height="223"></rect><rect x="150" y="13" width="1" height="243"></rect><rect x="151" y="46" width="1" height="210"></rect><rect x="152" y="39" width="1" height="217"></rect><rect x="153" y="58" width="1" height="198"></rect><rect x="154" y="24" width="1" height="232"></rect><rect x="155" y="52" width="1" height="204"></rect><rect x="156" y="40" width="1" height="216"></rect><rect x="157" y="49" width="1" height="207"></rect><rect x="158" y="28" width="1" height="228"></rect><rect x="159" y="60" width="1" height="196"></rect><rect x="160" y="35" width="1" height="221"></rect><rect x="161" y="40" width="1" height="216"></rect><rect x="162" y="50" width="1" height="206"></rect><rect x="163" y="67" width="1" height="189"></rect><rect x="164" y="53" width="1" height="203"></rect><rect x="165" y="63" width="1" height="193"></rect><rect x="166" y="63" width="1" height="193"></rect><rect x="167" y="64" width="1" height="192"></rect><rect x="168" y="47" width="1" height="209"></rect><rect x="169" y="54" width="1" height="202"></rect><rect x="170" y="51" width="1" height="205"></rect><rect x="171" y="61" width="1" height="195"></rect><rect x="172" y="76" width="1" height="180"></rect><rect x="173" y="67" width="1" height="189"></rect><rect x="174" y="75" width="1" height="181"></rect><rect x="175" y="72" width="1" height="184"></rect><rect x="176" y="80" width="1" height="176"></rect><rect x="177" y="74" width="1" height="182"></rect><rect x="178" y="78" width="1" height="178"></rect><rect x="179" y="90" width="1" height="166"></rect><rect x="180" y="86" width="1" height="170"></rect><rect x="181" y="96" width="1" height="160"></rect><rect x="182" y="106" width="1" height="150"></rect><rect x="183" y="86" width="1" height="170"></rect><rect x="184" y="108" width="1" height="148"></rect><rect x="185" y="100" width="1" height="156"></rect><rect x="186" y="93" width="1" height="163"></rect><rect x="187" y="105" width="1" height="151"></rect><rect x="188" y="104" width="1" height="152"></rect><rect x="189" y="112" width="1" height="144"></rect><rect x="190" y="124" width="1" height="132"></rect><rect x="191" y="121" width="1" height="135"></rect><rect x="192" y="123" width="1" height="133"></rect><rect x="193" y="132" width="1" height="124"></rect><rect x="194" y="132" width="1" height="124"></rect><rect x="195" y="145" width="1" height="111"></rect><rect x="196" y="148" width="1" height="108"></rect><rect x="197" y="155" width="1" height="101"></rect><rect x="198" y="150" width="1" height="106"></rect><rect x="199" y="153" width="1" height="103"></rect><rect x="200" y="156" width="1" height="100"></rect><rect x="201" y="158" width="1" height="98"></rect><rect x="202" y="159" width="1" height="97"></rect><rect x="203" y="170" width="1" height="86"></rect><rect x="204" y="161" width="1" height="95"></rect><rect x="205" y="173" width="1" height="83"></rect><rect x="206" y="172" width="1" height="84"></rect><rect x="207" y="187" width="1" height="69"></rect><rect x="208" y="184" width="1" height="72"></rect><rect x="209" y="189" width="1" height="67"></rect><rect x="210" y="187" width="1" height="69"></rect><rect x="211" y="196" width="1" height="60"></rect><rect x="212" y="200" width="1" height="56"></rect><rect x="213" y="202" width="1" height="54"></rect><rect x="214" y="202" width="1" height="54"></rect><rect x="215" y="206" width="1" height="50"></rect><rect x="216" y="205" width="1" height="51"></rect><rect x="217" y="210" width="1" height="46"></rect><rect x="218" y="213" width="1" height="43"></rect><rect x="219" y="213" width="1" height="43"></rect><rect x="220" y="221" width="1" height="35"></rect><rect x="221" y="219" width="1" height="37"></rect><rect x="222" y="222" width="1" height="34"></rect><rect x="223" y="222" width="1" height="34"></rect><rect x="224" y="225" width="1" height="31"></rect><rect x="225" y="226" width="1" height="30"></rect><rect x="226" y="233" width="1" height="23"></rect><rect x="227" y="233" width="1" height="23"></rect><rect x="228" y="231" width="1" height="25"></rect><rect x="229" y="232" width="1" height="24"></rect><rect x="230" y="235" width="1" height="21"></rect><rect x="231" y="234" width="1" height="22"></rect><rect x="232" y="240" width="1" height="16"></rect><rect x="233" y="240" width="1" height="16"></rect><rect x="234" y="244" width="1" height="12"></rect><rect x="235" y="244" width="1" height="12"></rect><rect x="236" y="248" width="1" height="8"></rect><rect x="237" y="246" width="1" height="10"></rect><rect x="238" y="249" width="1" height="7"></rect><rect x="239" y="249" width="1" height="7"></rect><rect x="240" y="248" width="1" height="8"></rect><rect x="241" y="253" width="1" height="3"></rect><rect x="242" y="253" width="1" height="3"></rect><rect x="243" y="252" width="1" height="4"></rect><rect x="244" y="253" width="1" height="3"></rect><rect x="245" y="251" width="1" height="5"></rect><rect x="246" y="254" width="1" height="2"></rect><rect x="247" y="255" width="1" height="1"></rect><rect x="249" y="255" width="1" height="1"></rect><rect x="250" y="255" width="1" height="1"></rect><rect x="251" y="255" width="1" height="1"></rect></svg>
```
