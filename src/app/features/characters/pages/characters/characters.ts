import { Component, OnInit, signal, inject } from '@angular/core';
import { Character } from '../../types/character.type';
import { CharacterCard } from '../../components/character-card/character-card';
import { CharactersService } from '../../services/characters';
import { ApiResponse, InfoResponse } from '../../../../shared/types/api-response.types';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { SearchBar } from '../../components/search-bar/search-bar';
import { FilterButton } from '../../components/filter-button/filter-button';

@Component({
  selector: 'app-characters',
  imports: [CharacterCard, Pagination, SearchBar, FilterButton],
  templateUrl: './characters.html',
  styleUrl: './characters.css',
})
export class Characters implements OnInit {
  private readonly characterService = inject(CharactersService);
  readonly characters = this.characterService.characterSignal;
  readonly infos = signal<InfoResponse>({} as InfoResponse);
  currentPage = signal(1);
  totalPage = signal(0);
  searchTerm = signal('');
  selectedStatus = signal('');
  selectedSpecies = signal('');
  selectedGender = signal('');
  selectedType = signal('');

  ngOnInit() {
    // Method 1 : Do everything in the service
    this.characterService.getCharactersFromService().subscribe();
    // Method 2 : Get needed value in the component directly
    this.loadCharacters();
  }

  loadCharacters(page?: number, name?: string, status?: string, species?:string, type?:string, gender?:string) {
    this.currentPage.set(page ? page : 1);

    this.characterService
      .getCharacterFromComponent(page, name, status, species, type, gender)
      .subscribe((response: ApiResponse<Character[]>) => {
        this.infos.set(response.info);
        this.totalPage.set(this.infos().pages);
      });
  }

  changePage(page: number) {
    this.currentPage.set(page);
    this.characterService.getCharactersFromService(page, this.searchTerm(), this.selectedStatus(), this.selectedSpecies(), this.selectedType(), this.selectedGender()).subscribe();
  }

  onSearch(name: string) {
    this.searchTerm.set(name);
    this.characterService.getCharactersFromService(1, name, this.selectedStatus(), this.selectedSpecies(), this.selectedType(), this.selectedGender()).subscribe();
    this.loadCharacters(1, name, this.selectedStatus(), this.selectedSpecies(), this.selectedType(), this.selectedGender());
  }

  toggleStatus(value: string) {
    if (this.selectedStatus() === value){
      this.selectedStatus.set('');
    } else {
      this.selectedStatus.set(value);
    }

    this.characterService.getCharactersFromService(1, this.searchTerm(), this.selectedStatus(), this.selectedSpecies(), this.selectedType(), this.selectedGender()).subscribe();
    this.loadCharacters(1, this.searchTerm(), this.selectedStatus(), this.selectedSpecies(), this.selectedType(), this.selectedGender());
  }

  toggleSpecies(value: string) {
    if (this.selectedSpecies() === value){
      this.selectedSpecies.set('');
    } else {
      this.selectedSpecies.set(value);
    }

    this.characterService.getCharactersFromService(1, this.searchTerm(), this.selectedStatus(), this.selectedSpecies(), this.selectedType(), this.selectedGender()).subscribe();
    this.loadCharacters(1, this.searchTerm(), this.selectedStatus(), this.selectedSpecies(), this.selectedType(), this.selectedGender());
  }

  toggleGender(value: string) {
    if (this.selectedGender() === value){
      this.selectedGender.set('');
    } else {
      this.selectedGender.set(value);
    }

    this.characterService.getCharactersFromService(1, this.searchTerm(), this.selectedStatus(), this.selectedSpecies(), this.selectedType(), this.selectedGender()).subscribe();
    this.loadCharacters(1, this.searchTerm(), this.selectedStatus(), this.selectedSpecies(), this.selectedType(), this.selectedGender());
  }

  toggleType(value: string) {
    if (this.selectedType() === value){
      this.selectedType.set('');
    } else {
      this.selectedType.set(value);
    }

    this.characterService.getCharactersFromService(1, this.searchTerm(), this.selectedStatus(), this.selectedSpecies(), this.selectedType(), this.selectedGender()).subscribe();
    this.loadCharacters(1, this.searchTerm(), this.selectedStatus(), this.selectedSpecies(), this.selectedType(), this.selectedGender());
  }
}
