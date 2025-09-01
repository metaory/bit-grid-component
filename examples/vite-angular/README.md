# Angular + Vite + BitGrid Component

This example demonstrates how to use the BitGrid Component library in an Angular application with Vite.

## Features

- **Angular 18** with standalone components
- **Vite** for fast development and building
- **BitGrid Component** web component integration
- Interactive grid with click and drag selection
- Real-time selection count display
- Reset functionality

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Usage

The example shows how to:

1. **Import the library**: `import 'bit-grid-component'`
2. **Use the web component**: `<bit-grid #grid></bit-grid>`
3. **Initialize with data**: Call `update()` method with data and labels
4. **Listen for changes**: Add event listener for `dataChange` events
5. **Update dynamically**: Modify grid data programmatically

## Key Implementation Details

- Uses `@ViewChild` to get reference to the grid element
- Implements `AfterViewInit` to initialize grid after view is ready
- Properly cleans up event listeners in `ngOnDestroy`
- Demonstrates reactive updates with Angular's change detection

## Grid Configuration

```typescript
const rows = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
const cols = ['Bash', 'Go', 'JQ', 'JS', 'Lisp', 'Lua', 'Rust', 'Swift', 'Zig'];

grid.update({
  data: Array(rows.length).fill(0).map(() => Array(cols.length).fill(false)),
  rowLabels: rows,
  colLabels: cols
});
```

## Event Handling

```typescript
grid.addEventListener('dataChange', (e) => {
  const data = e.detail;
  const selectedCount = data.flat().filter(cell => cell).length;
  // Update UI with selection count
});
```

## Learn More

- [BitGrid Component Documentation](https://github.com/metaory/bit-grid-component)
- [Angular Documentation](https://angular.dev)
- [Vite Documentation](https://vitejs.dev)
