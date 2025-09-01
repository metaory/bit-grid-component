import 'bit-grid-component'
import './style.css'

const rows = ['Alice','Bob','Charlie','Diana','Eve','Frank']
const cols = ['Bash','Go','JQ','JS','Lisp','Lua','Rust','Swift','Zig']

const app = document.querySelector('#app')
const grid = document.createElement('bit-grid')
app.replaceChildren(grid)

grid.update({
  data: Array(rows.length).fill(0).map(() => Array(cols.length).fill(false)),
  rowLabels: rows,
  colLabels: cols
})
grid.addEventListener('dataChange', (e) => console.log(e.detail))
