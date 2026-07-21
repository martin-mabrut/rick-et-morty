import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, forkJoin } from 'rxjs';
import { Location } from '../types/location.type';
import { Character } from '../../characters/types/character.type';
import { ApiResponse } from '../../../shared/types/api-response.types';
import { map, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class LocationsService {
  private readonly http = inject(HttpClient);
  private locations = signal<Location[]>([]);
  readonly locationSignal = this.locations.asReadonly();
  readonly url = 'https://rickandmortyapi.com/api/location';

  getCharacterName(characterUrl: string): Observable<string> {
    return this.http.get<Character>(characterUrl).pipe(
      map((char) => char.name));
  }

  getLocationsFromService(page: number = 1): Observable<ApiResponse<Location[]>> {
  return this.http
    .get<ApiResponse<Location[]>>(this.url, {
      params: { page: page },
    })
    .pipe(
      // 1. On transforme et enrichit d'abord la donnée avec switchMap
      switchMap((response: ApiResponse<Location[]>) => { 
        
        const locationRequests: Observable<Location>[] = response.results.map((location: Location) => {
          const urlsToFetch: string[] = location.residents || [];

          const characterRequests: Observable<string>[] = urlsToFetch.map((url: string) => this.getCharacterName(url));
          
          return forkJoin(characterRequests).pipe(
            map((names: string[]): Location => ({
              ...location,
              characterNames: names
            }))
          );
        });

        return forkJoin(locationRequests).pipe(
          map((enrichedLocations: Location[]): ApiResponse<Location[]> => ({
            ...response,
            results: enrichedLocations,
          }))
        );
      }),
      // 2. C'EST ICI qu'on met à jour le Signal, UNE FOIS que tout est enrichi !
      tap((response: ApiResponse<Location[]>) => this.locations.set(response.results))
    );
}

  getLocationFromComponent(page: number = 1): Observable<ApiResponse<Location[]>> {
    return this.http.get<ApiResponse<Location[]>>(this.url, {
      params: { page: page },
    });
  }

}
