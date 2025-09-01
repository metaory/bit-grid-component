# CDN Vanilla Example

<div align="center"><h3><a href="https://metaory.github.io/bit-grid-component/examples/cdn-vanilla/" target="_blank">Live Preview →</a></h3></div>

## Usage

```html
<div id="app">
  <bit-grid id="grid"></bit-grid>
</div>

<script type="module">
  import 'https://unpkg.com/bit-grid-component?module'
  const rows = ['Alice','Bob','Charlie','Diana','Eve','Frank']
  const cols = ['Bash','Go','JQ','JS','Lisp','Lua','Rust','Swift','Zig']
  const grid = document.getElementById('grid')
  grid.update({
    data: Array(rows.length).fill(0).map(() => Array(cols.length).fill(false)),
    rowLabels: rows,
    colLabels: cols
  })
 </script>
```

No build tooling required.


