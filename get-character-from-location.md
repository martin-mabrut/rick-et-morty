# Afficher les habitants d'une planète (location)

Cette fonctionnalité affiche la liste des personnages qui vivent sur une planète (`Location`), chargée uniquement **au clic** sur la carte de la planète (pas au chargement de la page, pour ne pas faire des dizaines de requêtes inutiles).

## Vue d'ensemble : les fichiers impliqués

```
location.type.ts                → décrit la forme des données d'une Location (dont residents: string[])
        │
        ▼
location-card.ts / .html        → composant carte, déclenche le chargement au clic
        │  (appelle le service, une seule fois grâce à un cache local)
        ▼
characters.ts (service)         → getCharactersByUrls() : va chercher les personnages en 1 seul appel API
        │
        ▼
location-card.ts                → stocke les personnages reçus, l'affichage se déplie
```

## Étape 1 — Comprendre la donnée de départ

Fichier : `src/app/features/locations/types/location.type.ts`

```ts
export interface Location {
    id: number;
    name: string;
    type: string;
    dimension: string;
    residents: string[];   // <- des URLs, pas des objets Character !
    url: string;
    created: string;
}
```

**Point clé :** l'API Rick & Morty ne renvoie pas la liste des personnages d'une planète directement — elle renvoie une liste d'**URLs** vers ces personnages (ex: `"https://rickandmortyapi.com/api/character/2"`). Il faut donc faire un second appel pour transformer ces URLs en vrais objets `Character` (nom, image, statut...).

## Étape 2 — Déclencher le chargement au clic (lazy loading)

Fichier : `src/app/features/locations/components/location-card/location-card.ts`

```ts
export class LocationCard {
  location = input.required<Location>();
  private readonly charactersService = inject(CharactersService);
  isUnfolded = signal(false);
  residents = signal<Character[]>([]);

  onClicOnLocationCard() {
    if (this.residents().length === 0 && this.location().residents.length > 0) {
      this.charactersService.getCharactersByUrls(this.location().residents)
        .subscribe((response: Character[]) => {
          this.residents.set(response);
        });
    }

    this.toggleUnfoldedState();
  }

  toggleUnfoldedState() {
    if (this.isUnfolded()) {
      this.isUnfolded.set(false);
    } else {
      this.isUnfolded.set(true);
    }
  }
}
```

**Ce qui se passe :**
- `residents = signal<Character[]>([])` : au départ, vide — on n'a encore rien demandé à l'API.
- La condition `if (this.residents().length === 0 && this.location().residents.length > 0)` fait deux choses :
  - `this.residents().length === 0` : **"on n'a pas encore chargé les habitants"** — c'est ce qui rend le chargement *lazy* (paresseux) et le **cache** : si on replie puis redéplie la carte, on ne refait pas d'appel API, `residents` contient déjà les données.
  - `this.location().residents.length > 0` : **"cette planète a effectivement des habitants"** — évite d'appeler l'API avec une liste d'URLs vide si la planète est déserte.
- `toggleUnfoldedState()` est appelée à chaque clic, qu'on ait chargé des données ou non — c'est elle qui gère l'ouverture/fermeture visuelle de la carte (indépendamment du chargement).

Dans le template (`location-card.html`) :
```html
<article (click)="onClicOnLocationCard()">
  ...
  @if (isUnfolded()) {
    <ul class="mt-6">
    @for (character of residents(); track character.id) {
      <li>{{ character.name }}</li>
    }
    </ul>
  }
</article>
```
Le `@if (isUnfolded())` n'affiche la liste que quand la carte est dépliée ; le `@for` boucle sur le signal `residents` — dès que `residents.set(response)` s'exécute (dans `onClicOnLocationCard`), la liste apparaît automatiquement.

## Étape 3 — Récupérer plusieurs personnages en UNE SEULE requête

Fichier : `src/app/features/characters/services/characters.ts`

```ts
getCharactersByUrls(urls: string[]): Observable<Character[]> {
    const idsList: string[] = [];

    for (let i = 0; i < urls.length; i++) {
      const id: string = urls[i].split("/").pop()!;
      idsList.push(id);
    }

    const idsInUrl: string = idsList.join(",");
    const newUrl: string = this.url.concat(idsInUrl);

    return this.http.get<Character[] | Character>(newUrl).pipe(
      map((response) => (Array.isArray(response) ? response : [response]))
    );
  }
```

**Ce qui se passe, étape par étape :**

1. **Extraire l'ID depuis chaque URL.** Une URL ressemble à `.../api/character/2` — `.split("/")` la découpe en morceaux à chaque `/`, et `.pop()` prend le dernier morceau, c'est-à-dire `"2"`. On répète ça pour chaque URL de résident.

2. **Construire une seule URL groupée.** L'API Rick & Morty accepte un endpoint spécial : `GET /character/2,5,8` qui renvoie **plusieurs personnages en un seul appel HTTP**, au lieu de faire une requête par personnage (ce qui serait beaucoup plus lent et pourrait déclencher un rate-limit sur l'API). `idsList.join(",")` transforme `["2", "5", "8"]` en `"2,5,8"`.

3. **Le piège de cet endpoint (et pourquoi le `map` existe) :** l'API se comporte différemment selon le nombre d'IDs demandés :
   - Plusieurs IDs (`/character/2,5,8`) → renvoie un **tableau** `Character[]`.
   - Un seul ID (`/character/2`) → renvoie un **objet unique** `Character`, pas un tableau à un élément !

   Sans précaution, le code qui utilise le résultat (`location-card.ts`) devrait gérer les deux cas différemment. Le `.pipe(map(...))` uniformise ça une bonne fois pour toutes :
   ```ts
   map((response) => (Array.isArray(response) ? response : [response]))
   ```
   `Array.isArray(response)` vérifie si c'est déjà un tableau. Si oui, on le garde tel quel. Sinon (un seul objet), on l'enveloppe dans un tableau `[response]`. Résultat : la fonction renvoie **toujours** un `Character[]`, peu importe combien de résidents la planète a.

**Pourquoi cette fonction ne vérifie pas elle-même si `urls` est vide :** si on l'appelait avec un tableau vide, `idsInUrl` serait une chaîne vide et l'URL retomberait sur `/character/` — l'endpoint de liste complète, pas de recherche par ID — ce qui renverrait la mauvaise donnée. C'est pour ça que l'appelant (`location-card.ts`, étape 2) doit garder son garde-fou `location().residents.length > 0` avant d'appeler cette fonction.

## Résumé du cheminement complet

1. La page `/locations` affiche une grille de `LocationCard`, chacune recevant sa `Location` (avec `residents: string[]`, des URLs) via un `input()`.
2. L'utilisateur clique sur une carte → `onClicOnLocationCard()`.
3. Si les résidents n'ont jamais été chargés ET qu'il y en a : appel à `getCharactersByUrls(location().residents)`.
4. Le service extrait les IDs des URLs, construit une seule URL groupée, fait **un seul appel HTTP**, et normalise la réponse (objet unique ou tableau) en tableau systématiquement.
5. `location-card.ts` stocke le résultat dans son signal `residents`, la carte se déplie, la liste s'affiche.
6. Un second clic ne refait pas d'appel API — les données sont déjà en mémoire dans le signal.
