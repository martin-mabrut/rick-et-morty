import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { Character } from '../types/character.type';
import { ApiResponse } from '../../../shared/types/api-response.types';

@Injectable({
  providedIn: 'root',
})
export class CharactersService {
  private readonly http = inject(HttpClient);
  private characters = signal<Character[]>([]);
  readonly characterSignal = this.characters.asReadonly();
  readonly url = 'https://rickandmortyapi.com/api/character/';

  getCharactersFromService(page: number = 1, name?: string): Observable<ApiResponse<Character[]>> {
    let params = new HttpParams();

    if(!name || name.trim() === "") {
      params = params.set('page', page);
    } else {
      params = params.set('page', page).set('name', name);
    }

    return this.http.get<ApiResponse<Character[]>>(this.url, {
        params: params,
      })
      .pipe(tap((response: ApiResponse<Character[]>) => this.characters.set(response.results)));
  }

  getCharacterFromComponent(page: number = 1, name?: string): Observable<ApiResponse<Character[]>> {
    let params = new HttpParams();
    
    if(!name || name.trim() === "") {
      params = params.set('page', page);
    } else {
      params = params.set('page', page).set('name', name);
    }

    return this.http.get<ApiResponse<Character[]>>(this.url, {
      params: params,
    });
  }

  getCharactersByUrls(urls: string[]): Observable<Character[]> {
    const idsList: string[] = [];

    for(let i = 0; i < urls.length; i++) {
      const id: string = urls[i].split("/").pop()!;
      idsList.push(id);
    }

    const idsInUrl: string = idsList.join(",");
    const newUrl: string = this.url.concat(idsInUrl);

    return this.http.get<Character[] | Character>(newUrl).pipe(
      map((response) => (Array.isArray(response) ? response : [response]))
    );
  }
}
