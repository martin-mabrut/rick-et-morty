import { Component, output, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged} from 'rxjs';


@Component({
  selector: 'app-search-bar',
  imports: [ReactiveFormsModule],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.css',
})
export class SearchBar implements OnInit {
  searchInputed = new FormControl('', { nonNullable: true });
  search = output<string>();

  ngOnInit() {
      this.searchInputed.valueChanges
        .pipe(debounceTime(300), distinctUntilChanged())
        .subscribe((value) => this.search.emit(value));
    }
}
