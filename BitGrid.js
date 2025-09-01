

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

  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'textContent') {
      element.textContent = value;
    } else {
      element.setAttribute(key, value);
    }
  });
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
  rowData.forEach((cellData, i) => {
    fragment.appendChild(createCell(rowIndex, i, cellData));
  });
  tr.appendChild(fragment);
  return tr;
};

const createHeader = (colLabels) => {
  const thead = createElement('thead');
  const headerRow = createElement('tr');

  headerRow.appendChild(createElement('th', 'corner-cell'));

  const fragment = document.createDocumentFragment();
  colLabels.forEach((label, i) => {
    fragment.appendChild(createElement('th', 'col-label', {
      textContent: label,
      'data-col': i
    }));
  });
  headerRow.appendChild(fragment);

  thead.appendChild(headerRow);
  return thead;
};

const createTable = (grid, rowLabels, colLabels) => {
  const table = createElement('table', 'data-table');
  table.appendChild(createHeader(colLabels));

  const tbody = createElement('tbody');
  const fragment = document.createDocumentFragment();
  grid.forEach((rowData, i) => {
    fragment.appendChild(createRow(rowData, i, rowLabels[i]));
  });
  tbody.appendChild(fragment);

  table.appendChild(tbody);
  return table;
};

class BitGrid extends HTMLElement {
  constructor(options = {}) {
    super();
    this.attachShadow({ mode: 'open' });

    const data = options.data || createGrid(5, 5);
    this.rows = data.length;
    this.cols = data[0].length;

    const generateLabels = (length, prefix) =>
      Array.from({ length }, (_, i) => `${prefix} ${i + 1}`);

    this.data = {
      grid: data,
      rowLabels: options.rowLabels || generateLabels(this.rows, 'Row'),
      colLabels: options.colLabels || generateLabels(this.cols, 'Col')
    };

    this.state = createState();
    this.config = createConfig(options);

    this._styles = null;
    this._isInitialized = false;
    this._cellsCache = null;
    this._boundsCache = null;
    this._headerHeight = null;
    this._resizeObserver = null;
    this._onWindowResize = null;

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
    const maxTextWidth = Array.from(colLabels).reduce((max, label) =>
      Math.max(max, label.scrollWidth), 0);

    const headerHeight = maxTextWidth + 30;
    this.shadowRoot.querySelector('thead').style.height = `${headerHeight}px`;

    this._headerHeight = headerHeight;
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

    events.forEach(([event, handler, options]) => {
      grid.addEventListener(event, handler, options);
    });

    document.addEventListener('mouseup', this.handleMouseUp);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  observeResize() {}

  disconnectedCallback() {
    if (this._resizeObserver) { this._resizeObserver.disconnect(); this._resizeObserver = null; }
    if (this._onWindowResize) { window.removeEventListener('resize', this._onWindowResize); this._onWindowResize = null; }
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  adaptSize() {}

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
    Array.from(cells).forEach(cell => {
      cell.removeAttribute('data-selecting');
    });
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

    const foundCell = Array.from(cells).find(cell => {
      const rect = cell.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    });

    if (foundCell) {
      return {
        row: parseInt(foundCell.dataset.row),
        col: parseInt(foundCell.dataset.col)
      };
    }

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
    if (!this._cellsCache) {
      this._cellsCache = this.shadowRoot.querySelectorAll('.data-cell');
    }
    const cells = this._cellsCache;

    Array.from(cells).forEach(cell => {
      const row = cell.dataset.row | 0;
      const col = cell.dataset.col | 0;
      const isActive = this.data.grid[row][col];

      const hasActive = cell.hasAttribute('data-active');
      if (isActive !== hasActive) {
        if (isActive) {
          cell.setAttribute('data-active', '');
        } else {
          cell.removeAttribute('data-active');
        }
      }
    });
  }

  updateSelection() {
    if (!this._cellsCache) {
      this._cellsCache = this.shadowRoot.querySelectorAll('.data-cell');
    }
    const cells = this._cellsCache;

    const boundsKey = `${this.state.dragStart?.row},${this.state.dragStart?.col}-${this.state.dragEnd?.row},${this.state.dragEnd?.col}`;
    if (!this._boundsCache || this._boundsCache.key !== boundsKey) {
      this._boundsCache = {
        key: boundsKey,
        bounds: getSelectionBounds(this.state.dragStart, this.state.dragEnd)
      };
    }
    const bounds = this._boundsCache.bounds;

    Array.from(cells).forEach(cell => {
      const row = cell.dataset.row | 0;
      const col = cell.dataset.col | 0;
      const shouldBeSelecting = isInSelection(row, col, bounds);
      const isCurrentlySelecting = cell.hasAttribute('data-selecting');

      if (shouldBeSelecting !== isCurrentlySelecting) {
        if (isCurrentlySelecting) {
          cell.removeAttribute('data-selecting');
        } else {
          cell.setAttribute('data-selecting', '');
        }
      }
    });
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

  update(newOptions) {
    if (newOptions.data) {
      if (!Array.isArray(newOptions.data) || !Array.isArray(newOptions.data[0])) {
        throw new Error('Data must be a 2D array');
      }

      const [newRows, newCols] = [newOptions.data.length, newOptions.data[0].length];
      const dimensionsChanged = newRows !== this.rows || newCols !== this.cols;
      if (dimensionsChanged) {
        this.rows = newRows;
        this.cols = newCols;
      }
      this.data.grid = newOptions.data;
    }

    const generateLabels = (length, prefix) =>
      Array.from({ length }, (_, i) => `${prefix} ${i + 1}`);

    this.data.rowLabels = newOptions.rowLabels ||
      (newOptions.data ? generateLabels(this.rows, 'Row') : this.data.rowLabels);
    this.data.colLabels = newOptions.colLabels ||
      (newOptions.data ? generateLabels(this.cols, 'Col') : this.data.colLabels);

    this.render();
    this.adjustColumnHeaderHeight();
    this.updateCellStates();
    this.style.setProperty('--grid-cols', `${this.cols}`);
  }

  reset() {
    this.data.grid = createGrid(this.rows, this.cols);
    this.updateCellStates();
  }
}

customElements.define('bit-grid', BitGrid);

export default BitGrid;

