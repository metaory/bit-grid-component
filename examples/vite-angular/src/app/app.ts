import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="container">
      <bit-grid #grid></bit-grid>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 2rem;
      display: grid;
      place-items: center;
      text-align: center;
    }
  `]
})
export class App implements AfterViewInit, OnDestroy {
  @ViewChild('grid', { static: false }) gridRef!: ElementRef;
  private dataChangeHandler?: (e: any) => void;

  private readonly rows = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
  private readonly cols = ['Bash', 'Go', 'JQ', 'JS', 'Lisp', 'Lua', 'Rust', 'Swift', 'Zig'];

  ngAfterViewInit() {
    this.initializeGrid();
  }

  ngOnDestroy() {
    if (this.dataChangeHandler) {
      this.gridRef.nativeElement?.removeEventListener('dataChange', this.dataChangeHandler);
    }
  }

  private initializeGrid() {
    this.updateGrid();

    this.dataChangeHandler = (e: any) => {
      console.log(e.detail);
    };

    this.gridRef.nativeElement?.addEventListener('dataChange', this.dataChangeHandler);
  }

  private updateGrid() {
    this.gridRef.nativeElement?.update({
      data: Array(this.rows.length).fill(0).map(() => Array(this.cols.length).fill(false)),
      rowLabels: this.rows,
      colLabels: this.cols
    });
  }
}
