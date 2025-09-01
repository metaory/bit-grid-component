# Vanilla Example

<div align="center"><h3><a href="https://metaory.github.io/bit-grid-component/examples/vite-vanilla/" target="_blank">Live Preview →</a></h3></div>

## Setup

```bash
npm install
npm run dev
```

## Vite config

```js
export default {
  base: '/bit-grid-component/examples/vite-vanilla/',
  build: { target: 'esnext' }
}
```

## Usage

```html
<div id="app"></div>
<script type="module">
  import 'bit-grid-component'
  const rows = ['Alice','Bob','Charlie','Diana','Eve','Frank']
  const cols = ['Bash','Go','JQ','JS','Lisp','Lua','Rust','Swift','Zig']
  const grid = document.createElement('bit-grid')
  document.getElementById('app').appendChild(grid)
  grid.update({
    data: Array(rows.length).fill(0).map(() => Array(cols.length).fill(false)),
    rowLabels: rows,
    colLabels: cols
  })
</script>
```
