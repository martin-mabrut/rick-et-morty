import { Component, OnInit, inject, signal } from '@angular/core';
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

  numberOfCharacters = signal<number>(0);
  numberOfEpisodes = signal<number>(0);
  numberOfLocations = signal<number>(0);

  ngOnInit() {
    this.characterService.getCharactersFromService().subscribe((response) => {
      this.numberOfCharacters.set(response.info.count);

      this.episodeService.getEpisodesFromService(1).subscribe((response) => {
        this.numberOfEpisodes.set(response.info.count);

        this.locationService.getLocationsFromService().subscribe((response) => {
          this.numberOfLocations.set(response.info.count);
        })
      })
    });
  }
}

