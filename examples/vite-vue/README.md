# Vue Example

<div align="center"><h3><a href="https://metaory.github.io/bit-grid-component/examples/vite-vue/" target="_blank">Live Preview →</a></h3></div>

## Setup

```bash
npm install
npm run dev
```

## Vite config

```js
export default {
  base: '/bit-grid-component/examples/vite-vue/',
  build: { target: 'esnext' }
}
```

## Usage

```vue
<script setup>
import { onMounted, ref } from 'vue'

const grid = ref(null)

onMounted(() => {
  const rows = ['Alice','Bob','Charlie','Diana','Eve','Frank']
  const cols = ['Bash','Go','JQ','JS','Lisp','Lua','Rust','Swift','Zig']
  grid.value?.update({
    data: Array(rows.length).fill(0).map(() => Array(cols.length).fill(false)),
    rowLabels: rows,
    colLabels: cols
  })
})
</script>

<template>
  <bit-grid ref="grid" />
</template>
```
