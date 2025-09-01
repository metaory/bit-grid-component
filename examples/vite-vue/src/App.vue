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
  const el = grid.value
  const handler = (e) => console.log(e.detail)
  el?.addEventListener('dataChange', handler)
})
</script>

<template>
  <bit-grid ref="grid" />
</template>

<style scoped>
</style>
