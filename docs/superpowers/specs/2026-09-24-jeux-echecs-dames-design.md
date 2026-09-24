# Jeux : Échecs & Dames — Document de conception

**Date :** 2026-09-24
**Statut :** validé en discussion, en attente de relecture finale

## 1. Objectif

Une application mobile (Android + iPhone) regroupant deux jeux :

- **Échecs**
- **Dames internationales 10×10** (règles FMJD)

Chaque jeu propose :

- une IA à trois niveaux : **Faible**, **Moyen**, **Expert** — le niveau Expert doit offrir la réflexion la plus forte possible ;
- un **parcours de leçons interactives** qui apprend à jouer à quelqu'un qui ne connaît pas les règles ;
- une **aide en partie réservée au niveau Faible** (débutant) ;
- le jeu **à 2 sur le même téléphone** ;
- le jeu **en ligne entre amis** via un code de partie, sans compte.

Langue de l'interface : **français uniquement**.

## 2. Découpage en étapes

Le projet est construit en trois étapes. Chacune donne une app utilisable et a son propre plan d'implémentation.

| Étape | Contenu | Jouable à la fin ? |
|---|---|---|
| **1. Base + Échecs** | Coquille PWA, plateau commun, moteur de leçons commun, échecs complets (règles, IA 3 niveaux, 17 leçons, aide Faible, 2 joueurs local) | Oui, hors ligne |
| **2. Dames** | Règles internationales, moteur IA maison, 12 leçons, aide Faible, 2 joueurs local | Oui, hors ligne |
| **3. En ligne** | Parties par code, synchronisation temps réel, hébergement public | Oui, avec internet |

L'étape 3 fera l'objet d'une conception détaillée à son démarrage (section 9 = grandes lignes seulement).

## 3. Architecture technique

### 3.1 Type d'application

**PWA (Progressive Web App)** : application web installable sur l'écran d'accueil d'Android et d'iPhone, sans passer par les stores, fonctionnant **hors ligne** (jeu contre l'ordinateur, 2 joueurs local, leçons).

### 3.2 Pile technique

| Élément | Choix | Raison |
|---|---|---|
| Build | Vite 8 + TypeScript | Rapide, standard |
| Interface | Preact 10 | API de React, ~4 Ko : léger sur téléphone |
| PWA / hors ligne | vite-plugin-pwa 1.x | Manifest + service worker générés |
| Règles échecs | chess.js 1.x (BSD-2) | Bibliothèque éprouvée : roque, en passant, promotion, nulles |
| IA échecs | `stockfish` npm 19.x (GPL-3.0), variante **lite single-thread** WASM | Moteur le plus fort au monde ; la variante single-thread ne demande pas d'en-têtes COOP/COEP et marche sur iOS |
| Règles + IA dames | Moteur maison TypeScript | Aucune bibliothèque fiable disponible sur npm |
| En ligne (étape 3) | Supabase (Realtime + Postgres + connexion anonyme) | Pas de serveur à écrire |
| Tests | Vitest (unitaires), Playwright (bout en bout) | |

**Licence :** Stockfish étant sous GPL-3.0, l'application entière est publiée sous **GPL-3.0**. Quand l'app sera mise en ligne (étape 3), son code source sera rendu public (dépôt GitHub).

### 3.3 Interface commune aux jeux

Les deux jeux implémentent la même interface. Le plateau, les leçons, le mode 2 joueurs, l'aide et le jeu en ligne ne dépendent que de cette interface : ils sont écrits une fois et servent aux deux jeux.

```ts
type Color = 'white' | 'black';

type GameStatus =
  | { kind: 'ongoing' }
  | { kind: 'win'; winner: Color; reason: string }   // ex. 'checkmate', 'no-moves'
  | { kind: 'draw'; reason: string };                // ex. 'stalemate', 'repetition'

interface GameAdapter<Pos, Move> {
  id: 'chess' | 'draughts';
  initial(): Pos;
  parse(s: string): Pos;          // FEN échecs / FEN dames
  serialize(p: Pos): string;
  turn(p: Pos): Color;
  legalMoves(p: Pos): Move[];
  play(p: Pos, m: Move): Pos;     // retourne une NOUVELLE position (immuable)
  status(p: Pos): GameStatus;
}

type Level = 'faible' | 'moyen' | 'expert';

interface Engine<Pos, Move> {
  bestMove(p: Pos, level: Level, signal: AbortSignal): Promise<Move>;
  analyse(p: Pos, depth: number): Promise<{ best: Move; scoreCp: number; mateIn?: number }>;
}
```

Les positions exposées à l'interface sont **immuables**. Seule la recherche interne du moteur de dames (dans son Web Worker) utilise des mutations « jouer/déjouer » pour la vitesse ; cela ne sort jamais du worker.

### 3.4 Arborescence

```
Jeux/
  index.html
  src/
    main.tsx
    app/          écrans, navigation, réglages, sauvegarde locale
    core/         interfaces GameAdapter / Engine, types communs
    board/        plateau SVG commun (toucher-déplacer, glisser, animations, sons)
    lessons/      moteur de leçons commun (déroulé, validation des exercices)
    chess/
      adapter.ts          règles via chess.js
      engine/             client + worker Stockfish, réglage des niveaux
      help/               indice, détection de gaffe
      lessons/            données des 17 leçons
    draughts/             (étape 2)
      rules/              plateau, génération des coups, prise maximale
      engine/             recherche, évaluation, table de transposition, worker
      help/
      lessons/
    online/               (étape 3)
  public/                 icônes, fichiers Stockfish (.js + .wasm)
  tests/
    unit/
    e2e/
```

Toute réflexion d'IA se fait dans un **Web Worker** : l'écran ne fige jamais, même en Expert.

## 4. Écrans et parcours

1. **Accueil** — choix : Échecs / Dames.
2. **Menu du jeu**
   - Apprendre à jouer
   - Contre l'ordinateur → Faible / Moyen / Expert, puis choix de la couleur (Blancs / Noirs / Au hasard)
   - 2 joueurs sur ce téléphone
   - En ligne (étape 3)
3. **Liste des leçons** — progression sauvegardée (leçon faite = coche).
4. **Leçon** — explication (2-3 phrases) puis exercices sur le plateau.
5. **Partie**
   - plateau en portrait, retourné si le joueur a les Noirs (contre l'ordinateur) ;
   - dernier coup surligné, roi en échec surligné, choix de la pièce à la promotion ;
   - pièces capturées affichées ;
   - boutons : Abandonner, Nouvelle partie ; au niveau Faible en plus : Indice, Annuler ;
   - indicateur « L'ordinateur réfléchit… » pendant la recherche ;
   - la partie en cours est sauvegardée automatiquement et reprise à la réouverture.
6. **Fin de partie** — résultat + explication en clair (ex. « Échec et mat : ton roi est attaqué et ne peut plus s'échapper »), boutons Rejouer / Menu.

**Réglages** (accessibles depuis l'accueil) : son activé/désactivé. Le thème clair/sombre suit celui du téléphone.

**Interaction :** toucher une pièce puis toucher la case d'arrivée (mode principal), glisser-déposer aussi accepté. Les cases accessibles d'une pièce sélectionnée sont marquées d'un point **à tous les niveaux**.

## 5. Intelligence artificielle

### 5.1 Échecs — Stockfish

| Niveau | Réglage | Force visée |
|---|---|---|
| **Faible** | Recherche courte (profondeur ≤ 5) en MultiPV 4. L'app choisit le meilleur coup ~50 % du temps, sinon un des 3 suivants, et ~10 % du temps un coup aléatoire parmi les coups légaux qui ne perdent pas la dame immédiatement. | ~800-1000 Elo |
| **Moyen** | `UCI_LimitStrength = true`, `UCI_Elo = 1600`, ~1 s par coup | ~1600 Elo (bon joueur de club) |
| **Expert** | Pleine puissance, `movetime 3000` ms | > 2800 Elo sur téléphone |

Un délai minimal d'affichage (~600 ms) évite que l'ordinateur réponde « instantanément » aux niveaux Faible et Moyen, pour un rythme naturel.

### 5.2 Dames — moteur maison (étape 2)

- **Génération des coups** conforme FMJD, avec prise maximale obligatoire.
- **Recherche :** approfondissement itératif, alpha-bêta avec fenêtre principale (PVS), table de transposition (hachage Zobrist), tri des coups (meilleur coup de la table, coups meurtriers, historique), réductions pour les coups tardifs, **recherche de quiescence** qui prolonge tant que des prises sont obligatoires.
- **Évaluation :** matériel (pion = 100, dame ≈ 320), avance et tempo des pions, contrôle du centre, formations solides (pions adossés, bord arrière tenu tôt), pions bloqués, pions qui passent à dame sans pouvoir être arrêtés, bonus de mobilité pour les dames.
- **Niveaux :**

| Niveau | Réglage |
|---|---|
| Faible | profondeur 2, bruit aléatoire important sur l'évaluation, choisit parfois un coup moyen |
| Moyen | profondeur 6, léger bruit |
| Expert | temps de réflexion 3 s, pleine profondeur atteignable |

### 5.3 Aide au niveau Faible (les deux jeux)

- **Indice :** l'app analyse la position du joueur (échecs : Stockfish profondeur 12 ; dames : moteur profondeur 8) et affiche une **flèche** sur le meilleur coup, avec une raison simple quand elle est détectable : « prend une pièce », « donne échec », « met ta pièce attaquée à l'abri », « fait une dame », « mat en 1 ».
- **Alerte gaffe :** avant d'appliquer le coup du joueur, l'app compare l'évaluation avant/après (analyse rapide). Si le coup fait perdre **≥ 200 centipions** (≈ 2 pions) ou permet un mat, une fenêtre explique le danger de façon concrète — la pièce qui devient prenable et par quoi (détection par les attaques/défenses sur la case), ou « l'ordinateur peut faire échec et mat ». Choix : **Jouer quand même** / **Choisir un autre coup**.
- **Annuler :** retire le dernier coup du joueur et la réponse de l'ordinateur.

Aux niveaux Moyen et Expert, en 2 joueurs et en ligne : aucun indice, aucune alerte, pas d'annulation.

## 6. Leçons

### 6.1 Moteur de leçons (commun)

Une leçon est une **donnée** (fichier TypeScript typé), pas du code :

```ts
interface Lesson {
  id: string;
  title: string;
  intro: string[];            // 2-3 phrases
  exercises: Exercise[];      // 1 à 3
}

type Exercise =
  | { kind: 'reach';     position: string; instruction: string; target: string }          // atteindre une case
  | { kind: 'collect';   position: string; instruction: string; stars: string[] }         // ramasser les étoiles avec une pièce
  | { kind: 'find-move'; position: string; instruction: string; solutions: string[];
      wrongMoveHints?: Record<string, string> }                                            // trouver le bon coup
  | { kind: 'mate-in-1'; position: string; instruction: string }                          // valide tout coup qui mate
  | { kind: 'play-out';  position: string; instruction: string; goal: 'win' | 'promote'; level: Level }; // finir contre l'IA
```

En cas d'erreur, l'app affiche l'explication (`wrongMoveHints` ou message générique) et remet la position. Leçon réussie = tous ses exercices réussis.

### 6.2 Parcours échecs (17 leçons, étape 1)

1. Le plateau et le but du jeu
2. La tour
3. Le fou
4. La dame
5. Le roi
6. Le cavalier
7. Le pion (avance, première avance de 2 cases, prise en diagonale)
8. Prendre, et la valeur des pièces (pion 1, cavalier/fou 3, tour 5, dame 9)
9. L'échec et comment en sortir : fuir, bloquer, prendre
10. L'échec et mat (mats en 1)
11. Le pat et la partie nulle
12. Le roque
13. La promotion
14. La prise en passant
15. Bien commencer une partie : centre, développement, roque
16. Tactiques de base : fourchette, clouage, attaque double
17. Mats de base : roi + dame contre roi, roi + tour contre roi

### 6.3 Parcours dames (12 leçons, étape 2)

Le plateau et les cases foncées ; le déplacement du pion ; la prise ; la prise obligatoire ; la prise en arrière ; les rafles ; la règle de la prise maximale ; la promotion ; la dame volante ; la prise par la dame ; la partie nulle ; premiers coups tactiques (sacrifier un pion pour en prendre deux, forcer une rafle adverse).

## 7. Règles — points à respecter

### 7.1 Échecs
Délégués à chess.js : roque, prise en passant, promotion, échec, mat, pat, nulle par répétition triple, règle des 50 coups, matériel insuffisant.

### 7.2 Dames internationales (FMJD)
- Plateau 10×10, 20 pions par camp sur les cases foncées ; cases numérotées 1-50 ; **les Blancs commencent**.
- Le pion avance d'une case en diagonale ; il **prend en avant et en arrière**.
- La prise est **obligatoire** ; on doit prendre le **maximum de pièces** (pion et dame comptent pareil). À égalité, libre choix.
- Les pièces prises sont retirées **après** la rafle complète ; une pièce ne peut pas être sautée deux fois (règle du coup turc).
- Un pion devient dame s'il **termine** son coup sur la dernière rangée ; s'il la traverse pendant une rafle qui continue, il reste pion.
- La dame se déplace et prend à distance sur une diagonale et peut s'arrêter sur n'importe quelle case libre après la pièce prise (sous réserve de la prise maximale).
- **Fin :** un camp perd s'il n'a plus de pièce ou plus de coup possible.
- **Nulle :** répétition triple de la position ; 25 coups consécutifs de dames des deux côtés sans prise ni mouvement de pion ; 3 dames (ou 2 dames + 1 pion, ou 1 dame + 2 pions) contre 1 dame : nulle après 16 coups de chaque camp ; 2 dames contre 1 dame, 1 dame + 1 pion contre 1 dame, ou 1 dame contre 1 dame : nulle après 5 coups de chaque camp.

## 8. Gestion des erreurs

| Situation | Comportement |
|---|---|
| Stockfish ne se charge pas (vieux téléphone, téléchargement interrompu) | Message « L'ordinateur n'a pas pu démarrer » + bouton Réessayer. Le mode 2 joueurs et les leçons sans exercice `play-out` restent utilisables. |
| L'IA ne répond pas à temps (temps prévu + 5 s) | Le worker est arrêté puis relancé ; on redemande un coup à profondeur réduite. Après 2 échecs : message et proposition de sauvegarder/reprendre. |
| Partie sauvegardée illisible ou illégale | Rejetée à la lecture (`parse` + validation), message « La partie précédente n'a pas pu être reprise », nouvelle partie. |
| Stockage indisponible (navigation privée) | L'app fonctionne sans sauvegarde ; petit avertissement unique. |
| Coup reçu invalide (en ligne, étape 3) | Refusé : chaque client revérifie la légalité avec `legalMoves`. |

Les erreurs ne sont jamais avalées en silence : chaque cas ci-dessus affiche un message compréhensible et est journalisé dans la console en développement.

## 9. Jeu en ligne — grandes lignes (étape 3)

- **Identité :** connexion anonyme Supabase (aucun compte, juste un pseudo saisi).
- **Partie :** table `parties` (code à 6 caractères, jeu, position, liste des coups, joueurs, statut, dates). Politiques RLS : seuls les deux joueurs d'une partie peuvent la modifier.
- **Coups :** fonction Postgres `jouer_coup(code, coup)` qui vérifie que c'est bien le tour de ce joueur ; les deux clients vérifient la légalité. Synchronisation par Supabase Realtime ; en cas de déconnexion, l'état est relu depuis la table.
- **Invitation :** lien `…/#/rejoindre/ABC123` partagé via le menu de partage du téléphone (WhatsApp, SMS…).
- **Nettoyage :** parties inactives depuis 7 jours supprimées.
- **Hébergement :** hébergeur statique HTTPS (Vercel, Netlify ou Cloudflare Pages), choisi à l'étape 3.

## 10. Tests

**Unitaires (Vitest), couverture ≥ 80 % sur `core/`, `lessons/`, `chess/`, `draughts/` :**
- adaptateur échecs : coups légaux, statuts de fin (mat, pat, répétition, 50 coups, matériel insuffisant) ;
- dames : **perft** depuis la position initiale (profondeurs 1 à 6 : 9, 81, 658, 4 265, 27 117, 167 140) et cas ciblés — prise maximale, coup turc, promotion en fin de rafle uniquement, prises de dame à distance, règles de nulle ;
- réglage des niveaux, choix de coup au niveau Faible (avec moteur simulé) ;
- détection de raison d'indice et de gaffe (avec évaluations simulées) ;
- **chaque leçon** : positions lisibles, solutions légales, cibles atteignables — un test parcourt toutes les leçons.

**Moteurs (tests lents, lancés à la demande) :**
- échecs Expert : trouve des mats en 2-3 d'une petite batterie de positions ;
- dames Expert : trouve des coups tactiques connus ;
- matchs automatiques : Expert bat Moyen ≥ 9 parties sur 10, Moyen bat Faible ≥ 8 sur 10.

**Bout en bout (Playwright, format mobile) :**
- ouvrir l'app, suivre une leçon jusqu'au bout ;
- jouer une partie contre le niveau Faible (indice, alerte gaffe, annulation) ;
- partie 2 joueurs jusqu'au mat ;
- reprise d'une partie après rechargement ;
- fonctionnement hors ligne après le premier chargement.

## 11. Critères de réussite

- **Étape 1 :** app installable sur Android et iPhone, jouable hors ligne ; échecs contre l'IA aux 3 niveaux, 2 joueurs local, 17 leçons, aide Faible ; tous les tests passent, couverture ≥ 80 %.
- **Étape 2 :** idem pour les dames ; perft conforme.
- **Étape 3 :** deux téléphones jouent une partie complète via un code, y compris après une coupure réseau.

## 12. Hors périmètre

Pendules / cadence, comptes et mots de passe, classement Elo des joueurs, chat, spectateurs, tableau d'analyse, export PGN, autres langues que le français, publication dans les stores, variantes de dames 8×8 et 12×12.
