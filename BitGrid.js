

const throttle = (fn, delay) => {
  let lastCall = 0;
  return (...args) => {
    const now = performance.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return fn(...args);
    }
  };
};

const createState = () => ({
  isDragging: false,
  dragStart: null,
  dragEnd: null
});

const createConfig = (options) => ({
  debounceMs: options.debounceMs || 100
});

const createGrid = (rows, cols) =>
  Array(rows).fill(null).map(() => Array(cols).fill(false));

const generateLabels = (length, prefix) =>
  Array.from({ length }, (_, i) => `${prefix}.${i + 1}`);

const getSelectionBounds = (dragStart, dragEnd) => ({
  minRow: Math.min(dragStart.row, dragEnd.row),
  maxRow: Math.max(dragStart.row, dragEnd.row),
  minCol: Math.min(dragStart.col, dragEnd.col),
  maxCol: Math.max(dragStart.col, dragEnd.col)
});

const isInSelection = (row, col, bounds) =>
  row >= bounds.minRow && row <= bounds.maxRow &&
  col >= bounds.minCol && col <= bounds.maxCol;

const isValidCell = (cell, rows, cols) =>
  cell.row >= 0 && cell.col >= 0 && cell.row < rows && cell.col < cols;

const createElement = (tag, className, attributes = {}) => {
  const element = document.createElement(tag);
  if (className) element.className = className;

  for (const key in attributes) {
    const value = attributes[key];
    if (key === 'textContent') element.textContent = value;
    else element.setAttribute(key, value);
  }
  return element;
};

const createCell = (rowIndex, colIndex, isActive) => {
  const cell = createElement('td', 'data-cell', {
    'data-row': rowIndex,
    'data-col': colIndex,
    'role': 'gridcell'
  });
  if (isActive) cell.dataset.active = 'true';
  return cell;
};

const createRow = (rowData, rowIndex, rowLabel) => {
  const tr = createElement('tr');
  tr.appendChild(createElement('td', 'row-label', { textContent: rowLabel }));

  const fragment = document.createDocumentFragment();
  for (const [i, cellData] of rowData.entries()) {
    fragment.appendChild(createCell(rowIndex, i, cellData));
  }
  tr.appendChild(fragment);
  return tr;
};

const createHeader = (colLabels) => {
  const thead = createElement('thead');
  const headerRow = createElement('tr');

  headerRow.appendChild(createElement('th', 'corner-cell'));

  const fragment = document.createDocumentFragment();
  for (const [i, label] of colLabels.entries()) {
    fragment.appendChild(createElement('th', 'col-label', {
      textContent: label,
      'data-col': i
    }));
  }
  headerRow.appendChild(fragment);

  thead.appendChild(headerRow);
  return thead;
};

const createTable = (grid, rowLabels, colLabels) => {
  const table = createElement('table', 'data-table');
  table.appendChild(createHeader(colLabels));

  const tbody = createElement('tbody');
  const fragment = document.createDocumentFragment();
  for (const [i, rowData] of grid.entries()) {
    fragment.appendChild(createRow(rowData, i, rowLabels[i]));
  }
  tbody.appendChild(fragment);

  table.appendChild(tbody);
  return table;
};

class BitGrid extends HTMLElement {
  constructor(options = {}) {
    super();
    this.attachShadow({ mode: 'open' });

    const data = Array.isArray(options.data) && Array.isArray(options.data[0])
      ? options.data
      : null;

    const rows = data ? data.length : (options.rowLabels?.length || 5);
    const cols = data ? data[0].length : (options.colLabels?.length || 5);

    this.rows = rows;
    this.cols = cols;

    this.data = {
      grid: data || createGrid(rows, cols),
      rowLabels: options.rowLabels || generateLabels(rows, 'row'),
      colLabels: options.colLabels || generateLabels(cols, 'col')
    };

    this.state = createState();
    this.config = createConfig(options);

    this._styles = null;
    this._isInitialized = false;
    this._cellsCache = null;
    this._boundsCache = null;

    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.throttledUpdateSelection = throttle(this.updateSelection.bind(this), 16);

    if (options.onChange) {
      this._debouncedOnChange = throttle(options.onChange, this.config.debounceMs);
      this.addEventListener('dataChange', (e) => this._debouncedOnChange(e.detail));
    }
  }

  connectedCallback() {
    requestAnimationFrame(() => this.initialize());
  }

  initialize() {
    if (this._isInitialized) return;

    this.render();
    this.adjustColumnHeaderHeight();
    this.bindEvents();
    this._isInitialized = true;
  }

  render() {
    if (!this._styles) {
      this._styles = this.getStyles();
      this.shadowRoot.innerHTML = `<style>${this._styles}</style>`;
    }

    const table = createTable(this.data.grid, this.data.rowLabels, this.data.colLabels);

    let grid = this.shadowRoot.querySelector('.bit-grid');
    if (!grid) {
      grid = createElement('div', 'bit-grid', {
        'role': 'grid',
        'tabindex': '0',
        'aria-label': 'Data Grid'
      });
      this.shadowRoot.appendChild(grid);
    }
    this._gridEl = grid;

    const existingTable = grid.querySelector('.data-table');
    if (existingTable) existingTable.replaceWith(table);
    if (!existingTable) grid.appendChild(table);

    this.style.setProperty('--grid-cols', `${this.cols}`);
    this._cellsCache = null;
  }

  adjustColumnHeaderHeight() {
    const colLabels = this.shadowRoot.querySelectorAll('.col-label');
    const maxTextWidth = Array.from(colLabels).reduce((m, el) => {
      const w = el.scrollWidth;
      return w > m ? w : m;
    }, 0);

    const headerHeight = maxTextWidth + 30;
    this.shadowRoot.querySelector('thead').style.height = `${headerHeight}px`;
  }

  getStyles() {
    return /*css*/`
      :host {
        --grid-primary: #3b82f6;
        --grid-bg: #ffffff;
        --grid-cell-bg: #f8fafc;
        --grid-text: #1f2937;
        --grid-text-muted: #64748b;
        --grid-header-bg: #f1f5f9;
        --grid-cols: 9;
        --grid-cell-size: min(56px, max(10px, calc((100% - var(--grid-header-width) - (var(--grid-cols) + 1) * var(--grid-cell-spacing)) / var(--grid-cols))));
        --grid-header-width: 80px;
        --grid-cell-spacing: 4px;
        --grid-cell-radius: 8px;
        --grid-radius: 12px;

        --grid-selection-bg: rgba(59, 130, 246, 0.25);
        --grid-selection-active-bg: rgba(59, 130, 246, 0.7);
        --grid-selection-border: var(--grid-primary);
        display: block;
        width: 100%;
        max-width: 100%;
      }

      .bit-grid {
        width: 100%;
        user-select: none;
        cursor: crosshair;
        font-family: inherit;
        font-size: 0.875rem;
        outline: none;
        display: flex;
        flex-direction: column;
        background: var(--grid-bg);
        padding: 16px;
        border-radius: var(--grid-radius);
        overflow: hidden;
      }

      .data-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: var(--grid-cell-spacing);
        table-layout: fixed;
        background: var(--grid-bg);
        border-radius: var(--grid-radius);
        max-width: 100%;
        box-sizing: border-box;
        overflow: hidden;
      }

      .data-table th,
      .data-table td {
        box-sizing: border-box;
        vertical-align: middle;
        text-align: center;
      }

      .data-table th:not(.corner-cell):not(.row-label),
      .data-table td:not(.row-label) {
        width: var(--grid-cell-size);
        height: var(--grid-cell-size);
      }

      .data-table tbody {
        width: 100%;
      }



      .data-table thead {
        background: var(--grid-header-bg);
      }

      .corner-cell {
        width: var(--grid-header-width);
        height: 30px;
        background: var(--grid-header-bg);
        color: var(--grid-text-muted);
        border-radius: var(--grid-radius);
        font-weight: 500;
        font-size: 0.75rem;
        position: sticky;
        top: 0;
        left: 0;
        z-index: 10;
      }

      .col-label {
        width: var(--grid-cell-size);
        min-width: var(--grid-cell-size);
        max-width: var(--grid-cell-size);
        height: var(--grid-cell-size);
        min-height: var(--grid-cell-size);
        max-height: var(--grid-cell-size);
        border-radius: var(--grid-cell-radius);
        color: var(--grid-text-muted);
        padding: 0;
        font-weight: 500;
        font-size: 0.7rem;
        font-family: monospace;
        white-space: nowrap;
        box-sizing: border-box;
        position: sticky;
        top: 0;
        z-index: 5;
        display: table-cell;
        transform: rotate(-90deg);
        transform-origin: center;
        text-align: center;
        overflow: visible;
        line-height: 1;
        padding-bottom: 0;
      }

      .row-label {
        width: var(--grid-header-width);
        height: var(--grid-cell-size);
        background: var(--grid-header-bg);
        color: var(--grid-text-muted);
        border-radius: var(--grid-cell-radius);
        font-weight: 500;
        text-align: left;
        padding: 0 10px;
        font-size: 0.75rem;
        box-sizing: border-box;
        position: sticky;
        left: 0;
        z-index: 5;
      }

      .data-cell {
        width: var(--grid-cell-size);
        height: var(--grid-cell-size);
        transition: background-color 0.15s ease;
        cursor: pointer;
        border-radius: var(--grid-cell-radius);
        background: var(--grid-cell-bg);
        box-sizing: border-box;
        position: relative;
        flex-shrink: 1;
        flex-grow: 1;
      }

      .data-cell[data-active] {
        background-color: var(--grid-primary);
      }

      .data-cell[data-selecting] {
        background-color: var(--grid-selection-bg);
        border: 2px solid var(--grid-selection-border);
        border-radius: var(--grid-cell-radius);
        z-index: 10;
        position: relative;
      }

      .data-cell[data-active][data-selecting] {
        background-color: var(--grid-selection-active-bg);
      }

      .data-cell:hover {
        filter: hue-rotate(40deg) brightness(1.5) saturate(2);
        transform: scale(1.1);
        z-index: 5;
      }


    `;
  }

  bindEvents() {
    const grid = this.shadowRoot.querySelector('.bit-grid');
    if (!grid) return;

    const events = [
      ['mousedown', this.handleMouseDown],
      ['mousemove', this.handleMouseMove],
      ['mouseup', this.handleMouseUp],
      ['touchstart', this.handleTouchStart, { passive: false }]
    ];

    for (let i = 0; i < events.length; i++) {
      const [event, handler, options] = events[i];
      grid.addEventListener(event, handler, options);
    }

    document.addEventListener('mouseup', this.handleMouseUp);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  disconnectedCallback() {
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  handleMouseDown(e) {
    if (e.button !== 0) return;

    const cell = this.getCellFromPoint(e.clientX, e.clientY);
    if (!isValidCell(cell, this.rows, this.cols)) return;

    e.preventDefault();
    this.startDrag(cell);
  }

  handleMouseMove(e) {
    if (!this.state.isDragging) return;

    const cell = this.getCellFromPoint(e.clientX, e.clientY);
    if (!isValidCell(cell, this.rows, this.cols)) return;

    e.preventDefault();
    this.updateDrag(cell);
  }

  handleMouseUp(e) {
    if (!this.state.isDragging) return;
    e.preventDefault();
    this.endDrag();
  }

  handleKeyDown(e) {
    if (e.key === 'Escape') this.cancelDrag();
  }

  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const cell = this.getCellFromPoint(touch.clientX, touch.clientY);
    if (!isValidCell(cell, this.rows, this.cols)) return;

    // Toggle the cell state
    this.data.grid[cell.row][cell.col] = !this.data.grid[cell.row][cell.col];
    this.updateCellStates();
    this.dispatchChangeEvent();
  }



  startDrag(cell) {
    this.state.isDragging = true;
    this.state.dragStart = cell;
    this.state.dragEnd = cell;
    this.throttledUpdateSelection();
  }

  updateDrag(cell) {
    this.state.dragEnd = cell;
    this.throttledUpdateSelection();
  }

  endDrag() {
    if (!this.state.isDragging || !this.state.dragStart || !this.state.dragEnd) {
      this.resetDrag();
      return;
    }

    this.toggleSelection();
    this.dispatchChangeEvent();
    this.resetDrag();
    this.clearSelectionVisuals();
  }

  cancelDrag() {
    this.resetDrag();
    this.clearSelectionVisuals();
  }

  resetDrag() {
    this.state.isDragging = false;
    this.state.dragStart = null;
    this.state.dragEnd = null;
  }

  clearSelectionVisuals() {
    const cells = this._cellsCache || this.shadowRoot.querySelectorAll('.data-cell[data-selecting]');
    for (const cell of cells) cell.removeAttribute('data-selecting');
  }

  getCellFromPoint(x, y) {
    const grid = this.shadowRoot.querySelector('.bit-grid');
    if (!grid) return { row: -1, col: -1 };

    const table = grid.querySelector('table');
    if (!table) return { row: -1, col: -1 };

    const elementBelow = document.elementFromPoint(x, y);
    if (!elementBelow) return { row: -1, col: -1 };

    const dataCell = elementBelow.closest('td.data-cell');
    if (dataCell) {
      return {
        row: parseInt(dataCell.dataset.row),
        col: parseInt(dataCell.dataset.col)
      };
    }

    const cells = table.querySelectorAll('td.data-cell');
    if (cells.length === 0) return { row: -1, col: -1 };

    const hit = Array.from(cells).find(cell => {
      const r = cell.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });

    if (hit) return { row: parseInt(hit.dataset.row), col: parseInt(hit.dataset.col) };

    return { row: -1, col: -1 };
  }

  toggleSelection() {
    const bounds = getSelectionBounds(this.state.dragStart, this.state.dragEnd);

    for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
      for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
        this.data.grid[r][c] = !this.data.grid[r][c];
      }
    }

    this.updateCellStates();
  }

  updateCellStates() {
    if (!this._cellsCache) this._cellsCache = this.shadowRoot.querySelectorAll('.data-cell');
    const cells = this._cellsCache;

    for (const cell of cells) {
      const row = cell.dataset.row | 0;
      const col = cell.dataset.col | 0;
      const isActive = this.data.grid[row][col];
      const hasActive = cell.hasAttribute('data-active');
      if (isActive === hasActive) continue;
      if (isActive) { cell.setAttribute('data-active', ''); continue; }
      cell.removeAttribute('data-active');
    }
  }

  updateSelection() {
    if (!this._cellsCache) this._cellsCache = this.shadowRoot.querySelectorAll('.data-cell');
    const cells = this._cellsCache;

    const boundsKey = `${this.state.dragStart?.row},${this.state.dragStart?.col}-${this.state.dragEnd?.row},${this.state.dragEnd?.col}`;
    if (!this._boundsCache || this._boundsCache.key !== boundsKey) {
      this._boundsCache = {
        key: boundsKey,
        bounds: getSelectionBounds(this.state.dragStart, this.state.dragEnd)
      };
    }
    const bounds = this._boundsCache.bounds;

    for (const cell of cells) {
      const row = cell.dataset.row | 0;
      const col = cell.dataset.col | 0;
      const shouldBeSelecting = isInSelection(row, col, bounds);
      const isSelecting = cell.hasAttribute('data-selecting');
      if (shouldBeSelecting === isSelecting) continue;
      if (isSelecting) { cell.removeAttribute('data-selecting'); continue; }
      cell.setAttribute('data-selecting', '');
    }
  }

  dispatchChangeEvent() {
    this.dispatchEvent(new CustomEvent('dataChange', {
      detail: this.data.grid,
      bubbles: true,
      composed: true
    }));
  }

  getData() {
    return this.data.grid;
  }

  update(newOptions = {}) {
    const hasData = Array.isArray(newOptions.data) && Array.isArray(newOptions.data[0]);

    let dimensionsChanged = false;
    if (hasData) {
      const data = newOptions.data;
      const rows = data.length;
      const cols = data[0].length;
      dimensionsChanged = rows !== this.rows || cols !== this.cols;
      this.rows = rows;
      this.cols = cols;
      this.data.grid = data;
    }

    if (newOptions.rowLabels) this.data.rowLabels = newOptions.rowLabels;
    if (newOptions.colLabels) this.data.colLabels = newOptions.colLabels;

    // Check if we need to regenerate grid based on new label dimensions
    const newRows = this.data.rowLabels?.length || this.rows || 5;
    const newCols = this.data.colLabels?.length || this.cols || 5;
    
    if (!hasData && (newRows !== this.rows || newCols !== this.cols)) {
      this.rows = newRows;
      this.cols = newCols;
      this.data.grid = createGrid(newRows, newCols);
      dimensionsChanged = true;
    }

    if (!this.data.rowLabels || this.data.rowLabels.length === 0) {
      this.data.rowLabels = generateLabels(this.rows, 'row');
    }
    if (!this.data.colLabels || this.data.colLabels.length === 0) {
      this.data.colLabels = generateLabels(this.cols, 'col');
    }

    if (dimensionsChanged) {
      this.render();
      this.adjustColumnHeaderHeight();
    } else {
      this.updateCellStates();
    }

    this.style.setProperty('--grid-cols', `${this.cols}`);
  }

  reset() {
    this.data.grid = createGrid(this.rows, this.cols);
    this.updateCellStates();
  }

  // Convenience methods for common operations
  setLabels(rowLabels, colLabels) {
    this.update({ rowLabels, colLabels });
  }

  setData(data) {
    this.update({ data });
  }

  setCell(row, col, value) {
    if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
      this.data.grid[row][col] = value;
      this.updateCellStates();
      this.dispatchChangeEvent();
    }
  }

  getCell(row, col) {
    if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
      return this.data.grid[row][col];
    }
    return null;
  }

  toggleCell(row, col) {
    if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
      this.data.grid[row][col] = !this.data.grid[row][col];
      this.updateCellStates();
      this.dispatchChangeEvent();
    }
  }

  fill(value = false) {
    this.data.grid = createGrid(this.rows, this.cols).map(row => row.map(() => value));
    this.updateCellStates();
    this.dispatchChangeEvent();
  }
}

customElements.define('bit-grid', BitGrid);

export default BitGrid;

