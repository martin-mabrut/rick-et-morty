import { Component,OnInit ,inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CharactersService } from '../characters/services/characters';
import { EpisodesService } from '../episodes/services/episodes';
import { LocationsService } from '../locations/services/locations';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private readonly characterService = inject(CharactersService);
  private readonly episodeService = inject(EpisodesService);
  private readonly locationService = inject(LocationsService);
    
    // 1. Déclaration de la propriété sans 'let'
    numberOfCharacters = signal<number>(0);
    numberOfEpisodes = signal<number>(0);
    numberOfLocations = signal<number>(0);

    ngOnInit() {
      // 2. On souscrit pour attendre que l'API réponde
        this.characterService.getCharactersFromService().subscribe((response) => {
        // 3. On extrait la longueur de la liste
        this.numberOfCharacters.set(response.info.count);
      
      this.episodeService.getEpisodesFromService().subscribe((response) => {
        this.numberOfEpisodes.set(response.info.count);

      this.locationService.getLocationsFromService().subscribe((response) => {
        this.numberOfEpisodes.set(response.info.count);
      })
      })
      });
    }
}

