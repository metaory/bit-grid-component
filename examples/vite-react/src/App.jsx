import { useEffect, useRef } from 'react'

function App() {
  const gridRef = useRef()

  useEffect(() => {
    const rows = ['Alice','Bob','Charlie','Diana','Eve','Frank']
    const cols = ['Bash','Go','JQ','JS','Lisp','Lua','Rust','Swift','Zig']
    
    if (gridRef.current) {
      gridRef.current.update({
        data: Array(rows.length).fill(0).map(() => Array(cols.length).fill(false)),
        rowLabels: rows,
        colLabels: cols
      })
      
      const handler = (e) => console.log(e.detail)
      gridRef.current.addEventListener('dataChange', handler)
      return () => gridRef.current?.removeEventListener('dataChange', handler)
    }
  }, [])

  return <bit-grid ref={gridRef} />
}

export default App
