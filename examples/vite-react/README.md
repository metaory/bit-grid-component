# React Example

<div align="center"><h3><a href="https://metaory.github.io/bit-grid-component/examples/vite-react/" target="_blank">Live Preview →</a></h3></div>

## Setup

```bash
npm install
npm run dev
```

## Vite config

```js
export default {
  base: '/bit-grid-component/examples/vite-react/',
  build: { target: 'esnext' }
}
```

## Usage

```jsx
import 'bit-grid-component'
import { useEffect, useRef } from 'react'

export default function App() {
  const gridRef = useRef()
  useEffect(() => {
    const rows = ['Alice','Bob','Charlie','Diana','Eve','Frank']
    const cols = ['Bash','Go','JQ','JS','Lisp','Lua','Rust','Swift','Zig']
    gridRef.current?.update({
      data: Array(rows.length).fill(0).map(() => Array(cols.length).fill(false)),
      rowLabels: rows,
      colLabels: cols
    })
  }, [])
  return <bit-grid ref={gridRef} />
}
```
