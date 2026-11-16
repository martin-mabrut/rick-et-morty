# Recherche de personnages par nom

Cette fonctionnalité permet de taper un nom dans une barre de recherche et de voir la liste des personnages se filtrer, sans recharger la page. Ce document suit le chemin complet d'une frappe clavier jusqu'à l'affichage des résultats.

## Vue d'ensemble : les fichiers impliqués

```
search-bar.ts / .html          → composant qui capte ce que l'utilisateur tape
        │  (émet un événement "search")
        ▼
characters.ts (page)           → reçoit l'événement, garde le terme de recherche en mémoire
        │  (appelle le service)
        ▼
characters.ts (service)        → construit la requête HTTP vers l'API
        │
        ▼
API Rick & Morty               → renvoie les personnages qui correspondent
        │
        ▼
characters.ts (page)           → stocke le résultat, l'affichage se met à jour tout seul
```

## Étape 1 — Capter la saisie utilisateur (`SearchBar`)

Fichier : `src/app/features/characters/components/search-bar/search-bar.ts`

```ts
export class SearchBar implements OnInit {
  searchInputed = new FormControl('', { nonNullable: true });
  search = output<string>();

  ngOnInit() {
      this.searchInputed.valueChanges
        .pipe(debounceTime(300), distinctUntilChanged())
        .subscribe((value) => this.search.emit(value));
    }
}
```

**Ce qui se passe :**
- `searchInputed` est un `FormControl` (Reactive Forms) branché sur le champ texte du template (`search-bar.html`) :
  ```html
  <input type="text" [formControl]="searchInputed" placeholder="Rechercher un personnage..." ... />
  ```
- Chaque frappe clavier déclenche `valueChanges`, un flux (Observable) qui envoie la nouvelle valeur du champ.
- `debounceTime(300)` : attend 300ms de silence avant de continuer. Sans ça, on enverrait une requête à l'API à **chaque lettre tapée** — inutile et lourd.
- `distinctUntilChanged()` : n'émet que si la valeur a vraiment changé (évite de relancer une recherche identique).
- `search.emit(value)` : le composant ne fait pas la recherche lui-même — il **prévient le parent** via un `output<string>()`, un événement custom qu'on peut écouter depuis l'extérieur avec `(search)="..."`.

**Pourquoi un composant séparé ?** `SearchBar` ne connaît ni l'API ni la logique de filtrage — il sait juste "capter du texte et le signaler". Ça le rend réutilisable et facile à tester isolément.

## Étape 2 — Le parent réagit à la recherche (`Characters`)

Fichier : `src/app/features/characters/pages/characters/characters.ts`

```ts
export class Characters implements OnInit {
  private readonly characterService = inject(CharactersService);
  readonly characters = this.characterService.characterSignal;
  readonly infos = signal<InfoResponse>({} as InfoResponse);
  currentPage = signal(1);
  totalPage = signal(0);
  searchTerm = signal('');

  onSearch(name: string) {
    this.searchTerm.set(name);
    this.characterService.getCharactersFromService(1, name, ...).subscribe();
    this.loadCharacters(1, name, ...);
  }
}
```

Dans le template (`characters.html`) :
```html
<app-search-bar (search)="onSearch($event)"></app-search-bar>
```

**Ce qui se passe :**
- `(search)="onSearch($event)"` : dès que `SearchBar` émet un événement `search`, Angular appelle `onSearch()` en lui passant la valeur émise (`$event`).
- `this.searchTerm.set(name)` : on **mémorise** le terme de recherche actuel dans un signal. C'est important — la page a besoin de se souvenir de ce qui est recherché pour, par exemple, garder le filtre actif quand on change de page (voir étape 4).
- On repart systématiquement à la **page 1** (`1` en premier argument) : ça n'aurait pas de sens de rester sur la page 3 d'une nouvelle recherche qui n'a peut-être que 2 pages de résultats.
- Deux appels sont faits : `getCharactersFromService` (remplit la liste affichée) et `loadCharacters` → `getCharacterFromComponent` (récupère les infos de pagination). C'est le pattern "double fetch" du projet — volontairement gardé tel quel plutôt que fusionné en un seul appel.

## Étape 3 — Construire la requête HTTP (le service)

Fichier : `src/app/features/characters/services/characters.ts`

```ts
getCharactersFromService(page: number = 1, name?: string, ...): Observable<ApiResponse<Character[]>> {
    let params = new HttpParams();
    params = params.set('page', page);

    if (name && name.trim() !== '') {
      params = params.set('name', name);
    }
    // ... (autres filtres, voir characters-filters.md)

    return this.http.get<ApiResponse<Character[]>>(this.url, { params })
      .pipe(tap((response) => this.characters.set(response.results)));
  }
```

**Ce qui se passe :**
- `HttpParams` construit la partie `?page=1&name=rick` de l'URL, morceau par morceau.
- `if (name && name.trim() !== '')` : on n'ajoute le paramètre `name` que s'il y a vraiment quelque chose à chercher — sinon l'URL resterait `?page=1&name=` ce qui filtrerait sur "rien" au lieu de ne pas filtrer du tout.
- `.pipe(tap(...))` : `tap` laisse passer la réponse sans la modifier, mais en profite pour faire un effet de bord — ici, mettre à jour le signal `characters` avec les résultats reçus (`response.results`).
- **C'est une recherche globale, pas un filtre local** : chaque frappe relance un vrai appel à l'API Rick & Morty, plutôt que de filtrer en JavaScript la liste déjà chargée. Choix volontaire : ça permet de trouver un personnage dans **toute la base**, pas seulement parmi les 20 déjà affichés sur la page courante.

## Étape 4 — Garder la recherche active pendant la pagination

Fichier : `src/app/features/characters/pages/characters/characters.ts`

```ts
changePage(page: number) {
    this.currentPage.set(page);
    this.characterService.getCharactersFromService(page, this.searchTerm(), ...).subscribe();
  }
```

**Ce qui se passe :** quand on clique sur "page 2", on rappelle le service avec `this.searchTerm()` — la valeur mémorisée à l'étape 2. Sans ça, changer de page perdrait silencieusement le filtre de recherche et réafficherait tous les personnages non filtrés.

## Étape 5 — L'affichage se met à jour tout seul

Fichier : `characters.html`

```html
@for(character of characters(); track character.id) {
  <app-character-card [character]="character" />
}
```

**Ce qui se passe :** `characters` est un **signal** (`readonly characters = this.characterService.characterSignal`). Angular observe automatiquement les signaux utilisés dans un template — dès que le service fait `this.characters.set(response.results)` (étape 3), ce `@for` se ré-exécute tout seul avec la nouvelle liste, sans qu'on ait besoin d'appeler manuellement une fonction de rafraîchissement.

## Résumé du cheminement complet

1. L'utilisateur tape "Rick" dans `SearchBar`.
2. Après 300ms sans frappe, `SearchBar` émet `"Rick"` via son `output`.
3. `Characters.onSearch("Rick")` est appelé : mémorise `searchTerm`, repart à la page 1, appelle le service.
4. Le service construit `?page=1&name=Rick`, interroge l'API, et stocke les résultats dans un signal.
5. Le template, qui lit ce signal, se met à jour automatiquement.
6. Si l'utilisateur change de page ensuite, `changePage` renvoie `searchTerm()` pour ne pas perdre le filtre.
