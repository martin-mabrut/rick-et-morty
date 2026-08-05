import { Component, input, inject, signal } from '@angular/core';
import { Location } from '../../types/location.type';
import { NgClass } from '@angular/common';
import { CharactersService } from '../../../characters/services/characters';
import { Character } from '../../../characters/types/character.type';

@Component({
  selector: 'app-location-card',
  imports: [NgClass],
  templateUrl: './location-card.html',
  styleUrl: './location-card.css',
})
export class LocationCard {
  location = input.required<Location>();
  private readonly charactersService = inject(CharactersService);
  isUnfolded = signal(false);
  residents = signal<Character[]>([]);

onClicOnLocationCard() {
  if(this.residents().length === 0 && this.location().residents.length > 0) {
    this.charactersService.getCharactersByUrls(this.location().residents)
      .subscribe((response: Character[]) => {
        this.residents.set(response);
      });
  };

  this.toggleUnfoldedState();
}
  

  toggleUnfoldedState() {
    if(this.isUnfolded()) {
      this.isUnfolded.set(false);
    } else {
      this.isUnfolded.set(true);
    }
  }
}
