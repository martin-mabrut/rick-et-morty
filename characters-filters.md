# Filtres de personnages (statut / genre / espèce / type)

Cette fonctionnalité ajoute des boutons cliquables (Alive, Male, Human...) qui filtrent la liste des personnages en interrogeant l'API avec les bons paramètres. Ce document explique l'architecture choisie et le chemin des données entre les fichiers.

## Vue d'ensemble : les fichiers impliqués

```
filter-button.ts / .html        → composant "bête" : affiche un bouton, ne connaît aucune logique métier
        │  (émet un événement "select" avec sa valeur)
        ▼
characters.ts (page)            → SEUL propriétaire de l'état des filtres (signals), décide qui est actif
        │  (appelle le service avec tous les filtres actifs)
        ▼
characters.ts (service)         → construit l'URL avec status/species/type/gender
        │
        ▼
API Rick & Morty                → renvoie les personnages qui correspondent à TOUS les filtres actifs
```

## Décision d'architecture : qui possède l'état "actif" ?

Avant d'écrire le code, un choix important a été fait : **le composant bouton ne sait pas lui-même s'il est actif**. C'est la page parente (`Characters`) qui décide, via un signal par catégorie (`selectedStatus`, `selectedGender`, etc.), et qui transmet l'info au bouton en `input`.

**Pourquoi pas l'inverse (chaque bouton gère son propre état) ?** Parce que la page a de toute façon besoin de connaître l'état de **tous** les boutons pour construire l'URL de la requête API. Si chaque bouton gardait son propre état interne, il faudrait le dupliquer côté page — avec un risque réel de désynchronisation (le bouton affiché "actif" alors que la page a filtré sur autre chose). En centralisant l'état dans la page, il n'existe qu'une seule source de vérité.

Deuxième choix : **un seul filtre actif par catégorie** (comportement "radio", pas "checkbox"). Cliquer sur "Dead" désactive "Alive" s'il était actif. Logique, car l'API Rick & Morty n'accepte qu'**une seule valeur** par paramètre (`?status=alive` OU `?status=dead`, jamais les deux à la fois).

## Étape 1 — Le composant bouton, "bête" et réutilisable

Fichier : `src/app/features/characters/components/filter-button/filter-button.ts`

```ts
export class FilterButton {
  value = input<string>();
  label = input<string>();
  active = input<boolean>();
  select = output<string>();

  emited() {
    const currentValue = this.value();

    if (currentValue === undefined) {
      this.select.emit('');
    } else {
      this.select.emit(currentValue);
    }
  }
}
```

Fichier : `filter-button.html`
```html
<button [class.active]="active()" (click)="emited()">{{ label() }}</button>
```

**Ce qui se passe :**
- Trois `input()` : `value` (la donnée envoyée à l'API, ex. `"alive"`), `label` (le texte affiché, ex. `"Alive"`), `active` (calculé par le parent, sert juste à l'affichage).
- `[class.active]="active()"` : ajoute la classe CSS `active` sur le bouton quand `active()` vaut `true` — c'est ce qui permet de le colorer différemment en CSS (`button.active { background-color: ... }`).
- Au clic, `emited()` lit `this.value()` **une seule fois** dans une variable locale (`currentValue`), pour que TypeScript puisse vérifier son type correctement (piège classique : appeler `this.value()` deux fois ne garantit pas le même résultat aux yeux du compilateur, qui refuserait alors de passer une valeur potentiellement `undefined` à `emit()`, qui attend un `string`).
- `this.select.emit(currentValue)` : le bouton ne fait **rien d'autre** que prévenir son parent. Il ne sait pas ce qu'est un "filtre de statut", il ne connaît même pas `Characters`. C'est ce qui le rend réutilisable pour statut, genre, espèce ou type sans dupliquer de code.

## Étape 2 — L'état des filtres dans la page (`Characters`)

Fichier : `src/app/features/characters/pages/characters/characters.ts`

```ts
export class Characters implements OnInit {
  searchTerm = signal('');
  selectedStatus = signal('');
  selectedSpecies = signal('');
  selectedGender = signal('');
  selectedType = signal('');

  toggleStatus(value: string) {
    if (this.selectedStatus() === value) {
      this.selectedStatus.set('');
    } else {
      this.selectedStatus.set(value);
    }

    this.characterService.getCharactersFromService(1, this.searchTerm(), this.selectedStatus(), this.selectedSpecies(), this.selectedType(), this.selectedGender()).subscribe();
    this.loadCharacters(1, this.searchTerm(), this.selectedStatus(), this.selectedSpecies(), this.selectedType(), this.selectedGender());
  }

  // toggleSpecies, toggleGender, toggleType : exactement le même principe,
  // chacun ne touchant que son propre signal.
}
```

**Ce qui se passe :**
- Un signal par catégorie, initialisé à `''` (chaîne vide = "aucun filtre actif" pour cette catégorie).
- La logique "radio avec désélection" : `if (this.selectedStatus() === value)` compare la valeur **cliquée** à la valeur **déjà active**.
  - Si elles sont égales → l'utilisateur reclique sur le bouton déjà actif → on désactive (`set('')`).
  - Sinon → on active la nouvelle valeur (`set(value)`), ce qui désactive automatiquement l'ancienne puisqu'un seul signal existe par catégorie.
- Ensuite, **on relance les deux fetchs** (`getCharactersFromService` + `loadCharacters`), en repartant à la page 1 (comme pour une nouvelle recherche — voir `search-character-by-name.md`), et en transmettant l'état **actuel de tous les signaux**, pas seulement celui qu'on vient de modifier. C'est indispensable : si un statut ET un genre sont actifs en même temps, il faut que les deux se retrouvent dans la requête, pas seulement le dernier cliqué.
- `toggleSpecies`, `toggleGender`, `toggleType` sont des copies de `toggleStatus`, chacune ne modifiant que son propre signal mais renvoyant systématiquement l'état complet des 4 filtres + la recherche.

**Un point de vigilance appris en cours de route :** `changePage()` et `onSearch()` doivent, elles aussi, transmettre tous les filtres actifs à chaque appel — sinon changer de page ou lancer une recherche pendant qu'un filtre est actif le ferait disparaître silencieusement. Les deux fonctions suivent donc le même schéma que `toggleStatus`.

## Étape 3 — Construire la requête avec plusieurs filtres

Fichier : `src/app/features/characters/services/characters.ts`

```ts
getCharactersFromService(page: number = 1, name?: string, status?: string, species?: string, type?: string, gender?: string): Observable<ApiResponse<Character[]>> {
    let params = new HttpParams();
    params = params.set('page', page);

    if (name && name.trim() !== '') {
      params = params.set('name', name);
    }
    if (status && status.trim() !== '') {
      params = params.set('status', status);
    }
    if (species && species.trim() !== '') {
      params = params.set('species', species);
    }
    if (type && type.trim() !== '') {
      params = params.set('type', type);
    }
    if (gender && gender.trim() !== '') {
      params = params.set('gender', gender);
    }

    return this.http.get<ApiResponse<Character[]>>(this.url, { params })
      .pipe(tap((response) => this.characters.set(response.results)));
  }
```

**Ce qui se passe :** chaque filtre est ajouté **indépendamment** à `HttpParams`, seulement s'il a une valeur non vide. Comme tous les filtres actifs sont combinés dans la même URL (ex: `?status=alive&gender=female&species=human`), l'API applique un **ET logique** entre eux : elle renvoie les personnages qui correspondent à **tous** les critères en même temps, jamais l'un ou l'autre.

`getCharacterFromComponent` (utilisée par `loadCharacters` pour la pagination) est construite exactement de la même façon, en parallèle — c'est le pattern "double fetch" déjà présent dans le projet pour la recherche par nom, simplement étendu aux nouveaux filtres.

## Étape 4 — Le template : une rangée de boutons par catégorie

Fichier : `characters.html`

```html
<div class="mt-8 flex flex-wrap items-center justify-center gap-2">
  <app-filter-button label="Alive" value="alive" [active]="selectedStatus() === 'alive'" (select)="toggleStatus($event)"></app-filter-button>
  <app-filter-button label="Dead" value="dead" [active]="selectedStatus() === 'dead'" (select)="toggleStatus($event)"></app-filter-button>
  <app-filter-button label="Unknown" value="unknown" [active]="selectedStatus() === 'unknown'" (select)="toggleStatus($event)"></app-filter-button>
</div>
```
(la même structure se répète pour genre, espèce, type — voir le fichier complet)

**Ce qui se passe :**
- `[active]="selectedStatus() === 'alive'"` : chaque bouton **calcule lui-même** s'il doit apparaître actif, en comparant son `value` fixe (`'alive'`) au signal courant du parent. Pas besoin que le parent gère une liste d'IDs de boutons actifs — la comparaison suffit, et elle se met à jour automatiquement à chaque changement du signal (réactivité d'Angular).
- `(select)="toggleStatus($event)"` : tous les boutons de la rangée "statut" appellent la même fonction `toggleStatus`, `$event` étant la `value` du bouton cliqué (celle émise par `emited()` dans `FilterButton`, étape 1).

**Cas particulier de `type` :** contrairement à `status`/`gender` (nombre de valeurs fixe et connu par l'API), le champ `type` est un texte libre par personnage (`"Robot"`, `"Parasite"`, souvent vide). Les 4 boutons proposés (Superhuman, Robot, Parasite, Clone) sont une sélection illustrative, pas une liste exhaustive — beaucoup de personnages n'ont aucune de ces valeurs.

## Pièges rencontrés pendant le développement

1. **L'API renvoie une erreur 404 (pas une liste vide) quand aucun personnage ne correspond à la combinaison de filtres.** Ce n'est pas un bug de l'application — c'est le comportement normal de l'API Rick & Morty face à un résultat vide.

2. **Les signaux Angular survivent au hot-reload du serveur de développement.** Pendant les tests, un filtre "genre" avait été temporairement testé avec `toggleStatus` par erreur — même après correction du code, le signal `selectedStatus` gardait la valeur erronée jusqu'à un **rechargement complet de la page** (pas juste le hot-reload automatique). Une piste utile à connaître si le comportement observé dans le navigateur semble contredire ce que dit le code.

3. **Rate-limit (erreur 429) de l'API en cliquant plusieurs fois rapidement.** Chaque clic sur un bouton de filtre déclenche 2 requêtes (le double fetch), en plus des 2 requêtes déjà faites au chargement de la page — quelques clics rapprochés suffisent à dépasser le quota de l'API publique gratuite. Pas un bug de logique, une conséquence du choix (assumé) de garder deux fetchs séparés plutôt qu'un seul.

## Résumé du cheminement complet

1. `Characters` définit un signal par catégorie de filtre, tous initialisés à `''`.
2. Chaque `<app-filter-button>` reçoit sa `value`/`label` fixes, et un `active` calculé en comparant sa valeur au signal correspondant.
3. Un clic fait émettre la valeur du bouton via `select`, capté par `toggleXxx($event)` dans la page.
4. `toggleXxx` bascule le signal concerné (radio avec désélection), puis relance les deux fetchs avec **l'état actuel de tous les filtres** (pas seulement celui qui vient de changer).
5. Le service construit une URL combinant tous les filtres actifs (`&status=...&gender=...`), l'API applique un ET logique entre eux.
6. Le signal `characters` (rempli par le service) et le `@for` dans le template se chargent d'afficher automatiquement le résultat filtré.
