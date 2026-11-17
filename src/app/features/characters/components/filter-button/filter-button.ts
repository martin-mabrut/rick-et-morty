import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-filter-button',
  imports: [],
  templateUrl: './filter-button.html',
  styleUrl: './filter-button.css',
})
export class FilterButton {
  value = input<string>();
  label = input<string>();
  active = input<boolean>();
  filterSelected = output<string>();

  emited() {
    const currentValue = this.value();

    if (currentValue === undefined) {
      this.filterSelected.emit('');
    } else {
      this.filterSelected.emit(currentValue);
    }
  }
}
