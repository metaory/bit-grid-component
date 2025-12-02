const throttle = (fn, delay) => {
  let lastCall = 0;
  return (...args) => {
    const now = performance.now();
    if (now - lastCall < delay) return;
    lastCall = now;
    return fn(...args);
  };
};

const createGrid = (rows, cols) =>
  Array.from({ length: rows }, () => Array(cols).fill(false));

const generateLabels = (length, prefix) =>
  Array.from({ length }, (_, i) => `${prefix}.${i + 1}`);

const getSelectionBounds = (start, end) => ({
  minRow: Math.min(start.row, end.row),
  maxRow: Math.max(start.row, end.row),
  minCol: Math.min(start.col, end.col),
  maxCol: Math.max(start.col, end.col),
});

const isInSelection = (row, col, bounds) =>
  row >= bounds.minRow &&
  row <= bounds.maxRow &&
  col >= bounds.minCol &&
  col <= bounds.maxCol;

const isValidCell = (cell, rows, cols) =>
  cell.row >= 0 && cell.col >= 0 && cell.row < rows && cell.col < cols;

const createElement = (tag, className, attrs = {}) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  for (const [k, v] of Object.entries(attrs)) {
    k === "textContent" ? (el.textContent = v) : el.setAttribute(k, v);
  }
  return el;
};

const createCell = (row, col, active) => {
  const cell = createElement("td", "data-cell", {
    "data-row": row,
    "data-col": col,
    role: "gridcell",
  });
  if (active) cell.dataset.active = "";
  return cell;
};

const createRow = (rowData, rowIndex, label) => {
  const tr = createElement("tr");
  tr.appendChild(createElement("td", "row-label", { textContent: label }));
  const frag = document.createDocumentFragment();
  rowData.map((val, i) => frag.appendChild(createCell(rowIndex, i, val)));
  tr.appendChild(frag);
  return tr;
};

const createHeader = (colLabels) => {
  const thead = createElement("thead");
  const row = createElement("tr");
  row.appendChild(createElement("th", "corner-cell"));
  const frag = document.createDocumentFragment();
  colLabels.map((label, i) =>
    frag.appendChild(
      createElement("th", "col-label", { textContent: label, "data-col": i }),
    ),
  );
  row.appendChild(frag);
  thead.appendChild(row);
  return thead;
};

const createTable = (grid, rowLabels, colLabels) => {
  const table = createElement("table", "data-table");
  table.appendChild(createHeader(colLabels));
  const tbody = createElement("tbody");
  const frag = document.createDocumentFragment();
  grid.map((rowData, i) =>
    frag.appendChild(createRow(rowData, i, rowLabels[i])),
  );
  tbody.appendChild(frag);
  table.appendChild(tbody);
  return table;
};

class BitGrid extends HTMLElement {
  #rows;
  #cols;
  #grid;
  #rowLabels;
  #colLabels;
  #state = { isDragging: false, dragStart: null, dragEnd: null };
  #debounceMs;
  #styles = null;
  #isInitialized = false;
  #cellsCache = null;
  #boundsCache = null;
  #gridEl = null;
  #debouncedOnChange = null;
  #throttledUpdateSelection = null;

  constructor(options = {}) {
    super();
    this.attachShadow({ mode: "open" });

    const data = Array.isArray(options.data?.[0]) ? options.data : null;
    this.#rows = data?.length ?? options.rowLabels?.length ?? 5;
    this.#cols = data?.[0]?.length ?? options.colLabels?.length ?? 5;
    this.#grid = data ?? createGrid(this.#rows, this.#cols);
    this.#rowLabels = options.rowLabels ?? generateLabels(this.#rows, "row");
    this.#colLabels = options.colLabels ?? generateLabels(this.#cols, "col");
    this.#debounceMs = options.debounceMs ?? 100;

    this.#throttledUpdateSelection = throttle(
      this.#updateSelection.bind(this),
      16,
    );

    if (options.onChange) {
      this.#debouncedOnChange = throttle(options.onChange, this.#debounceMs);
      this.addEventListener("dataChange", (e) =>
        this.#debouncedOnChange(e.detail),
      );
    }
  }

  connectedCallback() {
    requestAnimationFrame(() => this.#initialize());
  }

  #initialize() {
    if (this.#isInitialized) return;
    this.#render();
    this.#adjustColumnHeaderHeight();
    this.#bindEvents();
    this.#isInitialized = true;
    this.dispatchEvent(
      new CustomEvent("ready", { bubbles: true, composed: true }),
    );
  }

  #render() {
    if (!this.#styles) {
      this.#styles = this.#getStyles();
      this.shadowRoot.innerHTML = `<style>${this.#styles}</style>`;
    }

    const table = createTable(this.#grid, this.#rowLabels, this.#colLabels);
    let grid = this.shadowRoot.querySelector(".bit-grid");

    if (!grid) {
      grid = createElement("div", "bit-grid", {
        role: "grid",
        tabindex: "0",
        "aria-label": "Data Grid",
      });
      this.shadowRoot.appendChild(grid);
    }
    this.#gridEl = grid;

    const existing = grid.querySelector(".data-table");
    existing ? existing.replaceWith(table) : grid.appendChild(table);

    this.style.setProperty("--grid-cols", `${this.#cols}`);
    this.#cellsCache = null;
  }

  #adjustColumnHeaderHeight() {
    const labels = this.shadowRoot.querySelectorAll(".col-label");
    const maxWidth = Array.from(labels).reduce(
      (m, el) => Math.max(m, el.scrollWidth),
      0,
    );
    this.shadowRoot.querySelector("thead").style.height = `${maxWidth + 30}px`;
  }

  #getStyles() {
    return /*css*/ `
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
      .data-table th, .data-table td {
        box-sizing: border-box;
        vertical-align: middle;
        text-align: center;
      }
      .data-table th:not(.corner-cell):not(.row-label),
      .data-table td:not(.row-label) {
        width: var(--grid-cell-size);
        height: var(--grid-cell-size);
      }
      .data-table tbody { width: 100%; }
      .data-table thead { background: var(--grid-header-bg); }
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
      .data-cell[data-active] { background-color: var(--grid-primary); }
      .data-cell[data-selecting] {
        background-color: var(--grid-selection-bg);
        border: 2px solid var(--grid-selection-border);
        border-radius: var(--grid-cell-radius);
        z-index: 10;
        position: relative;
      }
      .data-cell[data-active][data-selecting] { background-color: var(--grid-selection-active-bg); }
      .data-cell:hover {
        filter: hue-rotate(40deg) brightness(1.5) saturate(2);
        transform: scale(1.1);
        z-index: 5;
      }
    `;
  }

  #bindEvents() {
    const grid = this.shadowRoot.querySelector(".bit-grid");
    if (!grid) return;

    grid.addEventListener("mousedown", this.#handleMouseDown);
    grid.addEventListener("mousemove", this.#handleMouseMove);
    grid.addEventListener("mouseup", this.#handleMouseUp);
    grid.addEventListener("touchstart", this.#handleTouchStart, {
      passive: false,
    });
    document.addEventListener("mouseup", this.#handleMouseUp);
    document.addEventListener("keydown", this.#handleKeyDown);
  }

  disconnectedCallback() {
    document.removeEventListener("mouseup", this.#handleMouseUp);
    document.removeEventListener("keydown", this.#handleKeyDown);
  }

  #handleMouseDown = (e) => {
    if (e.button !== 0) return;
    const cell = this.#getCellFromPoint(e.clientX, e.clientY);
    if (!isValidCell(cell, this.#rows, this.#cols)) return;
    e.preventDefault();
    this.#startDrag(cell);
  };

  #handleMouseMove = (e) => {
    if (!this.#state.isDragging) return;
    const cell = this.#getCellFromPoint(e.clientX, e.clientY);
    if (!isValidCell(cell, this.#rows, this.#cols)) return;
    e.preventDefault();
    this.#state.dragEnd = cell;
    this.#throttledUpdateSelection();
  };

  #handleMouseUp = (e) => {
    if (!this.#state.isDragging) return;
    e.preventDefault();
    this.#endDrag();
  };

  #handleKeyDown = (e) => {
    if (e.key === "Escape") this.#cancelDrag();
  };

  #handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const cell = this.#getCellFromPoint(touch.clientX, touch.clientY);
    if (!isValidCell(cell, this.#rows, this.#cols)) return;
    this.#grid[cell.row][cell.col] = !this.#grid[cell.row][cell.col];
    this.#updateCellStates();
    this.#dispatchChange();
  };

  #startDrag(cell) {
    this.#state.isDragging = true;
    this.#state.dragStart = cell;
    this.#state.dragEnd = cell;
    this.#throttledUpdateSelection();
  }

  #endDrag() {
    if (
      !this.#state.isDragging ||
      !this.#state.dragStart ||
      !this.#state.dragEnd
    ) {
      this.#resetDrag();
      return;
    }
    this.#toggleSelection();
    this.#dispatchChange();
    this.#resetDrag();
    this.#clearSelectionVisuals();
  }

  #cancelDrag() {
    this.#resetDrag();
    this.#clearSelectionVisuals();
  }

  #resetDrag() {
    this.#state.isDragging = false;
    this.#state.dragStart = null;
    this.#state.dragEnd = null;
  }

  #clearSelectionVisuals() {
    const cells =
      this.#cellsCache ??
      this.shadowRoot.querySelectorAll(".data-cell[data-selecting]");
    for (const cell of cells) cell.removeAttribute("data-selecting");
  }

  #getCellFromPoint(x, y) {
    const grid = this.shadowRoot.querySelector(".bit-grid");
    if (!grid) return { row: -1, col: -1 };

    const table = grid.querySelector("table");
    if (!table) return { row: -1, col: -1 };

    const el = document.elementFromPoint(x, y);
    if (!el) return { row: -1, col: -1 };

    const dataCell = el.closest("td.data-cell");
    if (dataCell)
      return { row: +dataCell.dataset.row, col: +dataCell.dataset.col };

    const cells = table.querySelectorAll("td.data-cell");
    if (!cells.length) return { row: -1, col: -1 };

    const hit = Array.from(cells).find((cell) => {
      const r = cell.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });

    return hit
      ? { row: +hit.dataset.row, col: +hit.dataset.col }
      : { row: -1, col: -1 };
  }

  #toggleSelection() {
    const bounds = getSelectionBounds(
      this.#state.dragStart,
      this.#state.dragEnd,
    );
    for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
      for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
        this.#grid[r][c] = !this.#grid[r][c];
      }
    }
    this.#updateCellStates();
  }

  #updateCellStates() {
    if (!this.#cellsCache)
      this.#cellsCache = this.shadowRoot.querySelectorAll(".data-cell");
    for (const cell of this.#cellsCache) {
      const row = +cell.dataset.row;
      const col = +cell.dataset.col;
      const isActive = this.#grid[row][col];
      const hasActive = cell.hasAttribute("data-active");
      if (isActive === hasActive) continue;
      isActive
        ? cell.setAttribute("data-active", "")
        : cell.removeAttribute("data-active");
    }
  }

  #updateSelection() {
    if (!this.#cellsCache)
      this.#cellsCache = this.shadowRoot.querySelectorAll(".data-cell");

    const key = `${this.#state.dragStart?.row},${this.#state.dragStart?.col}-${this.#state.dragEnd?.row},${this.#state.dragEnd?.col}`;
    if (!this.#boundsCache || this.#boundsCache.key !== key) {
      this.#boundsCache = {
        key,
        bounds: getSelectionBounds(this.#state.dragStart, this.#state.dragEnd),
      };
    }

    for (const cell of this.#cellsCache) {
      const row = +cell.dataset.row;
      const col = +cell.dataset.col;
      const shouldSelect = isInSelection(row, col, this.#boundsCache.bounds);
      const isSelecting = cell.hasAttribute("data-selecting");
      if (shouldSelect === isSelecting) continue;
      shouldSelect
        ? cell.setAttribute("data-selecting", "")
        : cell.removeAttribute("data-selecting");
    }
  }

  #dispatchChange() {
    this.dispatchEvent(
      new CustomEvent("dataChange", {
        detail: this.#grid,
        bubbles: true,
        composed: true,
      }),
    );
  }

  // Public API

  getData() {
    return this.#grid;
  }

  update(options = {}) {
    const hasData = Array.isArray(options.data?.[0]);
    let dimensionsChanged = false;

    if (hasData) {
      const rows = options.data.length;
      const cols = options.data[0].length;
      dimensionsChanged = rows !== this.#rows || cols !== this.#cols;
      this.#rows = rows;
      this.#cols = cols;
      this.#grid = options.data;
    }

    if (options.rowLabels) this.#rowLabels = options.rowLabels;
    if (options.colLabels) this.#colLabels = options.colLabels;

    const newRows = this.#rowLabels?.length ?? this.#rows ?? 5;
    const newCols = this.#colLabels?.length ?? this.#cols ?? 5;

    if (!hasData && (newRows !== this.#rows || newCols !== this.#cols)) {
      this.#rows = newRows;
      this.#cols = newCols;
      this.#grid = createGrid(newRows, newCols);
      dimensionsChanged = true;
    }

    if (!this.#rowLabels?.length)
      this.#rowLabels = generateLabels(this.#rows, "row");
    if (!this.#colLabels?.length)
      this.#colLabels = generateLabels(this.#cols, "col");

    dimensionsChanged
      ? (this.#render(), this.#adjustColumnHeaderHeight())
      : this.#updateCellStates();
    this.style.setProperty("--grid-cols", `${this.#cols}`);
  }

  reset() {
    this.#grid = createGrid(this.#rows, this.#cols);
    this.#updateCellStates();
  }

  setLabels(rowLabels, colLabels) {
    this.update({ rowLabels, colLabels });
  }

  setData(data, silent = false) {
    this.update({ data });
    if (!silent) this.#dispatchChange();
  }

  setCell(row, col, value, silent = false) {
    if (row < 0 || row >= this.#rows || col < 0 || col >= this.#cols) return;
    this.#grid[row][col] = value;
    this.#updateCellStates();
    if (!silent) this.#dispatchChange();
  }

  getCell(row, col) {
    if (row < 0 || row >= this.#rows || col < 0 || col >= this.#cols)
      return null;
    return this.#grid[row][col];
  }

  toggleCell(row, col, silent = false) {
    if (row < 0 || row >= this.#rows || col < 0 || col >= this.#cols) return;
    this.#grid[row][col] = !this.#grid[row][col];
    this.#updateCellStates();
    if (!silent) this.#dispatchChange();
  }

  fill(value = false, silent = false) {
    this.#grid = createGrid(this.#rows, this.#cols).map((row) =>
      row.map(() => value),
    );
    this.#updateCellStates();
    if (!silent) this.#dispatchChange();
  }
}

customElements.define("bit-grid", BitGrid);

export default BitGrid;
