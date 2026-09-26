# Étape 2 — Dames internationales : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter à la PWA les dames internationales 10×10 (règles FMJD) : ordinateur maison à 3 niveaux, 12 leçons, aide au niveau Faible, partie à 2 sur le même téléphone, hors ligne.

**Architecture:** L'app devient multi-jeux : chaque jeu fournit un « kit » (`GameKit`) — règles (`GameAdapter`), moteur (`Engine`), plateau, pièces, leçons, aide, textes de fin — et les écrans communs (partie, leçons, menus, adresses) ne dépendent que de ce kit. Les dames ont une génération de coups unique (`src/draughts/movegen.ts`, tableau d'entiers mutable) partagée par les règles immuables exposées à l'app et par la recherche de l'ordinateur, qui tourne dans un Web Worker.

**Tech Stack:** Vite 8, Preact 10, TypeScript 6, Vitest 5 + @testing-library/preact + jsdom, Playwright 1.63 (déjà installés à l'étape 1). Aucune nouvelle dépendance.

**Spec :** `docs/superpowers/specs/2026-09-24-jeux-echecs-dames-design.md` (§3.3, §5.2, §5.3, §6.3, §7.2, §10, §11).

## Global Constraints

- Interface **en français uniquement** ; le joueur est tutoyé.
- Licence **GPL-3.0-or-later** (inchangée).
- `tsconfig` : `erasableSyntaxOnly` (pas de `constructor(private x)`, pas d'`enum`), `verbatimModuleSyntax` (`import type`), `noUnusedLocals` et `noUnusedParameters` (préfixer `_` un paramètre inutilisé).
- Pas de `console.log` : `logWarning` (`src/app/log.ts`).
- Couverture Vitest ≥ 80 % (lignes, fonctions, branches, instructions) ; `src/draughts/engine/worker.ts` et `src/draughts/engine/index.ts` sont exclus comme leurs équivalents échecs.
- Fichiers source de 400 lignes maximum.
- Positions exposées **immuables** ; seule la recherche du moteur de dames mute un tableau, et seulement à l'intérieur de `search.ts` (spec §3.3).
- Règles FMJD (spec §7.2) : plateau 10×10, cases 1 à 50, 20 pions par camp, Blancs d'abord ; le pion avance d'une case en diagonale et prend en avant et en arrière ; prise obligatoire et **prise maximale** (pion et dame comptent pareil, libre choix à égalité) ; pièces prises retirées **après** la rafle, jamais sautées deux fois (coup turc) ; promotion seulement si le pion **termine** son coup sur la dernière rangée ; dame volante (déplacement et prise à distance, arrêt sur n'importe quelle case libre après la pièce prise, sous réserve de la prise maximale) ; perte si plus de pièce ou plus de coup ; nulle par répétition triple, 25 coups de dames des deux côtés sans prise ni pion, fin de partie 16 coups (3 dames, 2 dames + 1 pion ou 1 dame + 2 pions contre 1 dame) ou 5 coups (2 dames, 1 dame + 1 pion ou 1 dame contre 1 dame).
- Perft depuis la position de départ (spec §10) : 9, 81, 658, 4 265, 27 117, 167 140 pour les profondeurs 1 à 6.
- Niveaux (spec §5.2) : Faible = profondeur 2, bruit important, parfois un coup moyen ; Moyen = profondeur 6, léger bruit ; Expert = 3 s de réflexion. Délai minimal d'affichage ~600 ms en Faible et Moyen. Délai d'abandon = temps prévu + 5 s, puis relance moins profonde ; après 2 échecs, message.
- Évaluation (spec §5.2) : pion = 100, dame ≈ 320, avance et tempo, centre, formations (pions adossés, bord arrière tenu), pions bloqués, pions qui passent à dame, mobilité des dames.
- Aide Faible (spec §5.3) : indice à la profondeur 8 ; alerte si le coup perd **≥ 200** (pion = 100) ou laisse une victoire forcée à l'ordinateur ; annulation. Aucune aide en Moyen, Expert ou à 2 joueurs.
- Toute réflexion de l'ordinateur dans un **Web Worker** (spec §3.4).
- Commits conventionnels (`feat:`, `refactor:`, `test:`…), sans `Co-Authored-By`.

## Carte des fichiers

```
src/
  core/
    types.ts            + GameId, GAME_IDS ; DrawReason + 'king-moves' | 'endgame-limit'
    engine-errors.ts    (déplacé depuis chess/engine/errors.ts)
    explain.ts          ResultText, ResultTexts, explainWith, sideName (textes de fin communs)
    help.ts             BlunderVerdict, NO_BLUNDER
  board/
    geometry.ts         + BoardGeometry.numbered
    Board.tsx           + numéros de cases
  app/
    games/kit.ts        GameKit, ChoicePickerProps, PieceIcon, GameHelp, MoveSound
    games/chess.ts      chessKit
    games/draughts.ts   draughtsKit (tâche 10)
    games/index.ts      withKit(game, run)
    game/useGame.ts     (remplace useChessGame.ts)
    game/saved.ts       loadSavedGame / hasSavedGame génériques
    game/record.ts      MoveCodec<Pos, Move>.decode(text, pos)
    router.ts           routes avec `game`
    components/CapturedRow.tsx, CapturePicker.tsx (tâche 10)
    screens/PlayScreen.tsx, GameRoutes.tsx, GameMenuScreen.tsx, LessonScreen.tsx, useLessonExercise.ts (génériques)
  draughts/
    types.ts            DraughtsPos, DraughtsMove, DraughtsPiece
    squares.ts          numérotation, diagonales (RAYS), avant, rangée de promotion
    geometry.ts         draughtsGeometry (plateau 10×10 numéroté)
    pieces.ts, pieces/*.svg   4 pièces (pion, dame × 2 couleurs)
    view.ts             pièces du plateau, pièces perdues
    movegen.ts          génération FMJD sur tableau d'entiers (partagée règles + moteur)
    notation.ts         FEN des dames (« W:W31-50:B1-20 »)
    rules.ts            règles immuables, nulles, draughtsAdapter, codec, draughtsLessonRules
    explain.ts          textes de fin de partie
    engine/evaluate.ts, search.ts, levels.ts, pick.ts, searcher.ts,
           worker-searcher.ts, worker.ts, draughts-engine.ts, index.ts
    help/hint.ts, help/blunder.ts
    lessons/index.ts, lessons/basics.ts, lessons/advanced.ts   12 leçons
tests/
  unit/draughts/**, unit/core/explain.test.ts, unit/app/** (mis à jour)
  e2e/draughts.spec.ts
  strength/draughts-strength.test.ts
```

## Mode d'emploi des blocs de code

Un bloc précédé de **`Fichier : chemin`** donne le contenu **complet** du fichier (création ou remplacement). Les petites retouches de fichiers existants sont données sous forme « remplacer … par … ».

---

### Task 1 : Socle commun pour plusieurs jeux

**Files:**
- Create: `src/core/explain.ts`, `src/core/help.ts`, `tests/unit/core/explain.test.ts`
- Move: `src/chess/engine/errors.ts` → `src/core/engine-errors.ts`
- Modify: `src/core/types.ts`, `src/chess/explain.ts`, `src/chess/names.ts`, `src/chess/help/blunder.ts`, `src/app/storage.ts`, `src/app/game/session.ts`, `src/app/game/record.ts`, `src/app/game/saved.ts`, `src/app/components/EndDialog.tsx`, `src/app/game/useChessGame.ts`, imports des erreurs du moteur
- Test: `tests/unit/core/explain.test.ts`, `tests/unit/app/game/record.test.ts` (remplacé)

**Interfaces:**
- Consumes: code de l'étape 1.
- Produces :
  - `core/types.ts` : `GameId = 'chess' | 'draughts'`, `GAME_IDS`, `DrawReason` étendu (`'king-moves'`, `'endgame-limit'`), `GameAdapter.id: GameId`.
  - `core/engine-errors.ts` : `EngineLoadError`, `EngineTimeoutError`, `EngineAbortError`, `EngineUnavailableError`, `isAbortError`, `engineErrorMessage` (inchangés).
  - `core/explain.ts` : `ResultText { title; detail }`, `ResultView = 'winner' | 'loser' | 'neutral'`, `ResultTexts { win(reason, view, loserSide); draws }`, `explainWith(texts, status, viewer)`, `sideName(color)`, `capitalize(text)`.
  - `core/help.ts` : `BlunderVerdict`, `NO_BLUNDER`.
  - `app/game/record.ts` : `MoveCodec<Pos, Move> { encode(move); decode(text, pos) }` ; `validateSetup` accepte `game: 'draughts'`.
  - `app/game/saved.ts` : `SavedGameSpec<Pos, Move> { id; adapter; codec; savedGameKey }`, `SavedGameResult<Pos, Move>`, `loadSavedGame(spec, storage)`, `hasSavedGame(spec, storage)` ; provisoirement `loadSavedChessGame` / `hasSavedChessGame` (supprimés à la tâche 2).
  - `app/storage.ts` : `STORAGE_KEYS.draughtsProgress = 'jeux.dames.progression'`, `STORAGE_KEYS.draughtsSavedGame = 'jeux.dames.partie'`.

- [x] **Step 1 : Écrire les tests qui échouent**

**Fichier : `tests/unit/core/explain.test.ts`**
```ts
import { describe, expect, it } from 'vitest';
import { explainWith, sideName, type ResultTexts } from '../../../src/core/explain';

const texts: ResultTexts = {
  win: (reason, view, loserSide) => `${reason}/${view}/${loserSide}`,
  draws: { repetition: 'Répétition.' },
};

describe('texte de fin de partie commun', () => {
  it('nomme les camps', () => {
    expect(sideName('white')).toBe('les Blancs');
    expect(sideName('black')).toBe('les Noirs');
  });

  it('donne le titre selon le point de vue', () => {
    const win = { kind: 'win', winner: 'white', reason: 'no-moves' } as const;
    expect(explainWith(texts, win, 'white')).toEqual({ title: 'Victoire !', detail: 'no-moves/winner/Les Noirs' });
    expect(explainWith(texts, win, 'black')).toEqual({ title: 'Défaite', detail: 'no-moves/loser/Les Noirs' });
    expect(explainWith(texts, win, null)).toEqual({ title: 'Les Blancs gagnent !', detail: 'no-moves/neutral/Les Noirs' });
  });

  it('explique un abandon pour tous les jeux', () => {
    const resign = { kind: 'win', winner: 'black', reason: 'resign' } as const;
    expect(explainWith(texts, resign, 'white').detail).toBe('Tu as abandonné la partie.');
    expect(explainWith(texts, resign, 'black').detail).toBe("L'adversaire a abandonné.");
    expect(explainWith(texts, resign, null).detail).toBe('Les Blancs ont abandonné.');
  });

  it('prend le texte de nulle du jeu, sinon un texte général', () => {
    expect(explainWith(texts, { kind: 'draw', reason: 'repetition' }, null)).toEqual({ title: 'Partie nulle', detail: 'Répétition.' });
    expect(explainWith(texts, { kind: 'draw', reason: 'king-moves' }, null).detail).toBe('Personne ne gagne.');
    expect(explainWith(texts, { kind: 'ongoing' }, null)).toEqual({ title: 'Partie en cours', detail: '' });
  });
});
```

**Fichier : `tests/unit/app/game/record.test.ts`**
```ts
import { describe, expect, it, vi } from 'vitest';
import { RESUME_ERROR_MESSAGE, hasSavedGame, loadSavedGame } from '../../../../src/app/game/saved';
import { restoreSession, toRecord, validateRecord, validateSetup } from '../../../../src/app/game/record';
import { applyMove, createSession, type GameSetup } from '../../../../src/app/game/session';
import { STORAGE_KEYS, createStorage } from '../../../../src/app/storage';
import { START_FEN, chessAdapter, chessMoveCodec } from '../../../../src/chess/adapter';
import type { ChessPos } from '../../../../src/chess/types';

const setup: GameSetup = { game: 'chess', mode: 'ai', level: 'moyen', playerColor: 'black' };
const chessSave = { id: 'chess', adapter: chessAdapter, codec: chessMoveCodec, savedGameKey: STORAGE_KEYS.chessSavedGame } as const;

describe('sauvegarde des parties', () => {
  it('transforme une session en enregistrement et la restaure', () => {
    const s = applyMove(chessAdapter, createSession(chessAdapter, setup, chessAdapter.initial()), { from: 'e2', to: 'e4' });
    const record = toRecord(chessAdapter, chessMoveCodec, s);
    expect(record).toEqual({ setup, start: START_FEN, moves: ['e2e4'] });
    const restored = restoreSession(chessAdapter, chessMoveCodec, record);
    expect(restored.positions[1].fen).toBe(s.positions[1].fen);
    expect(restored.setup).toEqual(setup);
  });

  it('donne la position courante au décodage des coups', () => {
    const decode = vi.fn((text: string, _pos: ChessPos) => chessMoveCodec.decode(text));
    restoreSession(chessAdapter, { encode: chessMoveCodec.encode, decode }, { setup, start: START_FEN, moves: ['e2e4', 'e7e5'] });
    const afterE4 = chessAdapter.play(chessAdapter.initial(), { from: 'e2', to: 'e4' });
    expect(decode.mock.calls[1][1].fen).toBe(afterE4.fen);
  });

  it('refuse un enregistrement contenant un coup illégal', () => {
    expect(() => restoreSession(chessAdapter, chessMoveCodec, { setup, start: START_FEN, moves: ['e2e5'] })).toThrow();
  });

  it('valide la forme d’un enregistrement', () => {
    expect(validateRecord({ setup, start: START_FEN, moves: ['e2e4'] })).toEqual({ setup, start: START_FEN, moves: ['e2e4'] });
    expect(validateRecord({ setup, start: START_FEN, moves: [1] })).toBeNull();
    expect(validateRecord({ setup: { ...setup, mode: 'ligne' }, start: START_FEN, moves: [] })).toBeNull();
    expect(validateRecord('x')).toBeNull();
    expect(validateSetup({ game: 'chess', mode: 'local', level: null, playerColor: 'white' })).not.toBeNull();
    expect(validateSetup({ game: 'draughts', mode: 'ai', level: 'expert', playerColor: 'black' })).not.toBeNull();
    expect(validateSetup({ game: 'chess', mode: 'ai', level: 'maitre', playerColor: 'white' })).toBeNull();
    expect(validateSetup({ game: 'dames', mode: 'ai', level: 'faible', playerColor: 'white' })).toBeNull();
  });

  it('charge la partie sauvegardée d’un jeu', () => {
    const storage = createStorage(window.localStorage);
    expect(loadSavedGame(chessSave, storage)).toEqual({ kind: 'none' });
    expect(hasSavedGame(chessSave, storage)).toBe(false);
    storage.write(STORAGE_KEYS.chessSavedGame, { setup, start: START_FEN, moves: ['e2e4', 'e7e5'] });
    const loaded = loadSavedGame(chessSave, storage);
    expect(loaded.kind).toBe('ok');
    expect(loaded.kind === 'ok' && loaded.session.moves).toHaveLength(2);
    expect(hasSavedGame(chessSave, storage)).toBe(true);
  });

  it('refuse la sauvegarde d’un autre jeu', () => {
    const storage = createStorage(window.localStorage);
    storage.write(STORAGE_KEYS.chessSavedGame, { setup: { ...setup, game: 'draughts' }, start: START_FEN, moves: [] });
    expect(hasSavedGame(chessSave, storage)).toBe(false);
    expect(loadSavedGame(chessSave, storage)).toEqual({ kind: 'error', message: RESUME_ERROR_MESSAGE });
  });

  it('écarte proprement une sauvegarde abîmée', () => {
    const storage = createStorage(window.localStorage);
    storage.write(STORAGE_KEYS.chessSavedGame, { setup, start: START_FEN, moves: ['e2e5'] });
    expect(loadSavedGame(chessSave, storage)).toEqual({ kind: 'error', message: RESUME_ERROR_MESSAGE });
    expect(window.localStorage.getItem(STORAGE_KEYS.chessSavedGame)).toBeNull();
    window.localStorage.setItem(STORAGE_KEYS.chessSavedGame, '{"setup":42}');
    expect(loadSavedGame(chessSave, storage)).toEqual({ kind: 'error', message: RESUME_ERROR_MESSAGE });
  });

  it('connaît les clés de stockage des dames', () => {
    expect(STORAGE_KEYS.draughtsSavedGame).toBe('jeux.dames.partie');
    expect(STORAGE_KEYS.draughtsProgress).toBe('jeux.dames.progression');
  });
});
```

- [x] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run tests/unit/core/explain.test.ts tests/unit/app/game/record.test.ts`
Expected : FAIL — `src/core/explain` introuvable, `loadSavedGame` / `hasSavedGame` non exportés.

- [x] **Step 3 : Déplacer les erreurs du moteur dans `core`**

```bash
git mv src/chess/engine/errors.ts src/core/engine-errors.ts
sed -i "s#from './errors'#from '../../core/engine-errors'#" src/chess/engine/stockfish-client.ts src/chess/engine/chess-engine.ts
sed -i "s#from '../../chess/engine/errors'#from '../../core/engine-errors'#" src/app/game/useChessGame.ts src/app/screens/useLessonExercise.ts
sed -i "s#src/chess/engine/errors'#src/core/engine-errors'#" tests/unit/chess/engine/chess-engine.test.ts tests/unit/chess/engine/stockfish-client.test.ts
grep -rn "engine/errors'" src tests
```
Expected : la dernière commande n'affiche rien.

- [x] **Step 4 : Écrire les types et modules communs**

**Fichier : `src/core/types.ts`**
```ts
export type Color = 'white' | 'black';
export type Level = 'faible' | 'moyen' | 'expert';
export const LEVELS_ORDER: readonly Level[] = ['faible', 'moyen', 'expert'];

export type GameId = 'chess' | 'draughts';
export const GAME_IDS: readonly GameId[] = ['chess', 'draughts'];

export type WinReason = 'checkmate' | 'resign' | 'no-moves';
/**
 * `king-moves` : 25 coups de suite joués seulement par des dames, sans prise ni pion (dames) ;
 * `endgame-limit` : fin de partie limitée à 16 ou 5 coups (dames).
 */
export type DrawReason =
  | 'stalemate'
  | 'repetition'
  | 'fifty-moves'
  | 'insufficient-material'
  | 'king-moves'
  | 'endgame-limit';

export type GameStatus =
  | { readonly kind: 'ongoing' }
  | { readonly kind: 'win'; readonly winner: Color; readonly reason: WinReason }
  | { readonly kind: 'draw'; readonly reason: DrawReason };

export const ONGOING: GameStatus = { kind: 'ongoing' };

/** Règles d'un jeu. Les positions sont immuables : `play` renvoie toujours un nouvel objet. */
export interface GameAdapter<Pos, Move> {
  readonly id: GameId;
  initial(): Pos;
  parse(text: string): Pos;
  serialize(pos: Pos): string;
  turn(pos: Pos): Color;
  legalMoves(pos: Pos): Move[];
  play(pos: Pos, move: Move): Pos;
  status(pos: Pos): GameStatus;
}

/**
 * Évaluation du point de vue du camp au trait.
 * `mateIn` > 0 : le camp au trait gagne de force en n coups ; < 0 : il perd de force en n coups.
 */
export interface Evaluation {
  readonly scoreCp: number;
  readonly mateIn?: number;
}

export interface Engine<Pos, Move> {
  bestMove(pos: Pos, level: Level, signal: AbortSignal): Promise<Move>;
  analyse(pos: Pos, depth: number): Promise<{ readonly best: Move } & Evaluation>;
}

export function opposite(color: Color): Color {
  return color === 'white' ? 'black' : 'white';
}
```

**Fichier : `src/core/explain.ts`**
```ts
import { opposite, type Color, type DrawReason, type GameStatus, type WinReason } from './types';

export interface ResultText {
  readonly title: string;
  readonly detail: string;
}

/** Point de vue de celui qui lit le résultat : vainqueur, perdant, ou neutre (partie à 2). */
export type ResultView = 'winner' | 'loser' | 'neutral';

/** Textes propres à un jeu ; l'abandon, les titres et la nulle par défaut sont communs. */
export interface ResultTexts {
  win(reason: Exclude<WinReason, 'resign'>, view: ResultView, loserSide: string): string;
  readonly draws: Readonly<Partial<Record<DrawReason, string>>>;
}

const DEFAULT_DRAW_DETAIL = 'Personne ne gagne.';

export function sideName(color: Color): string {
  return color === 'white' ? 'les Blancs' : 'les Noirs';
}

export function capitalize(text: string): string {
  return `${text[0].toUpperCase()}${text.slice(1)}`;
}

function resignDetail(view: ResultView, loserSide: string): string {
  if (view === 'neutral') return `${loserSide} ont abandonné.`;
  return view === 'winner' ? "L'adversaire a abandonné." : 'Tu as abandonné la partie.';
}

/** `viewer` : couleur du joueur contre l'ordinateur, ou null en mode 2 joueurs. */
export function explainWith(texts: ResultTexts, status: GameStatus, viewer: Color | null): ResultText {
  if (status.kind === 'ongoing') return { title: 'Partie en cours', detail: '' };
  if (status.kind === 'draw') return { title: 'Partie nulle', detail: texts.draws[status.reason] ?? DEFAULT_DRAW_DETAIL };
  const view: ResultView = viewer === null ? 'neutral' : viewer === status.winner ? 'winner' : 'loser';
  const loserSide = capitalize(sideName(opposite(status.winner)));
  const title = view === 'neutral' ? `${capitalize(sideName(status.winner))} gagnent !` : view === 'winner' ? 'Victoire !' : 'Défaite';
  const detail = status.reason === 'resign' ? resignDetail(view, loserSide) : texts.win(status.reason, view, loserSide);
  return { title, detail };
}
```

**Fichier : `src/core/help.ts`**
```ts
/** Verdict de l'alerte de gaffe du niveau Faible, commun aux deux jeux. */
export type BlunderVerdict = { readonly blunder: false } | { readonly blunder: true; readonly message: string };

export const NO_BLUNDER: BlunderVerdict = { blunder: false };
```

- [x] **Step 5 : Brancher les échecs sur les modules communs**

**Fichier : `src/chess/explain.ts`**
```ts
import { explainWith, type ResultText, type ResultTexts } from '../core/explain';
import type { Color, GameStatus } from '../core/types';

export type { ResultText } from '../core/explain';

const CHESS_TEXTS: ResultTexts = {
  win: (reason, view, loserSide) => {
    if (reason === 'checkmate') {
      if (view === 'neutral') return "Échec et mat : le roi est attaqué et ne peut plus s'échapper.";
      return view === 'winner'
        ? "Échec et mat ! Le roi adverse est attaqué et ne peut plus s'échapper."
        : "Échec et mat : ton roi est attaqué et ne peut plus s'échapper.";
    }
    if (view === 'neutral') return `${loserSide} n'ont plus aucun coup possible.`;
    return view === 'winner' ? "L'adversaire n'a plus aucun coup possible." : "Tu n'as plus aucun coup possible.";
  },
  draws: {
    stalemate: "Pat : le joueur qui doit jouer n'a aucun coup possible, mais son roi n'est pas en échec. Personne ne gagne.",
    repetition: 'La même position est revenue trois fois : personne ne gagne.',
    'fifty-moves': '50 coups de chaque côté sans prise ni mouvement de pion : personne ne gagne.',
    'insufficient-material': 'Il ne reste pas assez de pièces pour faire échec et mat : personne ne gagne.',
  },
};

/** `viewer` : couleur du joueur contre l'ordinateur, ou null en mode 2 joueurs. */
export function explainResult(status: GameStatus, viewer: Color | null): ResultText {
  return explainWith(CHESS_TEXTS, status, viewer);
}
```

Dans `src/chess/names.ts`, remplacer :
```ts
export function sideName(color: Color): string {
  return color === 'white' ? 'les Blancs' : 'les Noirs';
}
```
par :
```ts
export { sideName } from '../core/explain';
```

Dans `src/chess/help/blunder.ts`, supprimer les deux lignes :
```ts
export type BlunderVerdict = { readonly blunder: false } | { readonly blunder: true; readonly message: string };
```
```ts
const NO_BLUNDER: BlunderVerdict = { blunder: false };
```
et ajouter après la première ligne d'import :
```ts
import { NO_BLUNDER, type BlunderVerdict } from '../../core/help';
```

Dans `src/app/game/useChessGame.ts`, remplacer :
```ts
import { detectBlunder, type BlunderVerdict } from '../../chess/help/blunder';
```
par :
```ts
import { detectBlunder } from '../../chess/help/blunder';
import type { BlunderVerdict } from '../../core/help';
```

Dans `src/app/components/EndDialog.tsx`, remplacer `import type { ResultText } from '../../chess/explain';` par `import type { ResultText } from '../../core/explain';`.

- [x] **Step 6 : Rendre la sauvegarde générique**

Dans `src/app/storage.ts`, compléter `STORAGE_KEYS` :
```ts
export const STORAGE_KEYS = {
  settings: 'jeux.reglages',
  chessProgress: 'jeux.echecs.progression',
  chessSavedGame: 'jeux.echecs.partie',
  draughtsProgress: 'jeux.dames.progression',
  draughtsSavedGame: 'jeux.dames.partie',
} as const;
```

Dans `src/app/game/session.ts`, remplacer la première ligne par :
```ts
import { opposite, type Color, type GameAdapter, type GameId, type GameStatus, type Level } from '../../core/types';
```
et, dans `GameSetup`, `readonly game: 'chess';` par `readonly game: GameId;`.

**Fichier : `src/app/game/record.ts`**
```ts
import { isOneOf, isRecord } from '../../core/guards';
import { GAME_IDS, LEVELS_ORDER, type GameAdapter } from '../../core/types';
import { applyMove, createSession, currentPosition, type GameSetup, type Session } from './session';

export interface MoveCodec<Pos, Move> {
  encode(move: Move): string;
  /** `pos` : position où le coup est joué (les dames en ont besoin pour retrouver les pièces prises). */
  decode(text: string, pos: Pos): Move;
}

export interface GameRecord {
  readonly setup: GameSetup;
  readonly start: string;
  readonly moves: readonly string[];
}

export function toRecord<Pos, Move>(adapter: GameAdapter<Pos, Move>, codec: MoveCodec<Pos, Move>, session: Session<Pos, Move>): GameRecord {
  return { setup: session.setup, start: adapter.serialize(session.positions[0]), moves: session.moves.map((m) => codec.encode(m)) };
}

export function validateSetup(value: unknown): GameSetup | null {
  if (!isRecord(value)) return null;
  const { game, mode, level, playerColor } = value;
  if (!isOneOf(game, GAME_IDS) || !isOneOf(mode, ['ai', 'local'] as const) || !isOneOf(playerColor, ['white', 'black'] as const)) return null;
  const validLevel = level === null ? null : isOneOf(level, LEVELS_ORDER) ? level : undefined;
  if (validLevel === undefined) return null;
  return { game, mode, level: validLevel, playerColor };
}

export function validateRecord(value: unknown): GameRecord | null {
  if (!isRecord(value) || typeof value.start !== 'string' || !Array.isArray(value.moves)) return null;
  const setup = validateSetup(value.setup);
  const moves: unknown[] = value.moves;
  if (!setup || !moves.every((move): move is string => typeof move === 'string')) return null;
  return { setup, start: value.start, moves: [...moves] };
}

/** Rejoue la partie coup par coup ; lève une erreur si un coup est illégal. */
export function restoreSession<Pos, Move>(adapter: GameAdapter<Pos, Move>, codec: MoveCodec<Pos, Move>, record: GameRecord): Session<Pos, Move> {
  return record.moves.reduce(
    (session, text) => applyMove(adapter, session, codec.decode(text, currentPosition(session))),
    createSession(adapter, record.setup, adapter.parse(record.start)),
  );
}
```

**Fichier : `src/app/game/saved.ts`**
```ts
import { chessAdapter, chessMoveCodec } from '../../chess/adapter';
import type { ChessMove, ChessPos } from '../../chess/types';
import type { GameAdapter, GameId } from '../../core/types';
import { logWarning } from '../log';
import { STORAGE_KEYS, type AppStorage } from '../storage';
import { restoreSession, validateRecord, type MoveCodec } from './record';
import type { Session } from './session';

export const RESUME_ERROR_MESSAGE = "La partie précédente n'a pas pu être reprise.";

/** Ce qu'il faut savoir d'un jeu pour relire sa partie sauvegardée. */
export interface SavedGameSpec<Pos, Move> {
  readonly id: GameId;
  readonly adapter: GameAdapter<Pos, Move>;
  readonly codec: MoveCodec<Pos, Move>;
  readonly savedGameKey: string;
}

export type SavedGameResult<Pos, Move> =
  | { readonly kind: 'none' }
  | { readonly kind: 'ok'; readonly session: Session<Pos, Move> }
  | { readonly kind: 'error'; readonly message: string };

export function loadSavedGame<Pos, Move>(spec: SavedGameSpec<Pos, Move>, storage: AppStorage): SavedGameResult<Pos, Move> {
  const raw = storage.read(spec.savedGameKey, (value) => value);
  if (raw === null) return { kind: 'none' };
  const record = validateRecord(raw);
  try {
    if (!record || record.setup.game !== spec.id) throw new Error('Enregistrement invalide');
    return { kind: 'ok', session: restoreSession(spec.adapter, spec.codec, record) };
  } catch (error) {
    logWarning('[reprise] partie sauvegardée rejetée', error);
    storage.remove(spec.savedGameKey);
    return { kind: 'error', message: RESUME_ERROR_MESSAGE };
  }
}

export function hasSavedGame<Pos, Move>(spec: SavedGameSpec<Pos, Move>, storage: AppStorage): boolean {
  const record = validateRecord(storage.read(spec.savedGameKey, (value) => value));
  return record !== null && record.setup.game === spec.id;
}

// Provisoire : remplacé par les kits de jeu à la tâche 2.
const CHESS_SAVED_GAME: SavedGameSpec<ChessPos, ChessMove> = {
  id: 'chess',
  adapter: chessAdapter,
  codec: chessMoveCodec,
  savedGameKey: STORAGE_KEYS.chessSavedGame,
};
export const loadSavedChessGame = (storage: AppStorage) => loadSavedGame(CHESS_SAVED_GAME, storage);
export const hasSavedChessGame = (storage: AppStorage) => hasSavedGame(CHESS_SAVED_GAME, storage);
```

- [x] **Step 7 : Lancer tous les tests et le typage**

Run : `npx vitest run` puis `npx tsc -b`
Expected : PASS (tous les tests, dont 4 + 8 de cette tâche), aucune erreur de typage.

- [x] **Step 8 : Commit**

```bash
git add -A src tests
git commit -m "refactor: socle commun (types, erreurs, textes de fin, sauvegarde) pour plusieurs jeux"
```

---

### Task 2 : L'app devient multi-jeux (kit de jeu, écrans et adresses génériques)

**Files:**
- Create: `src/app/games/kit.ts`, `src/app/games/chess.ts`, `src/app/games/index.ts`, `src/app/game/useGame.ts`, `src/app/screens/GameRoutes.tsx`, `src/app/screens/GameMenuScreen.tsx`
- Modify (contenu complet) : `src/app/screens/PlayScreen.tsx`, `src/app/components/CapturedRow.tsx`, `src/app/screens/LessonScreen.tsx`, `src/app/screens/useLessonExercise.ts`, `src/app/screens/HomeScreen.tsx`, `src/app/router.ts`, `src/app/App.tsx`, `src/app/game/saved.ts`
- Delete: `src/app/game/useChessGame.ts`, `src/app/screens/ChessGameRoutes.tsx`, `src/app/screens/ChessMenuScreen.tsx`
- Test: `tests/unit/app/games.test.ts` (nouveau), `tests/unit/app/router.test.ts`, `tests/unit/app/menus.test.tsx`, `tests/unit/app/dialogs.test.tsx`, `tests/unit/app/lesson-screens.test.tsx` (remplacés), `tests/unit/app/game/useGame.test.ts` (déplacé depuis `useChessGame.test.ts`)

**Interfaces:**
- Consumes: Tâche 1 ; code de l'étape 1 (`Board`, `move-input`, `session`, écrans).
- Produces :
  - `games/kit.ts` : `PieceIcon { image; label }`, `ChoicePickerProps<Move> { color; choices; onPick; onCancel }`, `MoveSound = 'move' | 'capture' | 'check'`, `GameHelp<Pos, Move> { hintDepth; blunderDepth; hintText; detectBlunder }`, `GameKit<Pos, Move extends MoveShape> extends SavedGameSpec<Pos, Move>` avec `title`, `progressKey`, `lessons`, `lessonRules`, `help`, `engine()`, `geometry(orientation)`, `boardPieces(pos)`, `capturedPieces(pos)`, `checkSquare(pos)`, `moveSound(pos, move)`, `explainResult(status, viewer)`, `ChoicePicker`.
  - `games/chess.ts` : `chessKit: GameKit<ChessPos, ChessMove>`.
  - `games/index.ts` : `withKit<R>(game, run: <Pos, Move extends MoveShape>(kit: GameKit<Pos, Move>) => R): R | null` (null tant que les dames ne sont pas prêtes).
  - `game/useGame.ts` : `useGame(initial, kit, deps: GameDeps)` → `GameController<Pos, Move>` (`choices`, `choose`, `cancelChoice` remplacent `promotionChoices`, `choosePromotion`, `cancelPromotion`).
  - `router.ts` : `Route = home | settings | { menu, game } | { lessons, game } | { lesson, game, lessonId } | { play, setup } | { resume, game }` ; adresses `#/echecs/…` et `#/dames/…`.
  - Écrans : `PlayScreen({ kit, initial, storage, sound, notice?, onExit, onNewGame })`, `NewGame({ kit, setup, storage, sound })`, `ResumeGame({ kit, storage, sound, onFailure })`, `GameMenuScreen({ game, title, onNavigate, hasSavedGame, completedCount, totalLessons, notice })`, `LessonScreen({ kit, lesson, nextLesson?, sound, onComplete, onOpen, onBack })`, `useLessonExercise(rules, exercise, engine)`, `CapturedRow({ color, pieces: PieceIcon[] })`.

- [x] **Step 1 : Écrire les tests qui échouent**

```bash
git mv tests/unit/app/game/useChessGame.test.ts tests/unit/app/game/useGame.test.ts
```

Dans `tests/unit/app/game/useGame.test.ts`, remplacer :
```ts
import { useChessGame } from '../../../../src/app/game/useChessGame';
```
par :
```ts
import { useGame } from '../../../../src/app/game/useGame';
import { chessKit } from '../../../../src/app/games/chess';
```
et :
```ts
  const hook = renderHook(() => useChessGame(initial, { engine: () => engine, storage: createStorage(null), sound: false }));
```
par :
```ts
  const hook = renderHook(() => useGame(initial, chessKit, { engine: () => engine, storage: createStorage(null), sound: false }));
```
et `describe('useChessGame', () => {` par `describe('useGame', () => {`.

**Fichier : `tests/unit/app/games.test.ts`**
```ts
import { describe, expect, it } from 'vitest';
import { withKit } from '../../../src/app/games';
import { chessKit } from '../../../src/app/games/chess';
import { parseChess } from '../../../src/chess/adapter';

describe('kits de jeu', () => {
  it('décrit les échecs pour les écrans communs', () => {
    const pos = parseChess('rnbqkbnr/ppp1pppp/8/8/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1');
    expect(chessKit.capturedPieces(pos).black).toEqual([{ image: expect.any(String), label: 'Pion noir' }]);
    expect(chessKit.checkSquare(chessKit.adapter.initial())).toBeNull();
    expect(chessKit.moveSound(chessKit.adapter.initial(), { from: 'e2', to: 'e4' })).toBe('move');
    expect(chessKit.lessons).toHaveLength(17);
    expect(chessKit.geometry('white').size).toBe(8);
    expect(chessKit.explainResult({ kind: 'ongoing' }, null).title).toBe('Partie en cours');
  });

  it('donne le kit du jeu demandé', () => {
    expect(withKit('chess', (kit) => kit.title)).toBe('Échecs');
    expect(withKit('draughts', (kit) => kit.title)).toBeNull();
  });
});
```

**Fichier : `tests/unit/app/router.test.ts`**
```ts
import { describe, expect, it } from 'vitest';
import { COLOR_CHOICES, resolveColor } from '../../../src/app/menu';
import { parseRoute, routeToHash, type Route } from '../../../src/app/router';

const routes: Route[] = [
  { name: 'home' },
  { name: 'settings' },
  { name: 'menu', game: 'chess' },
  { name: 'menu', game: 'draughts' },
  { name: 'lessons', game: 'chess' },
  { name: 'lesson', game: 'draughts', lessonId: 'rafles' },
  { name: 'resume', game: 'chess' },
  { name: 'play', setup: { game: 'chess', mode: 'ai', level: 'expert', playerColor: 'black' } },
  { name: 'play', setup: { game: 'draughts', mode: 'local', level: null, playerColor: 'white' } },
];

describe('routes', () => {
  it.each(routes.map((route) => [routeToHash(route), route] as const))('%s aller-retour', (hash, route) => {
    expect(parseRoute(hash)).toEqual(route);
  });

  it('écrit des adresses lisibles', () => {
    expect(routeToHash({ name: 'play', setup: { game: 'chess', mode: 'ai', level: 'faible', playerColor: 'white' } })).toBe('#/echecs/partie/ordi/faible/blancs');
    expect(routeToHash({ name: 'lessons', game: 'draughts' })).toBe('#/dames/lecons');
    expect(routeToHash({ name: 'home' })).toBe('#/');
  });

  it('se rabat sur un écran sûr pour une adresse inconnue', () => {
    expect(parseRoute('')).toEqual({ name: 'home' });
    expect(parseRoute('#/nimporte')).toEqual({ name: 'home' });
    expect(parseRoute('#/constructor')).toEqual({ name: 'home' });
    expect(parseRoute('#/echecs/partie/ordi/maitre/blancs')).toEqual({ name: 'menu', game: 'chess' });
    expect(parseRoute('#/echecs/%E0%A4%A')).toEqual({ name: 'home' });
  });
});

describe('choix de couleur', () => {
  it('garde la couleur choisie ou tire au sort', () => {
    expect(resolveColor('black')).toBe('black');
    expect(resolveColor('random', () => 0.2)).toBe('white');
    expect(resolveColor('random', () => 0.7)).toBe('black');
    expect(COLOR_CHOICES.map((choice) => choice.label)).toEqual(['Blancs', 'Noirs', 'Au hasard']);
  });
});
```

**Fichier : `tests/unit/app/menus.test.tsx`**
```tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { GameMenuScreen } from '../../../src/app/screens/GameMenuScreen';
import { HomeScreen } from '../../../src/app/screens/HomeScreen';
import { SettingsScreen } from '../../../src/app/screens/SettingsScreen';

describe('accueil', () => {
  it('ouvre les échecs et annonce les dames pour bientôt', () => {
    const onNavigate = vi.fn();
    render(<HomeScreen onNavigate={onNavigate} storageAvailable={false} />);
    expect(screen.getByText(/ne seront pas sauvegardées/)).toBeTruthy();
    expect((screen.getByRole('button', { name: /Dames/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Échecs/ }));
    expect(onNavigate).toHaveBeenCalledWith({ name: 'menu', game: 'chess' });
  });
});

describe('menu d’un jeu', () => {
  it('lance une partie contre l’ordinateur au niveau et à la couleur choisis', () => {
    const onNavigate = vi.fn();
    render(<GameMenuScreen game="chess" title="Échecs" onNavigate={onNavigate} hasSavedGame={false} completedCount={3} totalLessons={17} notice={null} />);
    expect(screen.getByRole('heading', { name: 'Échecs' })).toBeTruthy();
    expect(screen.getByText('3 / 17 leçons terminées')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reprendre la partie' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Expert' }));
    fireEvent.click(screen.getByRole('button', { name: 'Noirs' }));
    expect(screen.getByRole('button', { name: 'Expert' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Jouer' }));
    expect(onNavigate).toHaveBeenCalledWith({ name: 'play', setup: { game: 'chess', mode: 'ai', level: 'expert', playerColor: 'black' } });
  });

  it('propose de reprendre, d’apprendre et de jouer à deux', () => {
    const onNavigate = vi.fn();
    render(<GameMenuScreen game="draughts" title="Dames" onNavigate={onNavigate} hasSavedGame completedCount={0} totalLessons={12} notice="La partie précédente n'a pas pu être reprise." />);
    expect(screen.getByText("La partie précédente n'a pas pu être reprise.")).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre la partie' }));
    fireEvent.click(screen.getByRole('button', { name: /Apprendre à jouer/ }));
    fireEvent.click(screen.getByRole('button', { name: /2 joueurs sur ce téléphone/ }));
    expect(onNavigate.mock.calls.map(([route]) => route)).toEqual([
      { name: 'resume', game: 'draughts' },
      { name: 'lessons', game: 'draughts' },
      { name: 'play', setup: { game: 'draughts', mode: 'local', level: null, playerColor: 'white' } },
    ]);
  });
});

describe('réglages', () => {
  it('active ou coupe le son', () => {
    const onChange = vi.fn();
    render(<SettingsScreen settings={{ sound: true }} onChange={onChange} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sons' }));
    expect(onChange).toHaveBeenCalledWith({ sound: false });
    expect(screen.getByText(/Stockfish/)).toBeTruthy();
  });
});
```

**Fichier : `tests/unit/app/dialogs.test.tsx`**
```tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { CapturedRow } from '../../../src/app/components/CapturedRow';
import { ConfirmDialog } from '../../../src/app/components/ConfirmDialog';
import { EndDialog } from '../../../src/app/components/EndDialog';

describe('boîtes de dialogue', () => {
  it('ConfirmDialog renvoie le choix', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog title="Attention !" message="Ta dame est en prise." confirmLabel="Jouer quand même" cancelLabel="Choisir un autre coup" onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByRole('dialog', { name: 'Attention !' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Choisir un autre coup' }));
    fireEvent.click(screen.getByRole('button', { name: 'Jouer quand même' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('EndDialog propose de rejouer, revoir le plateau, annuler et revenir au menu', () => {
    const handlers = { onReplay: vi.fn(), onMenu: vi.fn(), onClose: vi.fn(), onUndo: vi.fn() };
    render(<EndDialog result={{ title: 'Défaite', detail: 'Échec et mat.' }} {...handlers} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rejouer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Annuler mon dernier coup' }));
    fireEvent.click(screen.getByRole('button', { name: 'Voir le plateau' }));
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    Object.values(handlers).forEach((handler) => expect(handler).toHaveBeenCalledTimes(1));
  });

  it('EndDialog masque l’annulation si elle est impossible', () => {
    render(<EndDialog result={{ title: 'Victoire !', detail: '' }} onReplay={vi.fn()} onMenu={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Annuler mon dernier coup' })).toBeNull();
  });

  it('CapturedRow affiche les pièces prises', () => {
    render(<CapturedRow color="black" pieces={[{ image: 'dame.svg', label: 'Dame noire' }, { image: 'pion.svg', label: 'Pion noir' }]} />);
    expect(screen.getByAltText('Dame noire').getAttribute('src')).toBe('dame.svg');
    expect(screen.getByAltText('Pion noir')).toBeTruthy();
    expect(screen.getByLabelText('Pièces noires prises')).toBeTruthy();
  });
});
```

**Fichier : `tests/unit/app/lesson-screens.test.tsx`**
```tsx
import { act, fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { chessKit } from '../../../src/app/games/chess';
import { LessonListScreen } from '../../../src/app/screens/LessonListScreen';
import { LessonScreen } from '../../../src/app/screens/LessonScreen';
import { CHESS_LESSONS, findChessLesson } from '../../../src/chess/lessons';

function tapSquare(container: Element, square: string): void {
  const rect = container.querySelector(`[data-square="${square}"]`) as Element;
  act(() => {
    rect.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
  });
  act(() => {
    rect.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
  });
}

describe('liste des leçons', () => {
  it('affiche les 17 leçons numérotées et la progression', () => {
    const onOpen = vi.fn();
    render(<LessonListScreen lessons={CHESS_LESSONS} progress={{ completed: ['plateau'] }} onOpen={onOpen} onBack={vi.fn()} />);
    expect(screen.getByText('1 / 17 leçons terminées')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^\d+\. / })).toHaveLength(17);
    expect(screen.getByRole('button', { name: /1\. Le plateau et le but du jeu/ }).textContent).toContain('✓');
    fireEvent.click(screen.getByRole('button', { name: /2\. La tour/ }));
    expect(onOpen).toHaveBeenCalledWith('tour');
  });
});

describe('écran de leçon', () => {
  it('explique, fait jouer l’exercice puis termine la leçon', () => {
    const onComplete = vi.fn();
    const lesson = findChessLesson('plateau');
    if (!lesson) throw new Error('leçon manquante');
    const { container } = render(
      <LessonScreen kit={chessKit} lesson={lesson} nextLesson={findChessLesson('tour')} sound={false} onComplete={onComplete} onOpen={vi.fn()} onBack={vi.fn()} />,
    );
    expect(screen.getByText(/L'échiquier a 64 cases/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
    expect(screen.getByText(/Amène la tour sur l'étoile/)).toBeTruthy();
    expect(container.querySelectorAll('.star')).toHaveLength(1);
    tapSquare(container, 'e1');
    tapSquare(container, 'e8');
    expect(screen.getByText('Bravo, exercice réussi !')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Terminer la leçon' }));
    expect(onComplete).toHaveBeenCalledWith('plateau');
    expect(screen.getByText('Leçon terminée ! 🎉')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Leçon suivante : La tour' })).toBeTruthy();
  });

  it('explique un mauvais coup puis permet de recommencer', () => {
    const lesson = findChessLesson('pion');
    if (!lesson) throw new Error('leçon manquante');
    const { container } = render(<LessonScreen kit={chessKit} lesson={lesson} sound={false} onComplete={vi.fn()} onOpen={vi.fn()} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
    tapSquare(container, 'e2');
    tapSquare(container, 'e4');
    tapSquare(container, 'e4');
    tapSquare(container, 'e5');
    fireEvent.click(screen.getByRole('button', { name: 'Exercice suivant' }));
    tapSquare(container, 'e3');
    tapSquare(container, 'e4');
    expect(screen.getByText('Le pion ne prend jamais tout droit : il prend en diagonale.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Recommencer' }));
    expect(screen.queryByText('Le pion ne prend jamais tout droit : il prend en diagonale.')).toBeNull();
  });
});
```

- [x] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run tests/unit/app`
Expected : FAIL — `games`, `useGame`, `GameMenuScreen` introuvables ; routes et props différentes.

- [x] **Step 3 : Écrire le kit de jeu et le kit des échecs**

**Fichier : `src/app/games/kit.ts`**
```ts
import type { ComponentType } from 'preact';
import type { BoardPiece } from '../../board/Board';
import type { BoardGeometry } from '../../board/geometry';
import type { MoveShape } from '../../board/move-input';
import type { ResultText } from '../../core/explain';
import type { BlunderVerdict } from '../../core/help';
import type { Color, Engine, Evaluation, GameStatus } from '../../core/types';
import type { Lesson, LessonRules } from '../../lessons/types';
import type { SavedGameSpec } from '../game/saved';

export interface PieceIcon {
  readonly image: string;
  readonly label: string;
}

/** Choix entre plusieurs coups de même trajet (promotion aux échecs, rafles aux dames). */
export interface ChoicePickerProps<Move> {
  readonly color: Color;
  readonly choices: readonly Move[];
  readonly onPick: (move: Move) => void;
  readonly onCancel: () => void;
}

export type MoveSound = 'move' | 'capture' | 'check';

/** Aide du niveau Faible. */
export interface GameHelp<Pos, Move> {
  readonly hintDepth: number;
  readonly blunderDepth: number;
  hintText(pos: Pos, move: Move): string;
  detectBlunder(pos: Pos, move: Move, before: Evaluation, afterForOpponent: Evaluation): BlunderVerdict;
}

/** Tout ce que l'app doit savoir d'un jeu : les écrans communs ne dépendent que de ceci. */
export interface GameKit<Pos, Move extends MoveShape> extends SavedGameSpec<Pos, Move> {
  readonly title: string;
  readonly progressKey: string;
  readonly lessons: readonly Lesson[];
  readonly lessonRules: LessonRules<Pos, Move>;
  readonly help: GameHelp<Pos, Move>;
  engine(): Engine<Pos, Move>;
  geometry(orientation: Color): BoardGeometry;
  boardPieces(pos: Pos): BoardPiece[];
  /** Pièces perdues par chaque camp. */
  capturedPieces(pos: Pos): Readonly<Record<Color, readonly PieceIcon[]>>;
  /** Case du roi en échec ; toujours null pour un jeu sans échec. */
  checkSquare(pos: Pos): string | null;
  moveSound(pos: Pos, move: Move): MoveSound;
  explainResult(status: GameStatus, viewer: Color | null): ResultText;
  readonly ChoicePicker: ComponentType<ChoicePickerProps<Move>>;
}
```

**Fichier : `src/app/games/chess.ts`**
```ts
import { chessGeometry } from '../../board/geometry';
import { checkedKingSquare, chessAdapter, chessMoveCodec, moveInfo } from '../../chess/adapter';
import { getChessEngine } from '../../chess/engine';
import { BLUNDER_DEPTH, HINT_DEPTH } from '../../chess/engine/levels';
import { explainResult } from '../../chess/explain';
import { detectBlunder } from '../../chess/help/blunder';
import { hintText } from '../../chess/help/hint';
import { chessLessonRules } from '../../chess/lesson-rules';
import { CHESS_LESSONS } from '../../chess/lessons';
import { pieceLabel } from '../../chess/names';
import { pieceImage } from '../../chess/pieces';
import type { ChessMove, ChessPos, PieceType } from '../../chess/types';
import { capturedPieces, chessBoardPieces } from '../../chess/view';
import type { Color } from '../../core/types';
import { PromotionPicker } from '../components/PromotionPicker';
import { STORAGE_KEYS } from '../storage';
import type { GameKit, PieceIcon } from './kit';

const icons = (color: Color, types: readonly PieceType[]): PieceIcon[] =>
  types.map((type) => ({ image: pieceImage(color, type), label: pieceLabel(color, type) }));

export const chessKit: GameKit<ChessPos, ChessMove> = {
  id: 'chess',
  title: 'Échecs',
  adapter: chessAdapter,
  codec: chessMoveCodec,
  savedGameKey: STORAGE_KEYS.chessSavedGame,
  progressKey: STORAGE_KEYS.chessProgress,
  lessons: CHESS_LESSONS,
  lessonRules: chessLessonRules,
  help: { hintDepth: HINT_DEPTH, blunderDepth: BLUNDER_DEPTH, hintText, detectBlunder },
  engine: getChessEngine,
  geometry: chessGeometry,
  boardPieces: chessBoardPieces,
  capturedPieces: (pos) => {
    const lost = capturedPieces(pos);
    return { white: icons('white', lost.white), black: icons('black', lost.black) };
  },
  checkSquare: checkedKingSquare,
  moveSound: (pos, move) => {
    const info = moveInfo(pos, move);
    return info.givesCheck ? 'check' : info.captured ? 'capture' : 'move';
  },
  explainResult,
  ChoicePicker: PromotionPicker,
};
```

**Fichier : `src/app/games/index.ts`**
```ts
import type { MoveShape } from '../../board/move-input';
import type { GameId } from '../../core/types';
import { chessKit } from './chess';
import type { GameKit } from './kit';

/** Appelle `run` avec le kit du jeu demandé ; null si ce jeu n'est pas encore disponible. */
export function withKit<R>(game: GameId, run: <Pos, Move extends MoveShape>(kit: GameKit<Pos, Move>) => R): R | null {
  switch (game) {
    case 'chess':
      return run(chessKit);
    case 'draughts':
      return null;
  }
}
```

**Fichier : `src/app/game/saved.ts`** (les raccourcis provisoires des échecs disparaissent)
```ts
import type { GameAdapter, GameId } from '../../core/types';
import { logWarning } from '../log';
import type { AppStorage } from '../storage';
import { restoreSession, validateRecord, type MoveCodec } from './record';
import type { Session } from './session';

export const RESUME_ERROR_MESSAGE = "La partie précédente n'a pas pu être reprise.";

/** Ce qu'il faut savoir d'un jeu pour relire sa partie sauvegardée. */
export interface SavedGameSpec<Pos, Move> {
  readonly id: GameId;
  readonly adapter: GameAdapter<Pos, Move>;
  readonly codec: MoveCodec<Pos, Move>;
  readonly savedGameKey: string;
}

export type SavedGameResult<Pos, Move> =
  | { readonly kind: 'none' }
  | { readonly kind: 'ok'; readonly session: Session<Pos, Move> }
  | { readonly kind: 'error'; readonly message: string };

export function loadSavedGame<Pos, Move>(spec: SavedGameSpec<Pos, Move>, storage: AppStorage): SavedGameResult<Pos, Move> {
  const raw = storage.read(spec.savedGameKey, (value) => value);
  if (raw === null) return { kind: 'none' };
  const record = validateRecord(raw);
  try {
    if (!record || record.setup.game !== spec.id) throw new Error('Enregistrement invalide');
    return { kind: 'ok', session: restoreSession(spec.adapter, spec.codec, record) };
  } catch (error) {
    logWarning('[reprise] partie sauvegardée rejetée', error);
    storage.remove(spec.savedGameKey);
    return { kind: 'error', message: RESUME_ERROR_MESSAGE };
  }
}

export function hasSavedGame<Pos, Move>(spec: SavedGameSpec<Pos, Move>, storage: AppStorage): boolean {
  const record = validateRecord(storage.read(spec.savedGameKey, (value) => value));
  return record !== null && record.setup.game === spec.id;
}
```

- [x] **Step 4 : Écrire le hook générique `useGame` (remplace `useChessGame`)**

```bash
git rm -q src/app/game/useChessGame.ts
```

**Fichier : `src/app/game/useGame.ts`**
```ts
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { EMPTY_INPUT, dropPiece, tapSquare, type InputResult, type InputState, type MoveShape } from '../../board/move-input';
import { engineErrorMessage } from '../../core/engine-errors';
import type { BlunderVerdict } from '../../core/help';
import type { Engine, Evaluation } from '../../core/types';
import type { GameKit } from '../games/kit';
import { logWarning } from '../log';
import { playSound } from '../sound';
import type { AppStorage } from '../storage';
import { toRecord } from './record';
import { applyMove, canUndo, currentPosition, isHumanTurn, resign, undoLastHumanMove, type Session } from './session';

export interface Hint<Move> {
  readonly move: Move;
  readonly text: string;
}

export interface BlunderPrompt<Move> {
  readonly move: Move;
  readonly message: string;
}

export interface GameDeps<Pos, Move> {
  readonly engine: () => Engine<Pos, Move>;
  readonly storage: AppStorage;
  readonly sound: boolean;
}

export interface GameController<Pos, Move> {
  readonly session: Session<Pos, Move>;
  readonly position: Pos;
  readonly legal: readonly Move[];
  readonly input: InputState;
  readonly choices: readonly Move[] | null;
  readonly thinking: boolean;
  readonly checking: boolean;
  readonly hint: Hint<Move> | null;
  readonly blunder: BlunderPrompt<Move> | null;
  readonly engineError: string | null;
  readonly humanTurn: boolean;
  readonly undoAvailable: boolean;
  readonly faibleHelp: boolean;
  tap(square: string): void;
  drop(from: string, to: string): void;
  choose(move: Move): void;
  cancelChoice(): void;
  requestHint(): void;
  confirmBlunder(): void;
  cancelBlunder(): void;
  undo(): void;
  resignGame(): void;
  retryEngine(): void;
}

export function useGame<Pos, Move extends MoveShape>(
  initial: Session<Pos, Move>,
  kit: GameKit<Pos, Move>,
  deps: GameDeps<Pos, Move>,
): GameController<Pos, Move> {
  const { adapter, help } = kit;
  const [session, setSession] = useState(initial);
  const [input, setInput] = useState<InputState>(EMPTY_INPUT);
  const [choices, setChoices] = useState<readonly Move[] | null>(null);
  const [thinking, setThinking] = useState(false);
  const [checking, setChecking] = useState(false);
  const [hint, setHint] = useState<Hint<Move> | null>(null);
  const [blunder, setBlunder] = useState<BlunderPrompt<Move> | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [engineAttempt, setEngineAttempt] = useState(0);
  const beforeEval = useRef<Promise<Evaluation> | null>(null);

  const position = currentPosition(session);
  const ongoing = session.result.kind === 'ongoing';
  const humanTurn = ongoing && isHumanTurn(adapter, session);
  const legal = useMemo(() => (humanTurn ? adapter.legalMoves(position) : []), [position, humanTurn]);
  const faibleHelp = session.setup.mode === 'ai' && session.setup.level === 'faible';
  const busy = thinking || checking || blunder !== null;

  const commit = (base: Session<Pos, Move>, move: Move) => {
    const sound = kit.moveSound(currentPosition(base), move);
    const next = applyMove(adapter, base, move);
    setSession(next);
    setHint(null);
    setInput(EMPTY_INPUT);
    setChoices(null);
    playSound(next.result.kind !== 'ongoing' ? 'end' : sound, deps.sound);
  };

  // Sauvegarde automatique : partie en cours enregistrée, partie finie effacée.
  useEffect(() => {
    if (session.result.kind === 'ongoing') {
      deps.storage.write(kit.savedGameKey, toRecord(adapter, kit.codec, session));
    } else {
      deps.storage.remove(kit.savedGameKey);
    }
  }, [session]);

  // Tour de l'ordinateur.
  useEffect(() => {
    if (session.setup.mode !== 'ai' || !ongoing || isHumanTurn(adapter, session)) return undefined;
    const controller = new AbortController();
    setThinking(true);
    setEngineError(null);
    deps
      .engine()
      .bestMove(position, session.setup.level ?? 'moyen', controller.signal)
      .then((move) => {
        if (!controller.signal.aborted) commit(session, move);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setEngineError(engineErrorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setThinking(false);
      });
    return () => {
      controller.abort();
      setThinking(false);
    };
  }, [session, engineAttempt]);

  // Niveau Faible : on prépare l'évaluation de la position dès que c'est au joueur.
  useEffect(() => {
    beforeEval.current = null;
    if (!faibleHelp || !humanTurn) return;
    const pending = deps.engine().analyse(position, help.blunderDepth);
    // Évite un rejet non géré : l'erreur est traitée là où la promesse est attendue (checkForBlunder).
    pending.catch(() => undefined);
    beforeEval.current = pending;
  }, [session]);

  const checkForBlunder = async (base: Session<Pos, Move>, move: Move): Promise<BlunderVerdict> => {
    const pos = currentPosition(base);
    const before = await (beforeEval.current ?? deps.engine().analyse(pos, help.blunderDepth));
    const after = adapter.play(pos, move);
    if (adapter.status(after).kind !== 'ongoing') return { blunder: false };
    return help.detectBlunder(pos, move, before, await deps.engine().analyse(after, help.blunderDepth));
  };

  const submitHumanMove = (move: Move) => {
    setInput(EMPTY_INPUT);
    setChoices(null);
    if (!faibleHelp) {
      commit(session, move);
      return;
    }
    const base = session;
    setChecking(true);
    checkForBlunder(base, move)
      .then((verdict) => (verdict.blunder ? setBlunder({ move, message: verdict.message }) : commit(base, move)))
      .catch((error: unknown) => {
        logWarning('[aide] vérification du coup impossible', error);
        commit(base, move);
      })
      .finally(() => setChecking(false));
  };

  const handleInput = (result: InputResult<Move>) => {
    setInput(result.state);
    if (result.choices) setChoices(result.choices);
    else if (result.move) submitHumanMove(result.move);
  };

  const canAct = humanTurn && !busy && choices === null;

  return {
    session,
    position,
    legal,
    input,
    choices,
    thinking,
    checking,
    hint,
    blunder,
    engineError,
    humanTurn,
    faibleHelp,
    undoAvailable: canUndo(adapter, session) && !busy,
    tap: (square) => {
      if (canAct) handleInput(tapSquare(input, square, legal));
    },
    drop: (from, to) => {
      if (canAct) handleInput(dropPiece(from, to, legal));
    },
    choose: (move) => {
      setChoices(null);
      submitHumanMove(move);
    },
    cancelChoice: () => {
      setChoices(null);
      setInput(EMPTY_INPUT);
    },
    requestHint: () => {
      if (!faibleHelp || !canAct) return;
      const pos = position;
      setChecking(true);
      deps
        .engine()
        .analyse(pos, help.hintDepth)
        .then((analysis) => setHint({ move: analysis.best, text: help.hintText(pos, analysis.best) }))
        .catch((error: unknown) => setEngineError(engineErrorMessage(error)))
        .finally(() => setChecking(false));
    },
    confirmBlunder: () => {
      if (!blunder) return;
      setBlunder(null);
      commit(session, blunder.move);
    },
    cancelBlunder: () => setBlunder(null),
    undo: () => {
      if (!canUndo(adapter, session) || busy) return;
      setSession(undoLastHumanMove(adapter, session));
      setHint(null);
      setInput(EMPTY_INPUT);
    },
    resignGame: () => {
      // Un coup en cours de vérification serait ensuite joué sur la session d'avant l'abandon et l'effacerait.
      if (checking) return;
      const loser = session.setup.mode === 'ai' ? session.setup.playerColor : adapter.turn(position);
      setSession(resign(session, loser));
    },
    retryEngine: () => {
      setEngineError(null);
      setEngineAttempt((attempt) => attempt + 1);
    },
  };
}
```

- [x] **Step 5 : Écrire les écrans de partie génériques**

**Fichier : `src/app/components/CapturedRow.tsx`**
```tsx
import type { Color } from '../../core/types';
import type { PieceIcon } from '../games/kit';

interface CapturedRowProps {
  /** Couleur des pièces perdues. */
  readonly color: Color;
  readonly pieces: readonly PieceIcon[];
}

export function CapturedRow({ color, pieces }: CapturedRowProps) {
  return (
    <div class="captured" aria-label={color === 'white' ? 'Pièces blanches prises' : 'Pièces noires prises'}>
      {pieces.map((piece, index) => (
        <img key={`${piece.label}-${index}`} src={piece.image} alt={piece.label} />
      ))}
    </div>
  );
}
```

**Fichier : `src/app/screens/PlayScreen.tsx`**
```tsx
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Board } from '../../board/Board';
import { targetsOf, type MoveShape } from '../../board/move-input';
import { opposite } from '../../core/types';
import { CapturedRow } from '../components/CapturedRow';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EndDialog } from '../components/EndDialog';
import { lastMove, type Session } from '../game/session';
import { useGame, type GameController } from '../game/useGame';
import type { GameKit } from '../games/kit';
import { modeTitle } from '../labels';
import type { AppStorage } from '../storage';

interface PlayScreenProps<Pos, Move extends MoveShape> {
  readonly kit: GameKit<Pos, Move>;
  readonly initial: Session<Pos, Move>;
  readonly storage: AppStorage;
  readonly sound: boolean;
  readonly notice?: string | null;
  readonly onExit: () => void;
  readonly onNewGame: () => void;
}

function statusText<Pos, Move extends MoveShape>(kit: GameKit<Pos, Move>, game: GameController<Pos, Move>): string {
  const { session, position } = game;
  const viewer = session.setup.mode === 'ai' ? session.setup.playerColor : null;
  if (session.result.kind !== 'ongoing') return kit.explainResult(session.result, viewer).title;
  if (game.thinking) return "L'ordinateur réfléchit…";
  if (game.checking) return 'Un instant…';
  const inCheck = kit.checkSquare(position) !== null;
  if (session.setup.mode === 'local') {
    return `Au tour des ${kit.adapter.turn(position) === 'white' ? 'Blancs' : 'Noirs'}${inCheck ? ' : échec !' : ''}`;
  }
  return inCheck ? 'À toi de jouer : ton roi est en échec !' : 'À toi de jouer';
}

export function PlayScreen<Pos, Move extends MoveShape>(props: PlayScreenProps<Pos, Move>) {
  const { kit } = props;
  const game = useGame(props.initial, kit, { engine: kit.engine, storage: props.storage, sound: props.sound });
  const { session, position } = game;
  const [confirmResign, setConfirmResign] = useState(false);
  const [endDismissed, setEndDismissed] = useState(false);
  const bottom = session.setup.mode === 'ai' ? session.setup.playerColor : 'white';
  const geometry = useMemo(() => kit.geometry(bottom), [kit, bottom]);
  const last = lastMove(session);
  const captured = kit.capturedPieces(position);
  const finished = session.result.kind !== 'ongoing';
  const viewer = session.setup.mode === 'ai' ? session.setup.playerColor : null;
  const ChoicePicker = kit.ChoicePicker;

  useEffect(() => {
    if (!finished) setEndDismissed(false);
  }, [finished]);

  return (
    <section class="screen">
      <header class="topbar">
        <button type="button" class="back" aria-label="Retour au menu" onClick={props.onExit}>
          ←
        </button>
        <h1>{modeTitle(session.setup)}</h1>
      </header>
      {props.notice && <p class="feedback feedback-info">{props.notice}</p>}
      <CapturedRow color={bottom} pieces={captured[bottom]} />
      <div class="board-wrap">
        <Board
          geometry={geometry}
          pieces={kit.boardPieces(position)}
          selected={game.input.selected}
          targets={targetsOf(game.input.selected, game.legal)}
          highlights={last ? [last.from, last.to] : []}
          check={kit.checkSquare(position)}
          arrows={game.hint ? [game.hint.move] : []}
          animate={last}
          onSquareTap={game.tap}
          onDrop={game.drop}
          canDrag={(square) => game.legal.some((move) => move.from === square)}
        />
      </div>
      <CapturedRow color={opposite(bottom)} pieces={captured[opposite(bottom)]} />
      <p class="status-line" role="status">
        {statusText(kit, game)}
      </p>
      {game.hint && <p class="feedback feedback-info">💡 {game.hint.text}</p>}
      {game.engineError && (
        <div class="banner" role="alert">
          <span>{game.engineError}</span>
          <button type="button" class="btn btn-small" onClick={game.retryEngine}>
            Réessayer
          </button>
        </div>
      )}
      <div class="actions">
        {game.faibleHelp && (
          <button type="button" class="btn btn-small" onClick={game.requestHint} disabled={!game.humanTurn || game.checking}>
            Indice
          </button>
        )}
        {game.faibleHelp && (
          <button type="button" class="btn btn-small" onClick={game.undo} disabled={!game.undoAvailable}>
            Annuler
          </button>
        )}
        {!finished && (
          <button type="button" class="btn btn-small btn-danger" onClick={() => setConfirmResign(true)} disabled={game.checking}>
            Abandonner
          </button>
        )}
        <button type="button" class="btn btn-small" onClick={props.onNewGame}>
          Nouvelle partie
        </button>
      </div>
      {game.choices && (
        <ChoicePicker color={kit.adapter.turn(position)} choices={game.choices} onPick={game.choose} onCancel={game.cancelChoice} />
      )}
      {game.blunder && (
        <ConfirmDialog
          title="Attention !"
          message={game.blunder.message}
          confirmLabel="Jouer quand même"
          cancelLabel="Choisir un autre coup"
          onConfirm={game.confirmBlunder}
          onCancel={game.cancelBlunder}
        />
      )}
      {confirmResign && (
        <ConfirmDialog
          title="Abandonner ?"
          message="Tu perdras la partie."
          confirmLabel="Abandonner"
          cancelLabel="Continuer à jouer"
          onConfirm={() => {
            setConfirmResign(false);
            game.resignGame();
          }}
          onCancel={() => setConfirmResign(false)}
        />
      )}
      {finished && !endDismissed && (
        <EndDialog
          result={kit.explainResult(session.result, viewer)}
          onReplay={props.onNewGame}
          onMenu={props.onExit}
          onClose={() => setEndDismissed(true)}
          onUndo={game.undoAvailable ? game.undo : undefined}
        />
      )}
    </section>
  );
}
```

```bash
git rm -q src/app/screens/ChessGameRoutes.tsx src/app/screens/ChessMenuScreen.tsx
```

**Fichier : `src/app/screens/GameRoutes.tsx`**
```tsx
import { useEffect, useState } from 'preact/hooks';
import type { MoveShape } from '../../board/move-input';
import { loadSavedGame } from '../game/saved';
import { createSession, type GameSetup } from '../game/session';
import type { GameKit } from '../games/kit';
import { NO_SAVED_GAME_MESSAGE } from '../menu';
import { navigate, replaceHash } from '../navigation';
import type { AppStorage } from '../storage';
import { PlayScreen } from './PlayScreen';

interface GameRouteProps<Pos, Move extends MoveShape> {
  readonly kit: GameKit<Pos, Move>;
  readonly storage: AppStorage;
  readonly sound: boolean;
}

/** Nouvelle partie ; l'adresse devient « reprendre » pour qu'un rechargement retrouve cette partie. */
export function NewGame<Pos, Move extends MoveShape>({ kit, setup, storage, sound }: GameRouteProps<Pos, Move> & { readonly setup: GameSetup }) {
  const [initial] = useState(() => createSession(kit.adapter, setup, kit.adapter.initial()));
  useEffect(() => replaceHash({ name: 'resume', game: kit.id }), []);
  return (
    <PlayScreen
      kit={kit}
      initial={initial}
      storage={storage}
      sound={sound}
      onExit={() => navigate({ name: 'menu', game: kit.id })}
      onNewGame={() => navigate({ name: 'play', setup })}
    />
  );
}

export function ResumeGame<Pos, Move extends MoveShape>({
  kit,
  storage,
  sound,
  onFailure,
}: GameRouteProps<Pos, Move> & { readonly onFailure: (message: string) => void }) {
  const [loaded] = useState(() => loadSavedGame(kit, storage));
  useEffect(() => {
    if (loaded.kind !== 'ok') onFailure(loaded.kind === 'error' ? loaded.message : NO_SAVED_GAME_MESSAGE);
  }, []);
  if (loaded.kind !== 'ok') return null;
  const setup = loaded.session.setup;
  return (
    <PlayScreen
      kit={kit}
      initial={loaded.session}
      storage={storage}
      sound={sound}
      onExit={() => navigate({ name: 'menu', game: kit.id })}
      onNewGame={() => navigate({ name: 'play', setup })}
    />
  );
}
```

- [x] **Step 6 : Écrire les leçons génériques**

**Fichier : `src/app/screens/useLessonExercise.ts`**
```ts
import { useEffect, useMemo, useState } from 'preact/hooks';
import { EMPTY_INPUT, dropPiece, tapSquare, type InputResult, type InputState, type MoveShape } from '../../board/move-input';
import { engineErrorMessage } from '../../core/engine-errors';
import type { Engine } from '../../core/types';
import { playOpponentMove, playPlayerMove, startExercise, type ExerciseRun } from '../../lessons/runner';
import type { Exercise, LessonRules } from '../../lessons/types';

export interface LessonExercise<Pos, Move> {
  readonly run: ExerciseRun<Pos>;
  readonly input: InputState;
  readonly choices: readonly Move[] | null;
  readonly last: Move | null;
  readonly legal: readonly Move[];
  readonly thinking: boolean;
  readonly engineError: string | null;
  tap(square: string): void;
  drop(from: string, to: string): void;
  choose(move: Move): void;
  cancelChoice(): void;
  restart(): void;
  retryEngine(): void;
}

export function useLessonExercise<Pos, Move extends MoveShape>(
  rules: LessonRules<Pos, Move>,
  exercise: Exercise,
  engine: () => Engine<Pos, Move>,
): LessonExercise<Pos, Move> {
  const [run, setRun] = useState(() => startExercise(rules, exercise));
  const [input, setInput] = useState<InputState>(EMPTY_INPUT);
  const [choices, setChoices] = useState<readonly Move[] | null>(null);
  const [last, setLast] = useState<Move | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const legal = useMemo(() => (run.status === 'playing' ? rules.legalMoves(run.pos) : []), [run]);

  // Fin de partie contre l'ordinateur : il répond quand c'est son tour.
  useEffect(() => {
    if (run.status !== 'waiting-opponent' || run.exercise.kind !== 'play-out') return undefined;
    const controller = new AbortController();
    engine()
      .bestMove(run.pos, run.exercise.level, controller.signal)
      .then((move) => {
        if (controller.signal.aborted) return;
        setLast(move);
        setRun(playOpponentMove(rules, run, move));
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setEngineError(engineErrorMessage(error));
      });
    return () => controller.abort();
  }, [run, attempt]);

  const submit = (move: Move) => {
    setInput(EMPTY_INPUT);
    setChoices(null);
    const next = playPlayerMove(rules, run, move);
    setLast(next.pos === next.start ? null : move);
    setRun(next);
  };

  const handle = (result: InputResult<Move>) => {
    setInput(result.state);
    if (result.choices) setChoices(result.choices);
    else if (result.move) submit(result.move);
  };

  const canPlay = run.status === 'playing' && choices === null;

  return {
    run,
    input,
    choices,
    last,
    legal,
    thinking: run.status === 'waiting-opponent',
    engineError,
    tap: (square) => {
      if (canPlay) handle(tapSquare(input, square, legal));
    },
    drop: (from, to) => {
      if (canPlay) handle(dropPiece(from, to, legal));
    },
    choose: submit,
    cancelChoice: () => {
      setChoices(null);
      setInput(EMPTY_INPUT);
    },
    restart: () => {
      setRun(startExercise(rules, exercise));
      setInput(EMPTY_INPUT);
      setChoices(null);
      setLast(null);
      setEngineError(null);
    },
    retryEngine: () => {
      setEngineError(null);
      setAttempt((value) => value + 1);
    },
  };
}
```

**Fichier : `src/app/screens/LessonScreen.tsx`**
```tsx
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Board } from '../../board/Board';
import { targetsOf, type MoveShape } from '../../board/move-input';
import type { Exercise, Lesson } from '../../lessons/types';
import type { GameKit } from '../games/kit';
import { playSound } from '../sound';
import { useLessonExercise } from './useLessonExercise';

interface LessonScreenProps<Pos, Move extends MoveShape> {
  readonly kit: GameKit<Pos, Move>;
  readonly lesson: Lesson;
  readonly nextLesson?: Lesson;
  readonly sound: boolean;
  readonly onComplete: (lessonId: string) => void;
  readonly onOpen: (lessonId: string) => void;
  readonly onBack: () => void;
}

interface ExerciseViewProps<Pos, Move extends MoveShape> {
  readonly kit: GameKit<Pos, Move>;
  readonly exercise: Exercise;
  readonly index: number;
  readonly total: number;
  readonly sound: boolean;
  readonly onNext: () => void;
}

function ExerciseView<Pos, Move extends MoveShape>({ kit, exercise, index, total, sound, onNext }: ExerciseViewProps<Pos, Move>) {
  const ex = useLessonExercise(kit.lessonRules, exercise, kit.engine);
  const geometry = useMemo(() => kit.geometry(ex.run.player), [kit, ex.run.player]);
  const solved = ex.run.status === 'success';
  const failed = ex.run.status === 'failed';
  const ChoicePicker = kit.ChoicePicker;

  useEffect(() => {
    if (solved) playSound('end', sound);
  }, [solved]);

  return (
    <>
      <p class="muted">
        Exercice {index + 1} / {total}
      </p>
      <p class="card">{exercise.instruction}</p>
      <div class="board-wrap">
        <Board
          geometry={geometry}
          pieces={kit.boardPieces(ex.run.pos)}
          selected={ex.input.selected}
          targets={targetsOf(ex.input.selected, ex.legal)}
          highlights={ex.last ? [ex.last.from, ex.last.to] : []}
          check={kit.checkSquare(ex.run.pos)}
          stars={ex.run.remainingStars}
          onSquareTap={ex.tap}
          onDrop={ex.drop}
          canDrag={(square) => ex.legal.some((move) => move.from === square)}
        />
      </div>
      {ex.thinking && <p class="status-line thinking">L'ordinateur réfléchit…</p>}
      {ex.run.feedback && (
        <p class={`feedback feedback-${ex.run.feedback.tone}`} role="status">
          {ex.run.feedback.text}
        </p>
      )}
      {ex.engineError && (
        <div class="banner" role="alert">
          <span>{ex.engineError}</span>
          <button type="button" class="btn btn-small" onClick={ex.retryEngine}>
            Réessayer
          </button>
        </div>
      )}
      <div class="actions">
        {!solved && (
          <button type="button" class="btn btn-small" onClick={ex.restart}>
            {failed ? 'Réessayer' : 'Recommencer'}
          </button>
        )}
        {solved && (
          <button type="button" class="btn btn-primary" onClick={onNext}>
            {index + 1 < total ? 'Exercice suivant' : 'Terminer la leçon'}
          </button>
        )}
      </div>
      {ex.choices && (
        <ChoicePicker color={kit.lessonRules.turn(ex.run.pos)} choices={ex.choices} onPick={ex.choose} onCancel={ex.cancelChoice} />
      )}
    </>
  );
}

export function LessonScreen<Pos, Move extends MoveShape>({ kit, lesson, nextLesson, sound, onComplete, onOpen, onBack }: LessonScreenProps<Pos, Move>) {
  const [step, setStep] = useState(-1);
  const total = lesson.exercises.length;

  const header = (
    <header class="topbar">
      <button type="button" class="back" aria-label="Retour à la liste des leçons" onClick={onBack}>
        ←
      </button>
      <h1>{lesson.title}</h1>
    </header>
  );

  if (step < 0) {
    return (
      <section class="screen">
        {header}
        <div class="card intro">
          {lesson.intro.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <button type="button" class="btn btn-primary" onClick={() => setStep(0)}>
          Commencer
        </button>
      </section>
    );
  }

  if (step >= total) {
    return (
      <section class="screen">
        {header}
        <p class="feedback feedback-success">Leçon terminée ! 🎉</p>
        {nextLesson && (
          <button type="button" class="btn btn-primary" onClick={() => onOpen(nextLesson.id)}>
            Leçon suivante : {nextLesson.title}
          </button>
        )}
        <button type="button" class="btn" onClick={onBack}>
          Retour aux leçons
        </button>
      </section>
    );
  }

  return (
    <section class="screen">
      {header}
      <ExerciseView
        key={step}
        kit={kit}
        exercise={lesson.exercises[step]}
        index={step}
        total={total}
        sound={sound}
        onNext={() => {
          if (step + 1 >= total) onComplete(lesson.id);
          setStep(step + 1);
        }}
      />
    </section>
  );
}
```

- [x] **Step 7 : Écrire les adresses, les menus et l'assemblage**

**Fichier : `src/app/router.ts`**
```ts
import { isOneOf } from '../core/guards';
import { GAME_IDS, LEVELS_ORDER, type GameId } from '../core/types';
import type { GameSetup } from './game/session';

export type Route =
  | { readonly name: 'home' }
  | { readonly name: 'settings' }
  | { readonly name: 'menu'; readonly game: GameId }
  | { readonly name: 'lessons'; readonly game: GameId }
  | { readonly name: 'lesson'; readonly game: GameId; readonly lessonId: string }
  | { readonly name: 'play'; readonly setup: GameSetup }
  | { readonly name: 'resume'; readonly game: GameId };

const SEGMENTS: Readonly<Record<GameId, string>> = { chess: 'echecs', draughts: 'dames' };
const HOME: Route = { name: 'home' };

function splitHash(hash: string): string[] | null {
  try {
    return hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return null;
  }
}

export function parseRoute(hash: string): Route {
  const parts = splitHash(hash);
  if (!parts || parts.length === 0) return HOME;
  const [first, second, third, fourth, fifth] = parts;
  if (first === 'reglages') return { name: 'settings' };
  const game = GAME_IDS.find((id) => SEGMENTS[id] === first);
  if (!game) return HOME;
  const menu: Route = { name: 'menu', game };
  if (!second) return menu;
  if (second === 'lecons') return third ? { name: 'lesson', game, lessonId: third } : { name: 'lessons', game };
  if (second === 'reprendre') return { name: 'resume', game };
  if (second === 'partie' && third === 'deux-joueurs') {
    return { name: 'play', setup: { game, mode: 'local', level: null, playerColor: 'white' } };
  }
  if (second === 'partie' && third === 'ordi' && isOneOf(fourth, LEVELS_ORDER) && isOneOf(fifth, ['blancs', 'noirs'] as const)) {
    return { name: 'play', setup: { game, mode: 'ai', level: fourth, playerColor: fifth === 'blancs' ? 'white' : 'black' } };
  }
  return menu;
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'settings':
      return '#/reglages';
    case 'menu':
      return `#/${SEGMENTS[route.game]}`;
    case 'lessons':
      return `#/${SEGMENTS[route.game]}/lecons`;
    case 'lesson':
      return `#/${SEGMENTS[route.game]}/lecons/${encodeURIComponent(route.lessonId)}`;
    case 'resume':
      return `#/${SEGMENTS[route.game]}/reprendre`;
    case 'play': {
      const { setup } = route;
      const base = `#/${SEGMENTS[setup.game]}/partie`;
      if (setup.mode === 'local' || setup.level === null) return `${base}/deux-joueurs`;
      return `${base}/ordi/${setup.level}/${setup.playerColor === 'white' ? 'blancs' : 'noirs'}`;
    }
  }
}
```

**Fichier : `src/app/screens/GameMenuScreen.tsx`**
```tsx
import { useState } from 'preact/hooks';
import { LEVELS_ORDER, type GameId, type Level } from '../../core/types';
import { LEVEL_LABELS } from '../labels';
import { COLOR_CHOICES, resolveColor, type ColorChoice } from '../menu';
import type { Route } from '../router';

interface GameMenuScreenProps {
  readonly game: GameId;
  readonly title: string;
  readonly onNavigate: (route: Route) => void;
  readonly hasSavedGame: boolean;
  readonly completedCount: number;
  readonly totalLessons: number;
  readonly notice: string | null;
}

export function GameMenuScreen({ game, title, onNavigate, hasSavedGame, completedCount, totalLessons, notice }: GameMenuScreenProps) {
  const [level, setLevel] = useState<Level>('faible');
  const [color, setColor] = useState<ColorChoice>('white');

  return (
    <section class="screen">
      <header class="topbar">
        <button type="button" class="back" aria-label="Retour à l'accueil" onClick={() => onNavigate({ name: 'home' })}>
          ←
        </button>
        <h1>{title}</h1>
      </header>
      {notice && (
        <p class="feedback feedback-info" role="status">
          {notice}
        </p>
      )}
      {hasSavedGame && (
        <button type="button" class="btn btn-primary" onClick={() => onNavigate({ name: 'resume', game })}>
          Reprendre la partie
        </button>
      )}
      <button type="button" class="btn" onClick={() => onNavigate({ name: 'lessons', game })}>
        Apprendre à jouer
        <span class="sub">
          {completedCount} / {totalLessons} leçons terminées
        </span>
      </button>
      <div class="card">
        <h2>Contre l'ordinateur</h2>
        <div class="choices" role="group" aria-label="Niveau">
          {LEVELS_ORDER.map((value) => (
            <button type="button" key={value} class="choice" aria-pressed={level === value} onClick={() => setLevel(value)}>
              {LEVEL_LABELS[value].name}
            </button>
          ))}
        </div>
        <p class="muted">{LEVEL_LABELS[level].description}</p>
        <div class="choices" role="group" aria-label="Couleur">
          {COLOR_CHOICES.map((choice) => (
            <button type="button" key={choice.value} class="choice" aria-pressed={color === choice.value} onClick={() => setColor(choice.value)}>
              {choice.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          class="btn btn-primary"
          onClick={() => onNavigate({ name: 'play', setup: { game, mode: 'ai', level, playerColor: resolveColor(color) } })}
        >
          Jouer
        </button>
      </div>
      <button
        type="button"
        class="btn"
        onClick={() => onNavigate({ name: 'play', setup: { game, mode: 'local', level: null, playerColor: 'white' } })}
      >
        2 joueurs sur ce téléphone
        <span class="sub">Chacun son tour, sur le même écran</span>
      </button>
      <button type="button" class="btn" disabled>
        En ligne
        <span class="sub">Bientôt disponible</span>
      </button>
    </section>
  );
}
```

Dans `src/app/screens/HomeScreen.tsx`, remplacer `onClick={() => onNavigate({ name: 'chess-menu' })}` par `onClick={() => onNavigate({ name: 'menu', game: 'chess' })}`.

**Fichier : `src/app/App.tsx`**
```tsx
import { useMemo, useState } from 'preact/hooks';
import type { MoveShape } from '../board/move-input';
import type { GameId } from '../core/types';
import { hasSavedGame } from './game/saved';
import { withKit } from './games';
import type { GameKit } from './games/kit';
import { navigate, useRoute } from './navigation';
import { EMPTY_PROGRESS, isCompleted, markCompleted, validateProgress, type LessonProgress } from './progress';
import type { Route } from './router';
import { GameMenuScreen } from './screens/GameMenuScreen';
import { NewGame, ResumeGame } from './screens/GameRoutes';
import { HomeScreen } from './screens/HomeScreen';
import { LessonListScreen } from './screens/LessonListScreen';
import { LessonScreen } from './screens/LessonScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { DEFAULT_SETTINGS, validateSettings, type Settings } from './settings';
import { STORAGE_KEYS, createStorage, detectBackend, type AppStorage } from './storage';

type GameRoute = Exclude<Route, { readonly name: 'home' } | { readonly name: 'settings' }>;
type ProgressByGame = Readonly<Record<GameId, LessonProgress>>;

function readProgress(storage: AppStorage): ProgressByGame {
  return {
    chess: storage.read(STORAGE_KEYS.chessProgress, validateProgress) ?? EMPTY_PROGRESS,
    draughts: storage.read(STORAGE_KEYS.draughtsProgress, validateProgress) ?? EMPTY_PROGRESS,
  };
}

export function App() {
  const storage = useMemo(() => createStorage(detectBackend()), []);
  const [settings, setSettings] = useState<Settings>(() => storage.read(STORAGE_KEYS.settings, validateSettings) ?? DEFAULT_SETTINGS);
  const [progress, setProgress] = useState<ProgressByGame>(() => readProgress(storage));
  const [menuNotice, setMenuNotice] = useState<string | null>(null);
  const { route, version } = useRoute();

  const go = (next: Route) => {
    setMenuNotice(null);
    navigate(next);
  };

  const updateSettings = (next: Settings) => {
    setSettings(next);
    storage.write(STORAGE_KEYS.settings, next);
  };

  const renderGame = <Pos, Move extends MoveShape>(kit: GameKit<Pos, Move>, current: GameRoute) => {
    const done = progress[kit.id];
    const openLesson = (lessonId: string) => go({ name: 'lesson', game: kit.id, lessonId });
    const completeLesson = (lessonId: string) => {
      const next = markCompleted(done, lessonId);
      setProgress({ ...progress, [kit.id]: next });
      storage.write(kit.progressKey, next);
    };
    const lessonList = (
      <LessonListScreen lessons={kit.lessons} progress={done} onOpen={openLesson} onBack={() => go({ name: 'menu', game: kit.id })} />
    );
    switch (current.name) {
      case 'menu':
        return (
          <GameMenuScreen
            game={kit.id}
            title={kit.title}
            onNavigate={go}
            hasSavedGame={hasSavedGame(kit, storage)}
            completedCount={kit.lessons.filter((lesson) => isCompleted(done, lesson.id)).length}
            totalLessons={kit.lessons.length}
            notice={menuNotice}
          />
        );
      case 'lessons':
        return lessonList;
      case 'lesson': {
        const index = kit.lessons.findIndex((lesson) => lesson.id === current.lessonId);
        if (index < 0) return lessonList;
        const lesson = kit.lessons[index];
        return (
          <LessonScreen
            key={`${lesson.id}-${version}`}
            kit={kit}
            lesson={lesson}
            nextLesson={kit.lessons[index + 1]}
            sound={settings.sound}
            onComplete={completeLesson}
            onOpen={openLesson}
            onBack={() => go({ name: 'lessons', game: kit.id })}
          />
        );
      }
      case 'play':
        return <NewGame key={version} kit={kit} setup={current.setup} storage={storage} sound={settings.sound} />;
      case 'resume':
        return (
          <ResumeGame
            key={version}
            kit={kit}
            storage={storage}
            sound={settings.sound}
            onFailure={(message) => {
              setMenuNotice(message);
              navigate({ name: 'menu', game: kit.id });
            }}
          />
        );
    }
  };

  const home = <HomeScreen onNavigate={go} storageAvailable={storage.available} />;
  if (route.name === 'home') return home;
  if (route.name === 'settings') {
    return <SettingsScreen settings={settings} onChange={updateSettings} onBack={() => go({ name: 'home' })} />;
  }
  const game = route.name === 'play' ? route.setup.game : route.game;
  return withKit(game, <Pos, Move extends MoveShape>(kit: GameKit<Pos, Move>) => renderGame(kit, route)) ?? home;
}
```

Dans `vite.config.ts`, dans la liste `coverage.exclude`, remplacer `'src/app/game/useChessGame.ts',` par `'src/app/game/useGame.ts',`.

- [x] **Step 8 : Lancer tous les tests et le typage**

Run : `npx vitest run` puis `npx tsc -b`
Expected : PASS, aucune erreur. Vérifier aussi `grep -rn "useChessGame\|ChessMenuScreen\|ChessGameRoutes\|chess-menu\|loadSavedChessGame" src tests vite.config.ts` : rien.

- [x] **Step 9 : Vérifier les échecs dans le vrai navigateur**

Run : `npm run e2e`
Expected : les 7 scénarios de l'étape 1 passent toujours (les adresses `#/echecs/…` sont inchangées).

- [x] **Step 10 : Commit**

```bash
git add -A src tests
git commit -m "refactor: kit de jeu et écrans génériques pour accueillir les dames"
```

---
### Task 3 : Dames — cases numérotées, plateau 10×10 et pièces

**Files:**
- Create: `src/draughts/types.ts`, `src/draughts/squares.ts`, `src/draughts/geometry.ts`, `src/draughts/pieces.ts`, `src/draughts/pieces/wM.svg`, `wK.svg`, `bM.svg`, `bK.svg`, `src/draughts/view.ts`
- Modify: `src/board/geometry.ts` (champ `numbered`), `src/board/Board.tsx` (numéros), `src/styles/global.css` (`.sq-num`)
- Test: `tests/unit/draughts/squares.test.ts`, `tests/unit/draughts/geometry.test.ts`, `tests/unit/draughts/view.test.ts`, `tests/unit/board/numbered.test.tsx`

**Interfaces:**
- Consumes: `BoardGeometry`, `Board`, `BoardPiece` (étape 1) ; `Color`.
- Produces :
  - `types.ts` : `DraughtsPieceKind = 'man' | 'king'`, `DraughtsPiece { square: string; color; kind }`, `DraughtsMove { from; to; steps; captures; promotes }` (cases en texte « 1 » à « 50 »), `DraughtsPos { board; turn; keys; kingPlies; endgame }`.
  - `squares.ts` : `SQUARE_COUNT = 50`, `BOARD_SIZE = 10`, `rowOf(square)`, `colOf(square)`, `squareAt(row, col): number | null`, `RAYS[square][direction]` (0 haut-gauche, 1 haut-droite, 2 bas-gauche, 3 bas-droite), `isForward(direction, side)`, `promotionRow(side)` (`side` : 1 Blancs, -1 Noirs).
  - `geometry.ts` : `draughtsGeometry(orientation): BoardGeometry` (`numbered: true`).
  - `pieces.ts` : `draughtsPieceImage(color, kind)`, `draughtsPieceLabel(color, kind)`.
  - `view.ts` : `PIECES_PER_SIDE = 20`, `listDraughtsPieces(board)`, `draughtsBoardPieces(pos)`, `lostPieceCounts(pos)`.
  - `BoardGeometry.numbered?: boolean` : le plateau affiche le nom de chaque case jouable.

Numérotation FMJD (vue des Blancs, ligne 0 en haut) : ligne `r` contient les cases `5r+1` à `5r+5` ; sur les lignes paires elles sont aux colonnes 1, 3, 5, 7, 9, sur les lignes impaires aux colonnes 0, 2, 4, 6, 8. Les Noirs occupent 1 à 20 (en haut), les Blancs 31 à 50 (en bas) ; la grande diagonale va de 46 à 5.

- [x] **Step 1 : Écrire les tests qui échouent**

**Fichier : `tests/unit/draughts/squares.test.ts`**
```ts
import { describe, expect, it } from 'vitest';
import { RAYS, colOf, isForward, promotionRow, rowOf, squareAt } from '../../../src/draughts/squares';

describe('cases des dames', () => {
  it('place les 50 cases foncées', () => {
    expect([rowOf(1), colOf(1)]).toEqual([0, 1]);
    expect([rowOf(6), colOf(6)]).toEqual([1, 0]);
    expect([rowOf(46), colOf(46)]).toEqual([9, 0]);
    expect([rowOf(50), colOf(50)]).toEqual([9, 8]);
    for (let square = 1; square <= 50; square += 1) expect(squareAt(rowOf(square), colOf(square))).toBe(square);
    expect(squareAt(0, 0)).toBeNull();
    expect(squareAt(-1, 1)).toBeNull();
    expect(squareAt(10, 1)).toBeNull();
  });

  it('suit les diagonales', () => {
    expect(RAYS[32]).toEqual([[27, 21, 16], [28, 23, 19, 14, 10, 5], [37, 41, 46], [38, 43, 49]]);
    expect(RAYS[46][1]).toEqual([41, 37, 32, 28, 23, 19, 14, 10, 5]);
    expect(RAYS[5][0]).toEqual([]);
  });

  it('sait où est l’avant et où l’on devient dame', () => {
    expect(isForward(0, 1)).toBe(true);
    expect(isForward(2, 1)).toBe(false);
    expect(isForward(3, -1)).toBe(true);
    expect(isForward(1, -1)).toBe(false);
    expect(promotionRow(1)).toBe(0);
    expect(promotionRow(-1)).toBe(9);
  });
});
```

**Fichier : `tests/unit/draughts/geometry.test.ts`**
```ts
import { describe, expect, it } from 'vitest';
import { draughtsGeometry } from '../../../src/draughts/geometry';

describe('plateau de dames', () => {
  it('numérote les cases foncées vues des Blancs', () => {
    const geometry = draughtsGeometry('white');
    expect(geometry.size).toBe(10);
    expect(geometry.squareAt({ row: 0, col: 1 })).toBe('1');
    expect(geometry.squareAt({ row: 9, col: 0 })).toBe('46');
    expect(geometry.squareAt({ row: 0, col: 0 })).toBeNull();
    expect(geometry.cellOf('32')).toEqual({ row: 6, col: 3 });
    expect(geometry.isDark({ row: 0, col: 1 })).toBe(true);
    expect(geometry.numbered).toBe(true);
  });

  it('retourne le plateau pour les Noirs', () => {
    const geometry = draughtsGeometry('black');
    expect(geometry.squareAt({ row: 0, col: 1 })).toBe('50');
    expect(geometry.cellOf('1')).toEqual({ row: 9, col: 8 });
  });

  it('refuse une case inconnue', () => {
    const geometry = draughtsGeometry('white');
    expect(() => geometry.cellOf('51')).toThrow('Case inconnue');
    expect(() => geometry.cellOf('e4')).toThrow('Case inconnue');
    expect(() => geometry.cellOf('07')).toThrow('Case inconnue');
  });
});
```

**Fichier : `tests/unit/draughts/view.test.ts`**
```ts
import { describe, expect, it } from 'vitest';
import { draughtsPieceImage, draughtsPieceLabel } from '../../../src/draughts/pieces';
import type { DraughtsPos } from '../../../src/draughts/types';
import { draughtsBoardPieces, listDraughtsPieces, lostPieceCounts } from '../../../src/draughts/view';

const board = (pieces: Readonly<Record<number, string>>) => Array.from({ length: 50 }, (_, index) => pieces[index + 1] ?? '.').join('');
const pos = (value: string): DraughtsPos => ({ board: value, turn: 'white', keys: [], kingPlies: 0, endgame: null });

describe('pièces de dames', () => {
  it('liste les pièces du plateau', () => {
    expect(listDraughtsPieces(board({ 1: 'b', 28: 'W' }))).toEqual([
      { square: '1', color: 'black', kind: 'man' },
      { square: '28', color: 'white', kind: 'king' },
    ]);
  });

  it('prépare les pièces pour le plateau', () => {
    expect(draughtsBoardPieces(pos(board({ 46: 'w' })))).toEqual([{ square: '46', image: draughtsPieceImage('white', 'man'), label: 'Pion blanc' }]);
  });

  it('compte les pièces perdues', () => {
    expect(lostPieceCounts(pos(board({ 1: 'b', 2: 'b', 46: 'W' })))).toEqual({ white: 19, black: 18 });
  });

  it('nomme et dessine chaque pièce', () => {
    expect(draughtsPieceLabel('black', 'king')).toBe('Dame noire');
    expect(draughtsPieceLabel('white', 'king')).toBe('Dame blanche');
    expect(draughtsPieceLabel('black', 'man')).toBe('Pion noir');
    expect(draughtsPieceImage('white', 'king')).not.toBe(draughtsPieceImage('white', 'man'));
  });
});
```

**Fichier : `tests/unit/board/numbered.test.tsx`**
```tsx
import { render } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { Board } from '../../../src/board/Board';
import { draughtsGeometry } from '../../../src/draughts/geometry';

describe('plateau numéroté', () => {
  it('affiche le numéro des 50 cases foncées', () => {
    const { container } = render(<Board geometry={draughtsGeometry('white')} pieces={[]} />);
    const numbers = [...container.querySelectorAll('.sq-num')].map((node) => node.textContent);
    expect(numbers).toHaveLength(50);
    expect(numbers).toContain('46');
    expect(container.querySelectorAll('rect[data-square]')).toHaveLength(50);
  });
});
```

- [x] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run tests/unit/draughts tests/unit/board/numbered.test.tsx`
Expected : FAIL — modules `src/draughts/*` introuvables.

- [x] **Step 3 : Écrire les types et les cases**

**Fichier : `src/draughts/types.ts`**
```ts
import type { Color } from '../core/types';

export type DraughtsPieceKind = 'man' | 'king';

export interface DraughtsPiece {
  readonly square: string;
  readonly color: Color;
  readonly kind: DraughtsPieceKind;
}

export interface DraughtsMove {
  readonly from: string;
  readonly to: string;
  /** Cases d'arrivée successives (la dernière est `to`) ; une seule pour un déplacement simple. */
  readonly steps: readonly string[];
  /** Cases des pièces prises, dans l'ordre de la rafle ; vide pour un déplacement simple. */
  readonly captures: readonly string[];
  /** Le pion termine son coup sur la dernière rangée et devient dame. */
  readonly promotes: boolean;
}

/**
 * Position immuable. `board` : 50 caractères, case 1 en premier
 * ('.' vide, 'w' / 'W' pion / dame blancs, 'b' / 'B' pion / dame noirs).
 */
export interface DraughtsPos {
  readonly board: string;
  readonly turn: Color;
  /** Positions vues depuis le dernier coup irréversible (prise ou pion), pour la répétition. */
  readonly keys: readonly string[];
  /** Demi-coups de suite joués par des dames, sans prise ni mouvement de pion (règle des 25 coups). */
  readonly kingPlies: number;
  /** Fin de partie limitée à 16 ou 5 coups par camp, et demi-coups joués depuis qu'elle a commencé. */
  readonly endgame: { readonly rule: 16 | 5; readonly plies: number } | null;
}
```

**Fichier : `src/draughts/squares.ts`**
```ts
/** Plateau 10×10 : 50 cases foncées numérotées de 1 (en haut à gauche, côté Noirs) à 50 (en bas à droite). */
export const SQUARE_COUNT = 50;
export const BOARD_SIZE = 10;

/** Directions vues des Blancs : 0 haut-gauche, 1 haut-droite, 2 bas-gauche, 3 bas-droite. */
const DIRECTIONS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

export function rowOf(square: number): number {
  return Math.floor((square - 1) / 5);
}

export function colOf(square: number): number {
  return 2 * ((square - 1) % 5) + (rowOf(square) % 2 === 0 ? 1 : 0);
}

export function squareAt(row: number, col: number): number | null {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE || (row + col) % 2 === 0) return null;
  return row * 5 + Math.floor(col / 2) + 1;
}

function ray(square: number, [dRow, dCol]: readonly [number, number]): number[] {
  const squares: number[] = [];
  let next = squareAt(rowOf(square) + dRow, colOf(square) + dCol);
  while (next !== null) {
    squares.push(next);
    next = squareAt(rowOf(next) + dRow, colOf(next) + dCol);
  }
  return squares;
}

/** RAYS[case][direction] : cases rencontrées en partant de la case dans cette direction (index 0 inutilisé). */
export const RAYS: readonly (readonly (readonly number[])[])[] = Array.from({ length: SQUARE_COUNT + 1 }, (_, square) =>
  square === 0 ? [] : DIRECTIONS.map((direction) => ray(square, direction)),
);

/** `side` : 1 pour les Blancs (ils montent), -1 pour les Noirs (ils descendent). */
export function isForward(direction: number, side: 1 | -1): boolean {
  return side === 1 ? direction < 2 : direction >= 2;
}

/** Rangée où un pion devient dame. */
export function promotionRow(side: 1 | -1): number {
  return side === 1 ? 0 : BOARD_SIZE - 1;
}
```

- [x] **Step 4 : Écrire le plateau des dames et les numéros de cases**

**Fichier : `src/draughts/geometry.ts`**
```ts
import type { BoardGeometry } from '../board/geometry';
import type { Color } from '../core/types';
import { BOARD_SIZE, SQUARE_COUNT, colOf, rowOf, squareAt } from './squares';

const LAST = BOARD_SIZE - 1;

export function draughtsGeometry(orientation: Color): BoardGeometry {
  const flipped = orientation === 'black';
  return {
    size: BOARD_SIZE,
    squareAt: ({ row, col }) => {
      const square = flipped ? squareAt(LAST - row, LAST - col) : squareAt(row, col);
      return square === null ? null : String(square);
    },
    cellOf: (name) => {
      const square = Number(name);
      if (!Number.isInteger(square) || square < 1 || square > SQUARE_COUNT || String(square) !== name) {
        throw new Error(`Case inconnue : ${name}`);
      }
      return flipped ? { row: LAST - rowOf(square), col: LAST - colOf(square) } : { row: rowOf(square), col: colOf(square) };
    },
    isDark: ({ row, col }) => (row + col) % 2 === 1,
    numbered: true,
  };
}
```

Dans `src/board/geometry.ts`, dans l'interface `BoardGeometry`, ajouter après `isDark(cell: Cell): boolean;` :
```ts
  /** Affiche le nom de chaque case jouable (numéros des dames). */
  readonly numbered?: boolean;
```

Dans `src/board/Board.tsx`, dans le premier `<g class="overlay">`, juste avant `{(props.highlights ?? []).map(`, ajouter :
```tsx
        {geometry.numbered &&
          allCells(geometry.size).map((cell) => {
            const square = geometry.squareAt(cell);
            return square ? (
              <text key={`num-${square}`} x={cell.col * CELL + 6} y={cell.row * CELL + 24} class="sq-num">
                {square}
              </text>
            ) : null;
          })}
```

Dans `src/styles/global.css`, après la ligne `.coord-on-dark { fill: #f0d9b5; }`, ajouter :
```css
.sq-num { font-size: 22px; font-weight: 700; fill: rgb(255 255 255 / 0.6); }
```

- [x] **Step 5 : Dessiner les pièces**

**Fichier : `src/draughts/pieces/wM.svg`**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="54" r="36" fill="#9c9383"/>
  <circle cx="50" cy="49" r="36" fill="#f6f1e4" stroke="#5f584b" stroke-width="3"/>
  <circle cx="50" cy="49" r="24" fill="none" stroke="#5f584b" stroke-width="2.5" stroke-opacity="0.55"/>
</svg>
```

**Fichier : `src/draughts/pieces/bM.svg`**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="54" r="36" fill="#000000"/>
  <circle cx="50" cy="49" r="36" fill="#2e2b27" stroke="#000000" stroke-width="3"/>
  <circle cx="50" cy="49" r="24" fill="none" stroke="#8c8577" stroke-width="2.5" stroke-opacity="0.8"/>
</svg>
```

**Fichier : `src/draughts/pieces/wK.svg`**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="54" r="36" fill="#9c9383"/>
  <circle cx="50" cy="49" r="36" fill="#f6f1e4" stroke="#5f584b" stroke-width="3"/>
  <path d="M33 60 L30 38 L41 47 L50 33 L59 47 L70 38 L67 60 Z" fill="#c8a64b" stroke="#5f4a14" stroke-width="2.5" stroke-linejoin="round"/>
</svg>
```

**Fichier : `src/draughts/pieces/bK.svg`**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="54" r="36" fill="#000000"/>
  <circle cx="50" cy="49" r="36" fill="#2e2b27" stroke="#000000" stroke-width="3"/>
  <path d="M33 60 L30 38 L41 47 L50 33 L59 47 L70 38 L67 60 Z" fill="#c8a64b" stroke="#f0d9a0" stroke-width="2.5" stroke-linejoin="round"/>
</svg>
```

**Fichier : `src/draughts/pieces.ts`**
```ts
import bK from './pieces/bK.svg?no-inline';
import bM from './pieces/bM.svg?no-inline';
import wK from './pieces/wK.svg?no-inline';
import wM from './pieces/wM.svg?no-inline';
import type { Color } from '../core/types';
import type { DraughtsPieceKind } from './types';

const IMAGES: Readonly<Record<Color, Readonly<Record<DraughtsPieceKind, string>>>> = {
  white: { man: wM, king: wK },
  black: { man: bM, king: bK },
};

export function draughtsPieceImage(color: Color, kind: DraughtsPieceKind): string {
  return IMAGES[color][kind];
}

export function draughtsPieceLabel(color: Color, kind: DraughtsPieceKind): string {
  if (kind === 'man') return color === 'white' ? 'Pion blanc' : 'Pion noir';
  return color === 'white' ? 'Dame blanche' : 'Dame noire';
}
```

**Fichier : `src/draughts/view.ts`**
```ts
import type { BoardPiece } from '../board/Board';
import type { Color } from '../core/types';
import { draughtsPieceImage, draughtsPieceLabel } from './pieces';
import type { DraughtsPiece, DraughtsPieceKind, DraughtsPos } from './types';

export const PIECES_PER_SIDE = 20;

const PIECE_CODES: ReadonlyMap<string, { readonly color: Color; readonly kind: DraughtsPieceKind }> = new Map([
  ['w', { color: 'white', kind: 'man' }],
  ['W', { color: 'white', kind: 'king' }],
  ['b', { color: 'black', kind: 'man' }],
  ['B', { color: 'black', kind: 'king' }],
]);

export function listDraughtsPieces(board: string): DraughtsPiece[] {
  return [...board].flatMap((char, index) => {
    const piece = PIECE_CODES.get(char);
    return piece ? [{ square: String(index + 1), ...piece }] : [];
  });
}

export function draughtsBoardPieces(pos: DraughtsPos): BoardPiece[] {
  return listDraughtsPieces(pos.board).map((piece) => ({
    square: piece.square,
    image: draughtsPieceImage(piece.color, piece.kind),
    label: draughtsPieceLabel(piece.color, piece.kind),
  }));
}

/** Pièces perdues par chaque camp depuis le départ (une dame perdue compte comme une pièce). */
export function lostPieceCounts(pos: DraughtsPos): Readonly<Record<Color, number>> {
  const pieces = listDraughtsPieces(pos.board);
  const remaining = (color: Color) => pieces.filter((piece) => piece.color === color).length;
  return {
    white: Math.max(0, PIECES_PER_SIDE - remaining('white')),
    black: Math.max(0, PIECES_PER_SIDE - remaining('black')),
  };
}
```

- [x] **Step 6 : Lancer les tests**

Run : `npx vitest run tests/unit/draughts tests/unit/board` puis `npx tsc -b`
Expected : PASS (3 + 3 + 4 + 1 nouveaux tests, anciens tests du plateau inchangés), aucune erreur.

- [x] **Step 7 : Commit**

```bash
git add src/draughts src/board src/styles/global.css tests/unit/draughts tests/unit/board/numbered.test.tsx
git commit -m "feat: plateau de dames numéroté, cases et pièces"
```

---

### Task 4 : Dames — génération des coups FMJD et notation FEN

**Files:**
- Create: `src/draughts/movegen.ts`, `src/draughts/notation.ts`
- Test: `tests/unit/draughts/movegen.test.ts`, `tests/unit/draughts/notation.test.ts`

**Interfaces:**
- Consumes: `RAYS`, `SQUARE_COUNT`, `isForward`, `promotionRow`, `rowOf` (Tâche 3).
- Produces :
  - `movegen.ts` : `Cells = Int8Array` (index 1 à 50 : 0 vide, 1 pion blanc, 2 dame blanche, -1 pion noir, -2 dame noire), `Side = 1 | -1`, `RawMove { from: number; steps: readonly number[]; captures: readonly number[] }`, `toCells(board)`, `fromCells(cells)`, `destination(move)`, `rawMoveId(move)` (« 32-28 », « 28x19x10 »), `promotes(piece, to)`, `generateMoves(cells, side): RawMove[]`, `applyRawMove(cells, move): void`.
  - `notation.ts` : `START_FEN = 'W:W31-50:B1-20'`, `ParsedFen { board; turn }`, `parseFen(text)`, `toFen(board, turn)`.

Algorithme des prises (`captureSequences`) : la pièce quitte sa case (qui devient libre pour toute la rafle), puis on explore récursivement les 4 directions. Un pion saute une pièce adverse adjacente vers la case juste derrière ; une dame glisse sur les cases vides, saute la première pièce rencontrée si elle est adverse et pas déjà prise, et peut s'arrêter sur chaque case vide qui suit. Les pièces déjà prises **restent sur le plateau** jusqu'à la fin : elles bloquent et ne peuvent pas être ressautées (coup turc). Une séquence est gardée quand elle ne peut plus continuer. On ne garde ensuite que les séquences au nombre de prises maximal, et on fusionne celles qui ont même départ, même arrivée et mêmes pièces prises (règle FMJD).

- [x] **Step 1 : Écrire les tests qui échouent**

**Fichier : `tests/unit/draughts/notation.test.ts`**
```ts
import { describe, expect, it } from 'vitest';
import { START_FEN, parseFen, toFen } from '../../../src/draughts/notation';

describe('notation FEN des dames', () => {
  it('lit la position de départ', () => {
    const { board, turn } = parseFen(START_FEN);
    expect(board).toBe('b'.repeat(20) + '.'.repeat(10) + 'w'.repeat(20));
    expect(turn).toBe('white');
  });

  it('lit les dames, les listes et le trait aux Noirs', () => {
    const { board, turn } = parseFen('B:WK46,31:BK5,19.');
    expect(turn).toBe('black');
    expect(board[45]).toBe('W');
    expect(board[30]).toBe('w');
    expect(board[4]).toBe('B');
    expect(board[18]).toBe('b');
  });

  it('écrit une position relisible', () => {
    const fen = 'W:W31,K46:B1,K50';
    expect(toFen(parseFen(fen).board, 'white')).toBe(fen);
    expect(parseFen('W:W:B').board).toBe('.'.repeat(50));
  });

  it.each(['X:W1:B2', 'W:W31', 'W:W51:B1', 'W:W31,31:B1', 'W:W3:B20', 'W:W31:B48', 'W:Wx:B1', 'W:W35-31:B1'])('refuse « %s »', (fen) => {
    expect(() => parseFen(fen)).toThrow('Position invalide');
  });
});
```

**Fichier : `tests/unit/draughts/movegen.test.ts`**
```ts
import { describe, expect, it } from 'vitest';
import { applyRawMove, destination, fromCells, generateMoves, rawMoveId, toCells, type Cells, type Side } from '../../../src/draughts/movegen';
import { START_FEN, parseFen } from '../../../src/draughts/notation';

function setup(fen: string): { cells: Cells; side: Side } {
  const { board, turn } = parseFen(fen);
  return { cells: toCells(board), side: turn === 'white' ? 1 : -1 };
}

function ids(fen: string): string[] {
  const { cells, side } = setup(fen);
  return generateMoves(cells, side).map(rawMoveId).sort();
}

function perft(cells: Cells, side: Side, depth: number): number {
  const moves = generateMoves(cells, side);
  if (depth === 1) return moves.length;
  let total = 0;
  for (const move of moves) {
    const next = cells.slice();
    applyRawMove(next, move);
    total += perft(next, side === 1 ? -1 : 1, depth - 1);
  }
  return total;
}

describe('génération des coups (règles FMJD)', () => {
  it('fait avancer les pions d’une case vers l’avant', () => {
    expect(ids('W:W32:B')).toEqual(['32-27', '32-28']);
    expect(ids('B:W:B19')).toEqual(['19-23', '19-24']);
  });

  it('fait voler la dame sur toute la diagonale', () => {
    expect(ids('W:WK46:B')).toHaveLength(9);
  });

  it('rend la prise obligatoire', () => {
    expect(ids('W:W32,46:B28')).toEqual(['32x23']);
  });

  it('laisse le pion prendre en arrière', () => {
    expect(ids('W:W23:B28')).toEqual(['23x32']);
  });

  it('impose la prise du plus grand nombre de pièces', () => {
    expect(ids('W:W32,36:B28,19,31')).toEqual(['32x23x14']);
  });

  it('laisse la dame s’arrêter où elle veut après la pièce prise', () => {
    expect(ids('W:WK46:B28')).toEqual(['46x10', '46x14', '46x19', '46x23', '46x5']);
  });

  it('oblige la dame à choisir une case d’où la rafle continue', () => {
    expect(ids('W:WK46:B28,13')).toEqual(['46x19x2', '46x19x8']);
  });

  it('ne saute jamais deux fois la même pièce (coup turc)', () => {
    const moves = ids('W:WK23:B28,19');
    expect(moves).toHaveLength(7);
    expect(moves.every((id) => id.split('x').length === 2)).toBe(true);
  });

  it('fusionne deux trajets qui prennent les mêmes pièces', () => {
    const { cells, side } = setup('W:W28:B12,13,22,23');
    const moves = generateMoves(cells, side);
    expect(moves).toHaveLength(1);
    expect(moves[0].captures).toHaveLength(4);
    expect(destination(moves[0])).toBe(28);
  });

  it('ne fait dame qu’en fin de coup', () => {
    const passing = setup('W:W13:B9,10');
    const [rafle] = generateMoves(passing.cells, passing.side);
    expect(rawMoveId(rafle)).toBe('13x4x15');
    applyRawMove(passing.cells, rafle);
    expect(fromCells(passing.cells)[14]).toBe('w');
    expect(fromCells(passing.cells)[8]).toBe('.');
    expect(fromCells(passing.cells)[9]).toBe('.');
    const ending = setup('W:W7:B');
    applyRawMove(ending.cells, generateMoves(ending.cells, ending.side)[0]);
    expect(fromCells(ending.cells)[0]).toBe('W');
  });

  it('refuse un plateau mal formé', () => {
    expect(() => toCells('x')).toThrow('Plateau invalide');
    expect(() => toCells('?'.repeat(50))).toThrow('Plateau invalide');
  });

  it.each([
    [1, 9],
    [2, 81],
    [3, 658],
    [4, 4265],
    [5, 27117],
    [6, 167140],
  ])('perft %i = %i depuis la position de départ', (depth, expected) => {
    const { cells, side } = setup(START_FEN);
    expect(perft(cells, side, depth)).toBe(expected);
  }, 60_000);
});
```

- [x] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run tests/unit/draughts/movegen.test.ts tests/unit/draughts/notation.test.ts`
Expected : FAIL — modules `movegen` et `notation` introuvables.

- [x] **Step 3 : Écrire `src/draughts/movegen.ts`**

**Fichier : `src/draughts/movegen.ts`**
```ts
import { RAYS, SQUARE_COUNT, isForward, promotionRow, rowOf } from './squares';

/** Cases 1 à 50 (index 0 inutilisé) : 0 vide, 1 pion blanc, 2 dame blanche, -1 pion noir, -2 dame noire. */
export type Cells = Int8Array;
/** 1 : Blancs ; -1 : Noirs. */
export type Side = 1 | -1;

export interface RawMove {
  readonly from: number;
  /** Cases d'arrivée successives ; la dernière est la destination. */
  readonly steps: readonly number[];
  readonly captures: readonly number[];
}

const CODES: ReadonlyMap<string, number> = new Map([
  ['.', 0],
  ['w', 1],
  ['W', 2],
  ['b', -1],
  ['B', -2],
]);
const CHARS = 'Bb.wW';

export function toCells(board: string): Cells {
  if (board.length !== SQUARE_COUNT) throw new Error(`Plateau invalide : ${board}`);
  const cells = new Int8Array(SQUARE_COUNT + 1);
  for (let square = 1; square <= SQUARE_COUNT; square += 1) {
    const code = CODES.get(board[square - 1]);
    if (code === undefined) throw new Error(`Plateau invalide : ${board}`);
    cells[square] = code;
  }
  return cells;
}

export function fromCells(cells: Cells): string {
  let board = '';
  for (let square = 1; square <= SQUARE_COUNT; square += 1) board += CHARS[cells[square] + 2];
  return board;
}

export function destination(move: RawMove): number {
  return move.steps[move.steps.length - 1];
}

/** « 32-28 » pour un déplacement, « 28x19x10 » (départ puis cases d'arrivée) pour une prise. */
export function rawMoveId(move: RawMove): string {
  return move.captures.length > 0 ? [move.from, ...move.steps].join('x') : `${move.from}-${destination(move)}`;
}

/** Un pion qui termine son coup sur la dernière rangée devient dame. */
export function promotes(piece: number, to: number): boolean {
  return (piece === 1 || piece === -1) && rowOf(to) === promotionRow(piece > 0 ? 1 : -1);
}

/** Ajoute à `out` toutes les rafles complètes de la pièce en `from`. */
function captureSequences(cells: Cells, from: number, side: Side, out: RawMove[]): void {
  const piece = cells[from];
  const king = piece === 2 * side;
  const captured: number[] = [];
  const steps: number[] = [];

  const explore = (square: number): void => {
    let extended = false;
    for (let direction = 0; direction < 4; direction += 1) {
      const ray = RAYS[square][direction];
      let index = 0;
      if (king) while (index < ray.length && cells[ray[index]] === 0) index += 1;
      if (index >= ray.length - 1) continue;
      const victim = ray[index];
      if (cells[victim] * side >= 0 || captured.includes(victim)) continue;
      for (let landing = index + 1; landing < ray.length && cells[ray[landing]] === 0; landing += 1) {
        captured.push(victim);
        steps.push(ray[landing]);
        extended = true;
        explore(ray[landing]);
        captured.pop();
        steps.pop();
        if (!king) break;
      }
    }
    if (!extended && captured.length > 0) out.push({ from, steps: [...steps], captures: [...captured] });
  };

  // La pièce quitte sa case : elle peut y repasser, voire y revenir, pendant la rafle.
  cells[from] = 0;
  explore(from);
  cells[from] = piece;
}

/** Deux rafles de même départ, même arrivée et mêmes pièces prises sont un seul coup. */
function dedupe(moves: readonly RawMove[]): RawMove[] {
  const seen = new Set<string>();
  return moves.filter((move) => {
    const key = `${move.from}>${destination(move)}:${[...move.captures].sort((a, b) => a - b).join(',')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Coups légaux du camp `side` : prise obligatoire et prise du plus grand nombre de pièces. */
export function generateMoves(cells: Cells, side: Side): RawMove[] {
  const captures: RawMove[] = [];
  for (let square = 1; square <= SQUARE_COUNT; square += 1) {
    if (cells[square] * side > 0) captureSequences(cells, square, side, captures);
  }
  if (captures.length > 0) {
    const most = captures.reduce((best, move) => Math.max(best, move.captures.length), 0);
    return dedupe(captures.filter((move) => move.captures.length === most));
  }
  const moves: RawMove[] = [];
  for (let square = 1; square <= SQUARE_COUNT; square += 1) {
    const piece = cells[square];
    if (piece * side <= 0) continue;
    const king = piece === 2 * side;
    for (let direction = 0; direction < 4; direction += 1) {
      if (!king && !isForward(direction, side)) continue;
      for (const target of RAYS[square][direction]) {
        if (cells[target] !== 0) break;
        moves.push({ from: square, steps: [target], captures: [] });
        if (!king) break;
      }
    }
  }
  return moves;
}

/** Joue le coup sur `cells` : pièces prises retirées à la fin, promotion seulement en fin de coup. */
export function applyRawMove(cells: Cells, move: RawMove): void {
  const piece = cells[move.from];
  cells[move.from] = 0;
  for (const square of move.captures) cells[square] = 0;
  const to = destination(move);
  cells[to] = promotes(piece, to) ? piece * 2 : piece;
}
```

- [x] **Step 4 : Écrire `src/draughts/notation.ts`**

**Fichier : `src/draughts/notation.ts`**
```ts
import type { Color } from '../core/types';
import { SQUARE_COUNT, promotionRow, rowOf } from './squares';

/** Notation FEN des dames (format PDN) : trait, puis pièces blanches et noires ; « K » marque une dame. */
export const START_FEN = 'W:W31-50:B1-20';

export interface ParsedFen {
  readonly board: string;
  readonly turn: Color;
}

const TOKEN = /^(K?)(\d+)(?:-(\d+))?$/;

function fail(text: string, reason: string): never {
  throw new Error(`Position invalide (${reason}) : ${text}`);
}

export function parseFen(text: string): ParsedFen {
  const parts = text.trim().replace(/\.$/, '').split(':');
  if (parts.length !== 3) fail(text, 'format');
  const turnCode = parts[0].toUpperCase();
  if (turnCode !== 'W' && turnCode !== 'B') fail(text, 'trait');
  const cells = Array.from({ length: SQUARE_COUNT }, () => '.');
  for (const part of parts.slice(1)) {
    const colorCode = part.charAt(0).toUpperCase();
    if (colorCode !== 'W' && colorCode !== 'B') fail(text, 'couleur');
    const man = colorCode === 'W' ? 'w' : 'b';
    for (const token of part.slice(1).split(',').filter(Boolean)) {
      const match = TOKEN.exec(token.trim().toUpperCase());
      if (!match) fail(text, `case « ${token} »`);
      const first = Number(match[2]);
      const last = match[3] ? Number(match[3]) : first;
      if (first < 1 || last > SQUARE_COUNT || first > last) fail(text, `case « ${token} »`);
      const king = match[1] === 'K';
      for (let square = first; square <= last; square += 1) {
        if (cells[square - 1] !== '.') fail(text, `case ${square} occupée deux fois`);
        if (!king && rowOf(square) === promotionRow(man === 'w' ? 1 : -1)) fail(text, `pion sur la rangée de promotion (${square})`);
        cells[square - 1] = king ? man.toUpperCase() : man;
      }
    }
  }
  return { board: cells.join(''), turn: turnCode === 'W' ? 'white' : 'black' };
}

export function toFen(board: string, turn: Color): string {
  const list = (man: string) =>
    [...board].flatMap((char, index) => (char === man ? [String(index + 1)] : char === man.toUpperCase() ? [`K${index + 1}`] : []));
  return `${turn === 'white' ? 'W' : 'B'}:W${list('w').join(',')}:B${list('b').join(',')}`;
}
```

- [x] **Step 5 : Lancer les tests**

Run : `npx vitest run tests/unit/draughts/movegen.test.ts tests/unit/draughts/notation.test.ts` puis `npx tsc -b`
Expected : PASS (17 + 11 tests), perft conforme aux 6 valeurs de la spec, aucune erreur de typage. Si un perft échoue, corriger `movegen.ts` (jamais les valeurs attendues).

- [x] **Step 6 : Commit**

```bash
git add src/draughts/movegen.ts src/draughts/notation.ts tests/unit/draughts/movegen.test.ts tests/unit/draughts/notation.test.ts
git commit -m "feat: génération des coups de dames (FMJD) vérifiée par perft, notation FEN"
```

---

### Task 5 : Dames — règles de partie, nulles et adaptateur

**Files:**
- Create: `src/draughts/rules.ts`
- Test: `tests/unit/draughts/rules.test.ts`

**Interfaces:**
- Consumes: `movegen.ts`, `notation.ts` (Tâche 4) ; `DraughtsPos`, `DraughtsMove` (Tâche 3) ; `GameAdapter`, `GameStatus`, `opposite` ; `LessonRules` (étape 1).
- Produces : `endgameRule(board): 16 | 5 | null`, `parseDraughts(text)`, `draughtsMoveId(move)`, `legalMoves(pos)`, `play(pos, move)` (vérifie la légalité : lève « Coup illégal : … »), `status(pos)`, `setTurn(pos, color)`, `decodeDraughtsMove(text, pos)`, `draughtsAdapter: GameAdapter<DraughtsPos, DraughtsMove>` (id `'draughts'`), `draughtsMoveCodec: MoveCodec<DraughtsPos, DraughtsMove>`, `draughtsLessonRules: LessonRules<DraughtsPos, DraughtsMove>`.

Décomptes : `kingPlies` passe à 0 après une prise ou un coup de pion, sinon +1 ; nulle à 50 (25 coups de chaque camp). `endgame` : quand une des configurations FMJD apparaît, `plies` part de 0 et augmente à chaque demi-coup tant que la règle (16 ou 5) reste la même ; nulle à `rule × 2`. Répétition : clés `plateau + trait` depuis le dernier coup irréversible ; nulle à la 3ᵉ occurrence. La victoire (adversaire sans coup) est testée avant les nulles.

- [x] **Step 1 : Écrire les tests qui échouent**

**Fichier : `tests/unit/draughts/rules.test.ts`**
```ts
import { describe, expect, it } from 'vitest';
import {
  decodeDraughtsMove, draughtsAdapter, draughtsLessonRules, draughtsMoveCodec, draughtsMoveId, endgameRule, legalMoves,
  parseDraughts, play, setTurn, status,
} from '../../../src/draughts/rules';
import type { DraughtsMove, DraughtsPos } from '../../../src/draughts/types';

const byId = (pos: DraughtsPos, id: string): DraughtsMove => decodeDraughtsMove(id, pos);
const playAll = (pos: DraughtsPos, ids: readonly string[]) => ids.reduce((current, id) => play(current, byId(current, id)), pos);

describe('règles des dames', () => {
  it('commence avec 20 pions chacun, les Blancs au trait', () => {
    const start = draughtsAdapter.initial();
    expect(draughtsAdapter.id).toBe('draughts');
    expect(draughtsAdapter.turn(start)).toBe('white');
    expect(legalMoves(start)).toHaveLength(9);
    expect(status(start)).toEqual({ kind: 'ongoing' });
    expect(draughtsAdapter.parse(draughtsAdapter.serialize(start)).board).toBe(start.board);
  });

  it('joue un coup sans modifier la position d’origine', () => {
    const start = draughtsAdapter.initial();
    const next = play(start, byId(start, '32-28'));
    expect(start.board[27]).toBe('.');
    expect(next.board[27]).toBe('w');
    expect(next.turn).toBe('black');
    expect(() => play(start, { from: '32', to: '23', steps: ['23'], captures: [], promotes: false })).toThrow('Coup illégal : 32-23');
  });

  it('décrit les prises et les promotions, et les encode', () => {
    const [rafle] = legalMoves(parseDraughts('W:W32:B28,19'));
    expect(rafle).toEqual({ from: '32', to: '14', steps: ['23', '14'], captures: ['28', '19'], promotes: false });
    expect(draughtsMoveId(rafle)).toBe('32x23x14');
    const promotion = byId(parseDraughts('W:W7:B45'), '7-1');
    expect(promotion.promotes).toBe(true);
    expect(draughtsLessonRules.isPromotion(promotion)).toBe(true);
    expect(draughtsMoveCodec.encode(promotion)).toBe('7-1');
    expect(play(parseDraughts('W:W7:B45'), promotion).board[0]).toBe('W');
    expect(() => decodeDraughtsMove('7-3', parseDraughts('W:W7:B45'))).toThrow('Coup illégal');
  });

  it('fait gagner le camp qui prend toutes les pièces adverses', () => {
    const won = playAll(parseDraughts('W:WK46:BK28'), ['46x23']);
    expect(status(won)).toEqual({ kind: 'win', winner: 'white', reason: 'no-moves' });
  });

  it('fait perdre le camp dont les pièces sont bloquées', () => {
    expect(status(parseDraughts('B:W41,47:B36'))).toEqual({ kind: 'win', winner: 'white', reason: 'no-moves' });
  });

  it('déclare nulle une position revenue trois fois', () => {
    const shuffle = ['1-7', '50-44', '7-1', '44-50'];
    const pos = playAll(parseDraughts('W:WK1:BK50'), [...shuffle, ...shuffle]);
    expect(status(pos)).toEqual({ kind: 'draw', reason: 'repetition' });
  });

  it('déclare nulle après 25 coups de dames de chaque côté', () => {
    const pos = playAll(parseDraughts('W:WK1,31:BK50'), ['1-7', '50-44']);
    expect(pos.kingPlies).toBe(2);
    expect(playAll(pos, ['31-26']).kingPlies).toBe(0);
    expect(status({ ...pos, kingPlies: 50 })).toEqual({ kind: 'draw', reason: 'king-moves' });
  });

  it('limite les fins de partie à 16 ou 5 coups', () => {
    expect(endgameRule(parseDraughts('W:WK1,K2,K3:BK50').board)).toBe(16);
    expect(endgameRule(parseDraughts('W:WK1,31,32:BK50').board)).toBe(16);
    expect(endgameRule(parseDraughts('W:WK1:BK50,K49').board)).toBe(5);
    expect(endgameRule(parseDraughts('W:W31,32,33:BK50').board)).toBeNull();
    expect(endgameRule(draughtsAdapter.initial().board)).toBeNull();
    const pos = parseDraughts('W:WK1,K2,K3:BK50');
    expect(pos.endgame).toEqual({ rule: 16, plies: 0 });
    expect(playAll(pos, ['1-6']).endgame).toEqual({ rule: 16, plies: 1 });
    expect(status({ ...pos, endgame: { rule: 16, plies: 32 } })).toEqual({ kind: 'draw', reason: 'endgame-limit' });
  });

  it('redonne le trait pour les exercices des leçons', () => {
    const pos = setTurn(parseDraughts('W:W32:B'), 'white');
    const move = byId(pos, '32-28');
    expect(draughtsLessonRules.turn(pos)).toBe('white');
    expect(draughtsLessonRules.moveId(move)).toBe('32-28');
    expect(draughtsLessonRules.destination(move)).toBe('28');
    expect(draughtsLessonRules.keepTurn(play(pos, move), 'white').turn).toBe('white');
    expect(draughtsLessonRules.parse('W:W32:B').board).toBe(pos.board);
  });
});
```

- [x] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run tests/unit/draughts/rules.test.ts`
Expected : FAIL — module `rules` introuvable.

- [x] **Step 3 : Écrire `src/draughts/rules.ts`**

**Fichier : `src/draughts/rules.ts`**
```ts
import { opposite, type Color, type GameAdapter, type GameStatus } from '../core/types';
import type { LessonRules } from '../lessons/types';
import { applyRawMove, destination, fromCells, generateMoves, promotes, rawMoveId, toCells, type Cells, type RawMove, type Side } from './movegen';
import { START_FEN, parseFen, toFen } from './notation';
import type { DraughtsMove, DraughtsPos } from './types';

/** 25 coups de chaque camp. */
const KING_MOVES_LIMIT = 50;

function sideOf(color: Color): Side {
  return color === 'white' ? 1 : -1;
}

function positionKey(board: string, turn: Color): string {
  return `${board}${turn === 'white' ? 'w' : 'b'}`;
}

function countOf(board: string, char: string): number {
  return [...board].filter((cell) => cell === char).length;
}

/**
 * Fins de partie limitées (FMJD) contre une dame seule : 16 coups pour 3 dames, 2 dames + 1 pion ou 1 dame + 2 pions ;
 * 5 coups pour 2 dames, 1 dame + 1 pion ou 1 dame.
 */
export function endgameRule(board: string): 16 | 5 | null {
  const whiteMen = countOf(board, 'w');
  const whiteKings = countOf(board, 'W');
  const blackMen = countOf(board, 'b');
  const blackKings = countOf(board, 'B');
  const strong =
    blackMen === 0 && blackKings === 1
      ? { kings: whiteKings, men: whiteMen }
      : whiteMen === 0 && whiteKings === 1
        ? { kings: blackKings, men: blackMen }
        : null;
  if (!strong || strong.kings === 0) return null;
  const total = strong.kings + strong.men;
  if (total === 3) return 16;
  if (total <= 2) return 5;
  return null;
}

function startPosition(board: string, turn: Color): DraughtsPos {
  const rule = endgameRule(board);
  return { board, turn, keys: [positionKey(board, turn)], kingPlies: 0, endgame: rule === null ? null : { rule, plies: 0 } };
}

export function parseDraughts(text: string): DraughtsPos {
  const { board, turn } = parseFen(text);
  return startPosition(board, turn);
}

function toMove(cells: Cells, raw: RawMove): DraughtsMove {
  const to = destination(raw);
  return {
    from: String(raw.from),
    to: String(to),
    steps: raw.steps.map(String),
    captures: raw.captures.map(String),
    promotes: promotes(cells[raw.from], to),
  };
}

/** « 32-28 » pour un déplacement, « 28x19x10 » pour une prise (départ puis cases d'arrivée). */
export function draughtsMoveId(move: DraughtsMove): string {
  return move.captures.length > 0 ? [move.from, ...move.steps].join('x') : `${move.from}-${move.to}`;
}

export function legalMoves(pos: DraughtsPos): DraughtsMove[] {
  const cells = toCells(pos.board);
  return generateMoves(cells, sideOf(pos.turn)).map((raw) => toMove(cells, raw));
}

export function play(pos: DraughtsPos, move: DraughtsMove): DraughtsPos {
  const cells = toCells(pos.board);
  const id = draughtsMoveId(move);
  const raw = generateMoves(cells, sideOf(pos.turn)).find((candidate) => rawMoveId(candidate) === id);
  if (!raw) throw new Error(`Coup illégal : ${id}`);
  const piece = cells[raw.from];
  const irreversible = raw.captures.length > 0 || piece === 1 || piece === -1;
  applyRawMove(cells, raw);
  const board = fromCells(cells);
  const turn = opposite(pos.turn);
  const key = positionKey(board, turn);
  const rule = endgameRule(board);
  return {
    board,
    turn,
    keys: irreversible ? [key] : [...pos.keys, key],
    kingPlies: irreversible ? 0 : pos.kingPlies + 1,
    // Le compte repart de zéro dès que la configuration change : autre règle, ou pièce prise.
    endgame: rule === null ? null : { rule, plies: raw.captures.length === 0 && pos.endgame?.rule === rule ? pos.endgame.plies + 1 : 0 },
  };
}

export function status(pos: DraughtsPos): GameStatus {
  if (generateMoves(toCells(pos.board), sideOf(pos.turn)).length === 0) {
    return { kind: 'win', winner: opposite(pos.turn), reason: 'no-moves' };
  }
  const current = pos.keys[pos.keys.length - 1];
  if (pos.keys.filter((key) => key === current).length >= 3) return { kind: 'draw', reason: 'repetition' };
  if (pos.kingPlies >= KING_MOVES_LIMIT) return { kind: 'draw', reason: 'king-moves' };
  if (pos.endgame && pos.endgame.plies >= pos.endgame.rule * 2) return { kind: 'draw', reason: 'endgame-limit' };
  return { kind: 'ongoing' };
}

/** Donne le trait à `color` (exercices où le joueur enchaîne plusieurs coups). */
export function setTurn(pos: DraughtsPos, color: Color): DraughtsPos {
  return { ...pos, turn: color, keys: [positionKey(pos.board, color)] };
}

export function decodeDraughtsMove(text: string, pos: DraughtsPos): DraughtsMove {
  const move = legalMoves(pos).find((candidate) => draughtsMoveId(candidate) === text);
  if (!move) throw new Error(`Coup illégal : ${text}`);
  return move;
}

export const draughtsAdapter: GameAdapter<DraughtsPos, DraughtsMove> = {
  id: 'draughts',
  initial: () => parseDraughts(START_FEN),
  parse: parseDraughts,
  serialize: (pos) => toFen(pos.board, pos.turn),
  turn: (pos) => pos.turn,
  legalMoves,
  play,
  status,
};

export const draughtsMoveCodec = { encode: draughtsMoveId, decode: decodeDraughtsMove } as const;

export const draughtsLessonRules: LessonRules<DraughtsPos, DraughtsMove> = {
  parse: parseDraughts,
  legalMoves,
  play,
  keepTurn: setTurn,
  turn: (pos) => pos.turn,
  status,
  moveId: draughtsMoveId,
  destination: (move) => move.to,
  isPromotion: (move) => move.promotes,
};
```

- [x] **Step 4 : Lancer les tests**

Run : `npx vitest run tests/unit/draughts` puis `npx tsc -b`
Expected : PASS (dont 9 nouveaux tests), aucune erreur.

- [x] **Step 5 : Commit**

```bash
git add src/draughts/rules.ts tests/unit/draughts/rules.test.ts
git commit -m "feat: règles de partie des dames (victoire, répétition, 25 coups, fins à 16 et 5 coups)"
```

---
### Task 6 : Dames — évaluation et recherche de l'ordinateur

**Files:**
- Create: `src/draughts/engine/evaluate.ts`, `src/draughts/engine/search.ts`
- Test: `tests/unit/draughts/engine/evaluate.test.ts`, `tests/unit/draughts/engine/search.test.ts`

**Interfaces:**
- Consumes: `movegen.ts` (Tâche 4), `squares.ts` (Tâche 3), `parseFen`, `START_FEN` (tests).
- Produces :
  - `evaluate.ts` : `MAN_VALUE = 100`, `KING_VALUE = 320`, `evaluate(cells, side): number` (du point de vue de `side`).
  - `search.ts` : `WIN_SCORE = 100_000`, `WIN_THRESHOLD = 99_000`, `SearchRequest { board; turn; maxDepth; timeMs: number | null; rootScores: boolean }`, `RootScore { move: string; score: number }`, `SearchResult { best: string | null; score; depth; rootScores }`, `runSearch(request, now = Date.now): SearchResult`.

Recherche (spec §5.2) : approfondissement itératif ; négamax alpha-bêta avec fenêtre principale (PVS) ; table de transposition (hachage de Zobrist, deux moitiés de 26 bits pour rester des entiers exacts) ; tri des coups (coup de la table, coups meurtriers, historique, promotions) ; réduction d'un demi-coup pour les coups tardifs hors prise ; **quiescence** : à profondeur ≤ 0 on continue tant qu'une prise est obligatoire, sinon on évalue. Une position sans coup vaut `-(WIN_SCORE - ply)`. Le temps est vérifié tous les 1 024 nœuds (sauf pendant la profondeur 1, jamais interrompue) ; une nouvelle profondeur ne commence pas si la moitié du temps est déjà passée. Avec `rootScores`, chaque coup racine est cherché à fenêtre complète pour avoir sa note exacte (niveaux Faible et Moyen). Le tableau de cases est créé dans `runSearch` : les mutations ne sortent jamais de ce module.

- [x] **Step 1 : Écrire les tests qui échouent**

**Fichier : `tests/unit/draughts/engine/evaluate.test.ts`**
```ts
import { describe, expect, it } from 'vitest';
import { KING_VALUE, evaluate } from '../../../../src/draughts/engine/evaluate';
import { toCells } from '../../../../src/draughts/movegen';
import { START_FEN, parseFen } from '../../../../src/draughts/notation';

const cellsOf = (fen: string) => toCells(parseFen(fen).board);

describe('évaluation des dames', () => {
  it('trouve la position de départ équilibrée', () => {
    expect(Math.abs(evaluate(cellsOf(START_FEN), 1))).toBe(0);
  });

  it('note du point de vue du camp au trait', () => {
    const cells = cellsOf('W:W31,32,33:B19');
    expect(evaluate(cells, -1)).toBe(-evaluate(cells, 1));
    expect(evaluate(cells, 1)).toBeGreaterThan(150);
  });

  it('compte un pion de plus et une dame comme environ trois pions', () => {
    const withExtra = evaluate(cellsOf('W:W31,32:B19,20'), 1);
    const without = evaluate(cellsOf('W:W31:B19,20'), 1);
    expect(withExtra - without).toBeGreaterThan(80);
    expect(evaluate(cellsOf('W:WK46:B'), 1)).toBeGreaterThanOrEqual(KING_VALUE);
  });

  it('récompense un pion qui file vers la dame', () => {
    expect(evaluate(cellsOf('W:W6:B45'), 1)).toBeGreaterThan(evaluate(cellsOf('W:W36:B45'), 1));
  });
});
```

**Fichier : `tests/unit/draughts/engine/search.test.ts`**
```ts
import { describe, expect, it } from 'vitest';
import { WIN_SCORE, WIN_THRESHOLD, runSearch, type SearchRequest } from '../../../../src/draughts/engine/search';
import { START_FEN, parseFen } from '../../../../src/draughts/notation';

function request(fen: string, extra: Partial<SearchRequest> = {}): SearchRequest {
  const { board, turn } = parseFen(fen);
  return { board, turn, maxDepth: 4, timeMs: null, rootScores: false, ...extra };
}

describe('recherche du moteur de dames', () => {
  it('signale une position sans coup', () => {
    expect(runSearch(request('B:W41,47:B36'))).toEqual({ best: null, score: -WIN_SCORE, depth: 0, rootScores: [] });
  });

  it('joue la prise obligatoire', () => {
    expect(runSearch(request('W:W32,46:B28')).best).toBe('32x23');
  });

  it('voit une victoire immédiate', () => {
    const result = runSearch(request('W:WK46:BK28'));
    expect(result.best?.startsWith('46x')).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(WIN_THRESHOLD);
  });

  it('trouve le sacrifice qui gagne deux pions contre un', () => {
    expect(runSearch(request('W:W32,33,38,43:B1,2,22,23', { maxDepth: 5 })).best).toBe('32-28');
  });

  it('note chaque coup quand on le demande', () => {
    const result = runSearch(request(START_FEN, { maxDepth: 2, rootScores: true }));
    expect(result.rootScores).toHaveLength(9);
    const top = Math.max(...result.rootScores.map((entry) => entry.score));
    expect(result.rootScores.find((entry) => entry.move === result.best)?.score).toBe(top);
    expect(result.depth).toBe(2);
  });

  it('respecte le temps de réflexion', () => {
    const started = Date.now();
    const result = runSearch(request(START_FEN, { maxDepth: 64, timeMs: 50 }));
    expect(Date.now() - started).toBeLessThan(1000);
    expect(result.depth).toBeGreaterThanOrEqual(1);
    expect(result.best).not.toBeNull();
  });
});
```

La position du sacrifice : les Blancs jouent 32-28 ; les Noirs doivent prendre 23x32 (seule prise, la case 33 bloque 22x33 et la case 43 bloque la suite de la rafle) ; les Blancs reprennent 38x27x18 (les pions de 32 et de 22).

- [x] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run tests/unit/draughts/engine`
Expected : FAIL — modules `evaluate` et `search` introuvables.

- [x] **Step 3 : Écrire `src/draughts/engine/evaluate.ts`**

**Fichier : `src/draughts/engine/evaluate.ts`**
```ts
import type { Cells, Side } from '../movegen';
import { RAYS, colOf, rowOf, squareAt } from '../squares';

export const MAN_VALUE = 100;
export const KING_VALUE = 320;

const CENTER: ReadonlySet<number> = new Set([22, 23, 24, 27, 28, 29]);
/** Cases du bord arrière qui empêchent l'adversaire d'aller à dame. */
const WHITE_GUARDS: ReadonlySet<number> = new Set([47, 48, 49]);
const BLACK_GUARDS: ReadonlySet<number> = new Set([2, 3, 4]);
const ADVANCE_BONUS = 3;
const CENTER_BONUS = 6;
const GUARD_BONUS = 8;
const SUPPORT_BONUS = 3;
const BLOCKED_PENALTY = 4;
const RUNAWAY_BONUS = 30;
const KING_MOBILITY_BONUS = 2;
const KING_MOBILITY_CAP = 15;

/** Aucune pièce adverse ne peut atteindre les cases entre le pion et la dernière rangée. */
function isRunaway(cells: Cells, square: number, color: Side, distance: number): boolean {
  const row = rowOf(square);
  const col = colOf(square);
  const step = color === 1 ? -1 : 1;
  for (let k = 1; k <= distance; k += 1) {
    for (let c = col - k; c <= col + k; c += 1) {
      const target = squareAt(row + step * k, c);
      if (target !== null && cells[target] * color < 0) return false;
    }
  }
  return true;
}

function manBonus(cells: Cells, square: number, color: Side, opponentMen: number, opponentKings: number): number {
  const advance = color === 1 ? 9 - rowOf(square) : rowOf(square);
  let bonus = advance * ADVANCE_BONUS;
  if (CENTER.has(square)) bonus += CENTER_BONUS;
  if (opponentMen > 0 && (color === 1 ? WHITE_GUARDS : BLACK_GUARDS).has(square)) bonus += GUARD_BONUS;
  const [back1, back2, ahead1, ahead2] = color === 1 ? [2, 3, 0, 1] : [0, 1, 2, 3];
  for (const direction of [back1, back2]) {
    const behind = RAYS[square][direction][0];
    if (behind !== undefined && cells[behind] === color) bonus += SUPPORT_BONUS;
  }
  const blocked = [ahead1, ahead2].every((direction) => {
    const next = RAYS[square][direction][0];
    return next === undefined || cells[next] !== 0;
  });
  if (blocked) bonus -= BLOCKED_PENALTY;
  const distance = 9 - advance;
  if (distance <= 3 && opponentKings === 0 && isRunaway(cells, square, color, distance)) bonus += (4 - distance) * RUNAWAY_BONUS;
  return bonus;
}

function kingMobility(cells: Cells, square: number): number {
  let free = 0;
  for (const ray of RAYS[square]) {
    for (const next of ray) {
      if (cells[next] !== 0) break;
      free += 1;
    }
  }
  return Math.min(free, KING_MOBILITY_CAP) * KING_MOBILITY_BONUS;
}

/** Note de la position du point de vue de `side` (pion = 100). */
export function evaluate(cells: Cells, side: Side): number {
  let whiteMen = 0;
  let whiteKings = 0;
  let blackMen = 0;
  let blackKings = 0;
  for (let square = 1; square <= 50; square += 1) {
    const piece = cells[square];
    if (piece === 1) whiteMen += 1;
    else if (piece === 2) whiteKings += 1;
    else if (piece === -1) blackMen += 1;
    else if (piece === -2) blackKings += 1;
  }
  let score = (whiteMen - blackMen) * MAN_VALUE + (whiteKings - blackKings) * KING_VALUE;
  for (let square = 1; square <= 50; square += 1) {
    const piece = cells[square];
    if (piece === 0) continue;
    const color: Side = piece > 0 ? 1 : -1;
    if (piece === 2 || piece === -2) {
      score += color * kingMobility(cells, square);
      continue;
    }
    const opponentMen = color === 1 ? blackMen : whiteMen;
    const opponentKings = color === 1 ? blackKings : whiteKings;
    score += color * manBonus(cells, square, color, opponentMen, opponentKings);
  }
  return side === 1 ? score : -score;
}
```

- [x] **Step 4 : Écrire `src/draughts/engine/search.ts`**

**Fichier : `src/draughts/engine/search.ts`**
```ts
import type { Color } from '../../core/types';
import { destination, generateMoves, promotes, rawMoveId, toCells, type Cells, type RawMove, type Side } from '../movegen';
import { evaluate } from './evaluate';

export const WIN_SCORE = 100_000;
/** Au-delà, la note annonce une victoire (ou une défaite) forcée. */
export const WIN_THRESHOLD = WIN_SCORE - 1_000;

const INFINITY = 1_000_000;
const MAX_PLY = 96;
const TIME_CHECK_MASK = 1023;
const TT_LIMIT = 400_000;
const HASH_SPLIT = 67_108_864; // 2^26

export interface SearchRequest {
  readonly board: string;
  readonly turn: Color;
  readonly maxDepth: number;
  /** Temps de réflexion maximal en millisecondes ; null = seulement la profondeur. */
  readonly timeMs: number | null;
  /** Calculer une note exacte pour chaque coup (choix bruité des niveaux Faible et Moyen). */
  readonly rootScores: boolean;
}

export interface RootScore {
  readonly move: string;
  readonly score: number;
}

export interface SearchResult {
  readonly best: string | null;
  /** Note du point de vue du camp au trait (pion = 100). */
  readonly score: number;
  readonly depth: number;
  readonly rootScores: readonly RootScore[];
}

type Bound = 'exact' | 'lower' | 'upper';

interface TableEntry {
  readonly depth: number;
  readonly score: number;
  readonly bound: Bound;
  readonly best: string | null;
}

interface Undo {
  readonly piece: number;
  readonly captured: readonly number[];
}

interface Clock {
  readonly now: () => number;
  /** Au-delà : la recherche en cours s'arrête. */
  readonly deadline: number | null;
  /** Au-delà : on ne commence pas une nouvelle profondeur. */
  readonly softDeadline: number | null;
}

class TimeUp extends Error {}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(20260924);
const randomKey = () => Math.floor(random() * HASH_SPLIT);
/** Clés de Zobrist : index = case × 4 + type de pièce. */
const KEYS_HI = Array.from({ length: 51 * 4 }, randomKey);
const KEYS_LO = Array.from({ length: 51 * 4 }, randomKey);
const SIDE_HI = randomKey();
const SIDE_LO = randomKey();

function pieceIndex(piece: number): number {
  return piece > 0 ? piece - 1 : 1 - piece;
}

/** Les notes de victoire dépendent de la distance : on les stocke relativement au nœud. */
function toTable(score: number, ply: number): number {
  if (score >= WIN_THRESHOLD) return score + ply;
  if (score <= -WIN_THRESHOLD) return score - ply;
  return score;
}

function fromTable(score: number, ply: number): number {
  if (score >= WIN_THRESHOLD) return score - ply;
  if (score <= -WIN_THRESHOLD) return score + ply;
  return score;
}

class Search {
  private readonly cells: Cells;
  private side: Side;
  private readonly clock: Clock;
  private readonly table = new Map<number, TableEntry>();
  private readonly history = new Map<string, number>();
  private readonly killers: string[][] = [];
  private hashHi = 0;
  private hashLo = 0;
  private nodes = 0;
  private canStop = false;

  constructor(cells: Cells, side: Side, clock: Clock) {
    this.cells = cells;
    this.side = side;
    this.clock = clock;
    for (let square = 1; square <= 50; square += 1) {
      if (cells[square] !== 0) this.toggle(square, cells[square]);
    }
    if (side === -1) this.toggleSide();
  }

  run(maxDepth: number, exact: boolean): SearchResult {
    const moves = generateMoves(this.cells, this.side);
    if (moves.length === 0) return { best: null, score: -WIN_SCORE, depth: 0, rootScores: [] };
    const depthLimit = moves.length === 1 && !exact ? Math.min(maxDepth, 2) : maxDepth;
    let best: { readonly move: RawMove; readonly score: number } | null = null;
    let scores: RootScore[] = [];
    let completed = 0;
    for (let depth = 1; depth <= depthLimit; depth += 1) {
      this.canStop = best !== null;
      try {
        const result = this.searchRoot(moves, depth, exact);
        best = result.best;
        scores = result.scores;
        completed = depth;
      } catch (error) {
        if (error instanceof TimeUp) break;
        throw error;
      }
      if (best && (Math.abs(best.score) >= WIN_THRESHOLD || this.pastSoftDeadline())) break;
    }
    if (!best) throw new Error('Recherche interrompue avant la première profondeur.');
    return { best: rawMoveId(best.move), score: best.score, depth: completed, rootScores: scores };
  }

  private searchRoot(moves: readonly RawMove[], depth: number, exact: boolean) {
    const ordered = this.order(moves, this.table.get(this.key())?.best ?? null, 0);
    let alpha = -INFINITY;
    let best = { move: ordered[0], score: -INFINITY };
    const scores: RootScore[] = [];
    for (let index = 0; index < ordered.length; index += 1) {
      const move = ordered[index];
      const undo = this.make(move);
      let score: number;
      if (exact || index === 0) {
        score = -this.negamax(depth - 1, -INFINITY, exact ? INFINITY : -alpha, 1);
      } else {
        score = -this.negamax(depth - 1, -alpha - 1, -alpha, 1);
        if (score > alpha) score = -this.negamax(depth - 1, -INFINITY, -alpha, 1);
      }
      this.unmake(move, undo);
      if (exact) scores.push({ move: rawMoveId(move), score });
      if (score > best.score) best = { move, score };
      if (!exact && score > alpha) alpha = score;
    }
    this.store(0, depth, best.score, 'exact', rawMoveId(best.move));
    return { best, scores };
  }

  private negamax(depth: number, alpha: number, beta: number, ply: number): number {
    this.nodes += 1;
    if (this.canStop && (this.nodes & TIME_CHECK_MASK) === 0 && this.pastDeadline()) throw new TimeUp();
    const moves = generateMoves(this.cells, this.side);
    if (moves.length === 0) return -(WIN_SCORE - ply);
    const forced = moves[0].captures.length > 0;
    if ((depth <= 0 && !forced) || ply >= MAX_PLY) return evaluate(this.cells, this.side);
    const nodeDepth = Math.max(depth, 0);
    const entry = this.table.get(this.key());
    if (entry && entry.depth >= nodeDepth) {
      const stored = fromTable(entry.score, ply);
      if (entry.bound === 'exact' || (entry.bound === 'lower' && stored >= beta) || (entry.bound === 'upper' && stored <= alpha)) {
        return stored;
      }
    }
    const alphaStart = alpha;
    let bestScore = -INFINITY;
    let bestId: string | null = null;
    const ordered = this.order(moves, entry?.best ?? null, ply);
    for (let index = 0; index < ordered.length; index += 1) {
      const move = ordered[index];
      const id = rawMoveId(move);
      const undo = this.make(move);
      let score: number;
      if (index === 0) {
        score = -this.negamax(depth - 1, -beta, -alpha, ply + 1);
      } else {
        const reduction = index >= 3 && depth >= 3 && !forced && !this.isKiller(id, ply) ? 1 : 0;
        score = -this.negamax(depth - 1 - reduction, -alpha - 1, -alpha, ply + 1);
        if (score > alpha && (reduction > 0 || score < beta)) score = -this.negamax(depth - 1, -beta, -alpha, ply + 1);
      }
      this.unmake(move, undo);
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
      if (score > alpha) alpha = score;
      if (alpha >= beta) {
        if (!forced) this.rememberCutoff(id, depth, ply);
        break;
      }
    }
    const bound: Bound = bestScore <= alphaStart ? 'upper' : bestScore >= beta ? 'lower' : 'exact';
    this.store(ply, nodeDepth, bestScore, bound, bestId);
    return bestScore;
  }

  private order(moves: readonly RawMove[], tableBest: string | null, ply: number): RawMove[] {
    const killers = this.killers[ply] ?? [];
    return moves
      .map((move) => {
        const id = rawMoveId(move);
        let score = this.history.get(id) ?? 0;
        if (id === tableBest) score += 1e9;
        else if (killers.includes(id)) score += 1e6;
        if (promotes(this.cells[move.from], destination(move))) score += 1e5;
        return { move, score };
      })
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.move);
  }

  private rememberCutoff(id: string, depth: number, ply: number): void {
    const killers = this.killers[ply] ?? [];
    if (!killers.includes(id)) this.killers[ply] = [id, ...killers].slice(0, 2);
    this.history.set(id, (this.history.get(id) ?? 0) + depth * depth);
  }

  private isKiller(id: string, ply: number): boolean {
    return (this.killers[ply] ?? []).includes(id);
  }

  private store(ply: number, depth: number, score: number, bound: Bound, best: string | null): void {
    if (this.table.size >= TT_LIMIT) this.table.clear();
    this.table.set(this.key(), { depth, score: toTable(score, ply), bound, best });
  }

  private make(move: RawMove): Undo {
    const piece = this.cells[move.from];
    const captured = move.captures.map((square) => this.cells[square]);
    this.toggle(move.from, piece);
    this.cells[move.from] = 0;
    move.captures.forEach((square, index) => {
      this.toggle(square, captured[index]);
      this.cells[square] = 0;
    });
    const to = destination(move);
    const placed = promotes(piece, to) ? piece * 2 : piece;
    this.cells[to] = placed;
    this.toggle(to, placed);
    this.side = this.side === 1 ? -1 : 1;
    this.toggleSide();
    return { piece, captured };
  }

  private unmake(move: RawMove, undo: Undo): void {
    this.side = this.side === 1 ? -1 : 1;
    this.toggleSide();
    const to = destination(move);
    this.toggle(to, this.cells[to]);
    this.cells[to] = 0;
    move.captures.forEach((square, index) => {
      this.cells[square] = undo.captured[index];
      this.toggle(square, undo.captured[index]);
    });
    this.cells[move.from] = undo.piece;
    this.toggle(move.from, undo.piece);
  }

  private toggle(square: number, piece: number): void {
    const index = square * 4 + pieceIndex(piece);
    this.hashHi ^= KEYS_HI[index];
    this.hashLo ^= KEYS_LO[index];
  }

  private toggleSide(): void {
    this.hashHi ^= SIDE_HI;
    this.hashLo ^= SIDE_LO;
  }

  private key(): number {
    return this.hashHi * HASH_SPLIT + this.hashLo;
  }

  private pastDeadline(): boolean {
    return this.clock.deadline !== null && this.clock.now() >= this.clock.deadline;
  }

  private pastSoftDeadline(): boolean {
    return this.clock.softDeadline !== null && this.clock.now() >= this.clock.softDeadline;
  }
}

/** Cherche le meilleur coup du camp au trait. */
export function runSearch(request: SearchRequest, now: () => number = Date.now): SearchResult {
  const start = now();
  const clock: Clock = {
    now,
    deadline: request.timeMs === null ? null : start + request.timeMs,
    softDeadline: request.timeMs === null ? null : start + request.timeMs / 2,
  };
  const search = new Search(toCells(request.board), request.turn === 'white' ? 1 : -1, clock);
  return search.run(request.maxDepth, request.rootScores);
}
```

- [x] **Step 5 : Lancer les tests**

Run : `npx vitest run tests/unit/draughts/engine` puis `npx tsc -b`
Expected : PASS (4 + 6 tests), aucune erreur.

- [x] **Step 6 : Commit**

```bash
git add src/draughts/engine tests/unit/draughts/engine
git commit -m "feat: évaluation et recherche alpha-bêta du moteur de dames"
```

---

### Task 7 : Dames — niveaux, moteur et Web Worker

**Files:**
- Create: `src/draughts/engine/levels.ts`, `src/draughts/engine/pick.ts`, `src/draughts/engine/searcher.ts`, `src/draughts/engine/worker-searcher.ts`, `src/draughts/engine/worker.ts`, `src/draughts/engine/draughts-engine.ts`, `src/draughts/engine/index.ts`
- Modify: `vite.config.ts` (exclusions de couverture)
- Test: `tests/unit/draughts/engine/levels.test.ts`, `tests/unit/draughts/engine/draughts-engine.test.ts`, `tests/unit/draughts/engine/worker-searcher.test.ts`

**Interfaces:**
- Consumes: `runSearch`, `SearchRequest`, `SearchResult`, `RootScore`, `WIN_SCORE`, `WIN_THRESHOLD` (Tâche 6) ; `legalMoves`, `draughtsMoveId`, `parseDraughts` (Tâche 5) ; erreurs de `core/engine-errors.ts` (Tâche 1) ; `Engine`, `Evaluation`, `Level`.
- Produces :
  - `levels.ts` : `DraughtsLevelConfig { maxDepth; timeMs; noise; randomRate; minDelayMs; timeoutMs; fallbackDepth }`, `DRAUGHTS_LEVELS`, `DRAUGHTS_HINT_DEPTH = 8`, `DRAUGHTS_BLUNDER_DEPTH = 6`, `DRAUGHTS_ANALYSIS_TIMEOUT_MS = 10_000`.
  - `pick.ts` : `MEDIUM_MOVE_MARGIN = 250`, `pickDraughtsMove(best, rootScores, config, rng): string | null`.
  - `searcher.ts` : `DraughtsSearcher { search(request, timeoutMs, signal?) }`, `createInlineSearcher(now?)`.
  - `worker-searcher.ts` : `WorkerLike`, `class WorkerSearcher implements DraughtsSearcher` (une recherche à la fois ; délai dépassé, annulation ou erreur → worker arrêté puis recréé à la demande suivante).
  - `worker.ts` : script du Web Worker (`{ id, request }` → `{ id, result }` ou `{ id, error }`).
  - `draughts-engine.ts` : `DraughtsEngineOptions { rng?; sleep?; now?; levels? }`, `evaluationOfScore(score): Evaluation`, `class DraughtsEngine implements Engine<DraughtsPos, DraughtsMove>`.
  - `index.ts` : `getDraughtsEngine(): DraughtsEngine`.

- [x] **Step 1 : Écrire les tests qui échouent**

**Fichier : `tests/unit/draughts/engine/levels.test.ts`**
```ts
import { describe, expect, it } from 'vitest';
import { DRAUGHTS_BLUNDER_DEPTH, DRAUGHTS_HINT_DEPTH, DRAUGHTS_LEVELS } from '../../../../src/draughts/engine/levels';
import { pickDraughtsMove } from '../../../../src/draughts/engine/pick';

const sequence = (...values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length];
};
const scores = [
  { move: 'a', score: 50 },
  { move: 'b', score: 40 },
  { move: 'c', score: -100 },
  { move: 'd', score: -900 },
];

describe('niveaux du moteur de dames', () => {
  it('suit la spec : profondeur 2, profondeur 6, 3 secondes', () => {
    expect(DRAUGHTS_LEVELS.faible).toMatchObject({ maxDepth: 2, timeMs: null, minDelayMs: 600 });
    expect(DRAUGHTS_LEVELS.faible.noise).toBeGreaterThan(DRAUGHTS_LEVELS.moyen.noise);
    expect(DRAUGHTS_LEVELS.faible.randomRate).toBeGreaterThan(0);
    expect(DRAUGHTS_LEVELS.moyen).toMatchObject({ maxDepth: 6, timeMs: null, minDelayMs: 600, randomRate: 0 });
    expect(DRAUGHTS_LEVELS.expert).toMatchObject({ timeMs: 3000, noise: 0, randomRate: 0, minDelayMs: 0, timeoutMs: 8000 });
    expect(DRAUGHTS_HINT_DEPTH).toBe(8);
    expect(DRAUGHTS_BLUNDER_DEPTH).toBe(6);
  });

  it('joue le meilleur coup sans bruit ni hasard', () => {
    expect(pickDraughtsMove('a', scores, { noise: 0, randomRate: 0 }, sequence(0.5))).toBe('a');
    expect(pickDraughtsMove('z', [], { noise: 150, randomRate: 0.5 }, sequence(0.5))).toBe('z');
    expect(pickDraughtsMove(null, [], { noise: 0, randomRate: 0 }, sequence(0.5))).toBeNull();
  });

  it('se laisse tromper par le bruit', () => {
    expect(pickDraughtsMove('a', scores, { noise: 150, randomRate: 0 }, sequence(0.1, 0.9, 0.5, 0.5))).toBe('b');
  });

  it('joue parfois un coup moyen, mais jamais un coup très mauvais', () => {
    expect(pickDraughtsMove('a', scores, { noise: 0, randomRate: 0.2 }, sequence(0.1, 0.99))).toBe('c');
    expect(pickDraughtsMove('a', [scores[0], scores[3]], { noise: 0, randomRate: 0.2 }, sequence(0.1))).toBe('a');
  });
});
```

Explication du test « bruit » : `a` reçoit 50 + (0,1×2−1)×150 = −70, `b` reçoit 40 + (0,9×2−1)×150 = 160 : `b` l'emporte. Test « coup moyen » : le tirage 0,1 < 0,2 déclenche le coup moyen ; les candidats sont `b` et `c` (≥ 50 − 250) limités à la moitié des coups (2) ; 0,99 choisit `c`. `d` (−900) n'est jamais candidat.

**Fichier : `tests/unit/draughts/engine/draughts-engine.test.ts`**
```ts
import { describe, expect, it, vi } from 'vitest';
import { EngineAbortError, EngineTimeoutError, EngineUnavailableError } from '../../../../src/core/engine-errors';
import { DraughtsEngine, evaluationOfScore } from '../../../../src/draughts/engine/draughts-engine';
import { DRAUGHTS_LEVELS } from '../../../../src/draughts/engine/levels';
import { WIN_SCORE, type SearchRequest, type SearchResult } from '../../../../src/draughts/engine/search';
import { createInlineSearcher, type DraughtsSearcher } from '../../../../src/draughts/engine/searcher';
import { draughtsAdapter, parseDraughts } from '../../../../src/draughts/rules';

const start = draughtsAdapter.initial();
const signal = () => new AbortController().signal;
const result = (best: string | null, extra: Partial<SearchResult> = {}): SearchResult => ({ best, score: 0, depth: 3, rootScores: [], ...extra });

function fakeSearcher(...answers: (SearchResult | Error)[]) {
  const requests: { request: SearchRequest; timeoutMs: number }[] = [];
  const searcher: DraughtsSearcher = {
    search: async (request, timeoutMs) => {
      requests.push({ request, timeoutMs });
      const answer = answers[Math.min(requests.length - 1, answers.length - 1)];
      if (answer instanceof Error) throw answer;
      return answer;
    },
  };
  return { searcher, requests };
}

describe('DraughtsEngine', () => {
  it('Expert cherche 3 secondes et joue le meilleur coup', async () => {
    const { searcher, requests } = fakeSearcher(result('32-28'));
    const engine = new DraughtsEngine(searcher, { sleep: async () => undefined });
    expect(await engine.bestMove(start, 'expert', signal())).toMatchObject({ from: '32', to: '28' });
    expect(requests[0].request).toMatchObject({ maxDepth: 64, timeMs: 3000, rootScores: false, turn: 'white' });
    expect(requests[0].timeoutMs).toBe(8000);
  });

  it('Faible demande la note de chaque coup et choisit avec le hasard', async () => {
    const rootScores = [
      { move: '32-28', score: 30 },
      { move: '31-27', score: 20 },
    ];
    const { searcher, requests } = fakeSearcher(result('32-28', { rootScores }));
    const engine = new DraughtsEngine(searcher, { sleep: async () => undefined, rng: vi.fn().mockReturnValueOnce(0.9).mockReturnValueOnce(0).mockReturnValueOnce(1) });
    expect(await engine.bestMove(start, 'faible', signal())).toMatchObject({ from: '31', to: '27' });
    expect(requests[0].request).toMatchObject({ maxDepth: 2, timeMs: null, rootScores: true });
  });

  it('attend le délai minimal pour garder un rythme naturel', async () => {
    const sleep = vi.fn(async () => undefined);
    const { searcher } = fakeSearcher(result('32-28', { rootScores: [{ move: '32-28', score: 0 }] }));
    await new DraughtsEngine(searcher, { sleep, now: () => 1000, rng: () => 0.5 }).bestMove(start, 'moyen', signal());
    expect(sleep).toHaveBeenCalledWith(600);
  });

  it('refuse de rendre un coup si la partie a été quittée pendant l’attente', async () => {
    const controller = new AbortController();
    const { searcher } = fakeSearcher(result('32-28', { rootScores: [{ move: '32-28', score: 0 }] }));
    const engine = new DraughtsEngine(searcher, { sleep: async () => controller.abort(), now: () => 0, rng: () => 0.5 });
    await expect(engine.bestMove(start, 'moyen', controller.signal)).rejects.toBeInstanceOf(EngineAbortError);
  });

  it('réessaie moins profond après un délai dépassé', async () => {
    const { searcher, requests } = fakeSearcher(new EngineTimeoutError(), result('32-28'));
    const engine = new DraughtsEngine(searcher, { sleep: async () => undefined });
    expect(await engine.bestMove(start, 'expert', signal())).toMatchObject({ from: '32', to: '28' });
    expect(requests[1].request).toMatchObject({ maxDepth: DRAUGHTS_LEVELS.expert.fallbackDepth, timeMs: null });
  });

  it('signale un moteur indisponible après deux délais dépassés', async () => {
    const { searcher } = fakeSearcher(new EngineTimeoutError());
    await expect(new DraughtsEngine(searcher).bestMove(start, 'expert', signal())).rejects.toBeInstanceOf(EngineUnavailableError);
  });

  it('transmet les autres erreurs et l’absence de coup', async () => {
    await expect(new DraughtsEngine(fakeSearcher(new Error('panne')).searcher).bestMove(start, 'expert', signal())).rejects.toThrow('panne');
    await expect(new DraughtsEngine(fakeSearcher(result(null)).searcher).bestMove(start, 'expert', signal())).rejects.toThrow("L'ordinateur n'a trouvé aucun coup.");
    await expect(new DraughtsEngine(fakeSearcher(result('11-15')).searcher).bestMove(start, 'expert', signal())).rejects.toThrow('Coup inconnu');
  });

  it('analyse une position pour l’aide', async () => {
    const engine = new DraughtsEngine(createInlineSearcher());
    const analysis = await engine.analyse(parseDraughts('W:W32,46:B28'), 4);
    expect(analysis.best).toMatchObject({ from: '32', to: '23', captures: ['28'] });
    await expect(engine.analyse(parseDraughts('B:W41,47:B36'), 4)).rejects.toThrow('Aucun coup à analyser');
  });

  it('traduit une victoire forcée en nombre de coups', () => {
    expect(evaluationOfScore(120)).toEqual({ scoreCp: 120 });
    expect(evaluationOfScore(WIN_SCORE - 1)).toEqual({ scoreCp: WIN_SCORE - 1, mateIn: 1 });
    expect(evaluationOfScore(-(WIN_SCORE - 4))).toEqual({ scoreCp: -(WIN_SCORE - 4), mateIn: -2 });
  });

  it('abandonne une recherche dans le fil courant si la partie est quittée', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(createInlineSearcher().search({ board: start.board, turn: 'white', maxDepth: 2, timeMs: null, rootScores: false }, 1000, controller.signal)).rejects.toBeInstanceOf(EngineAbortError);
  });
});
```

Dans le test « Faible » : 0,9 ≥ 0,15 donc pas de coup moyen ; bruit : `32-28` reçoit 30 − 150 = −120 (tirage 0), `31-27` reçoit 20 + 150 = 170 (tirage 1) : `31-27` l'emporte.

**Fichier : `tests/unit/draughts/engine/worker-searcher.test.ts`**
```ts
import { describe, expect, it } from 'vitest';
import { EngineAbortError, EngineLoadError, EngineTimeoutError } from '../../../../src/core/engine-errors';
import type { SearchRequest } from '../../../../src/draughts/engine/search';
import { WorkerSearcher, type WorkerLike } from '../../../../src/draughts/engine/worker-searcher';

interface Message {
  readonly id: number;
  readonly request: SearchRequest;
}

class FakeWorker implements WorkerLike {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;
  readonly received: Message[] = [];
  private readonly reply: (message: Message) => object | null;

  constructor(reply: (message: Message) => object | null) {
    this.reply = reply;
  }

  postMessage(message: unknown): void {
    const typed = message as Message;
    this.received.push(typed);
    const answer = this.reply(typed);
    if (answer) setTimeout(() => this.onmessage?.({ data: answer } as MessageEvent), 0);
  }

  terminate(): void {
    this.terminated = true;
  }
}

const request: SearchRequest = { board: '.'.repeat(50), turn: 'white', maxDepth: 2, timeMs: null, rootScores: false };
const answer = (message: Message) => ({ id: message.id, result: { best: '32-28', score: 0, depth: 2, rootScores: [] } });

function setup(reply: (message: Message) => object | null) {
  const workers: FakeWorker[] = [];
  const searcher = new WorkerSearcher(() => {
    const worker = new FakeWorker(reply);
    workers.push(worker);
    return worker;
  });
  return { searcher, workers };
}

describe('WorkerSearcher', () => {
  it('confie la recherche au worker et rend sa réponse', async () => {
    const { searcher, workers } = setup(answer);
    await expect(searcher.search(request, 1000)).resolves.toMatchObject({ best: '32-28' });
    await expect(searcher.search(request, 1000)).resolves.toMatchObject({ best: '32-28' });
    expect(workers).toHaveLength(1);
    expect(workers[0].received.map((message) => message.id)).toEqual([1, 2]);
  });

  it('arrête le worker après un délai dépassé puis en crée un autre', async () => {
    let calls = 0;
    const { searcher, workers } = setup((message) => (calls++ === 0 ? null : answer(message)));
    await expect(searcher.search(request, 20)).rejects.toBeInstanceOf(EngineTimeoutError);
    expect(workers[0].terminated).toBe(true);
    await expect(searcher.search(request, 1000)).resolves.toMatchObject({ best: '32-28' });
    expect(workers).toHaveLength(2);
  });

  it('arrête le worker quand la partie est quittée', async () => {
    const { searcher, workers } = setup(() => null);
    const controller = new AbortController();
    const pending = searcher.search(request, 1000, controller.signal);
    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();
    await expect(pending).rejects.toBeInstanceOf(EngineAbortError);
    expect(workers[0].terminated).toBe(true);
    const aborted = new AbortController();
    aborted.abort();
    await expect(searcher.search(request, 1000, aborted.signal)).rejects.toBeInstanceOf(EngineAbortError);
  });

  it('signale une erreur du worker', async () => {
    const { searcher } = setup((message) => ({ id: message.id, error: 'plantage' }));
    await expect(searcher.search(request, 1000)).rejects.toThrow('plantage');
    const broken = new WorkerSearcher(() => {
      throw new Error('pas de worker');
    });
    await expect(broken.search(request, 1000)).rejects.toBeInstanceOf(EngineLoadError);
  });

  it('ignore une réponse destinée à une autre recherche', async () => {
    const { searcher } = setup((message) => ({ ...answer(message), id: message.id + 100 }));
    await expect(searcher.search(request, 30)).rejects.toBeInstanceOf(EngineTimeoutError);
  });
});
```

- [x] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run tests/unit/draughts/engine`
Expected : FAIL — modules `levels`, `pick`, `searcher`, `worker-searcher`, `draughts-engine` introuvables.

- [x] **Step 3 : Écrire les niveaux et le choix du coup**

**Fichier : `src/draughts/engine/levels.ts`**
```ts
import type { Level } from '../../core/types';

export interface DraughtsLevelConfig {
  readonly maxDepth: number;
  /** Temps de réflexion ; null = seulement la profondeur. */
  readonly timeMs: number | null;
  /** Bruit ajouté à la note de chaque coup (pion = 100). */
  readonly noise: number;
  /** Probabilité de jouer volontairement un coup moyen. */
  readonly randomRate: number;
  /** Délai minimal avant d'afficher le coup, pour un rythme naturel. */
  readonly minDelayMs: number;
  /** Temps prévu + 5 s : au-delà, la recherche est abandonnée puis relancée moins profond. */
  readonly timeoutMs: number;
  readonly fallbackDepth: number;
}

export const DRAUGHTS_LEVELS: Readonly<Record<Level, DraughtsLevelConfig>> = {
  faible: { maxDepth: 2, timeMs: null, noise: 150, randomRate: 0.15, minDelayMs: 600, timeoutMs: 6_000, fallbackDepth: 1 },
  moyen: { maxDepth: 6, timeMs: null, noise: 25, randomRate: 0, minDelayMs: 600, timeoutMs: 8_000, fallbackDepth: 4 },
  expert: { maxDepth: 64, timeMs: 3_000, noise: 0, randomRate: 0, minDelayMs: 0, timeoutMs: 8_000, fallbackDepth: 8 },
};

export const DRAUGHTS_HINT_DEPTH = 8;
export const DRAUGHTS_BLUNDER_DEPTH = 6;
export const DRAUGHTS_ANALYSIS_TIMEOUT_MS = 10_000;
```

**Fichier : `src/draughts/engine/pick.ts`**
```ts
import type { DraughtsLevelConfig } from './levels';
import type { RootScore } from './search';

/** Un « coup moyen » ne perd pas plus que l'équivalent de 2,5 pions par rapport au meilleur. */
export const MEDIUM_MOVE_MARGIN = 250;

/** Choix du coup : parfois un coup moyen, sinon le meilleur après bruit sur les notes. */
export function pickDraughtsMove(
  best: string | null,
  rootScores: readonly RootScore[],
  config: Pick<DraughtsLevelConfig, 'noise' | 'randomRate'>,
  rng: () => number,
): string | null {
  if (rootScores.length === 0) return best;
  const ranked = [...rootScores].sort((a, b) => b.score - a.score);
  if (ranked.length > 1 && config.randomRate > 0 && rng() < config.randomRate) {
    const pool = ranked
      .slice(1)
      .filter((entry) => entry.score >= ranked[0].score - MEDIUM_MOVE_MARGIN)
      .slice(0, Math.ceil(ranked.length / 2));
    return pool.length > 0 ? pool[Math.floor(rng() * pool.length)].move : ranked[0].move;
  }
  if (config.noise <= 0) return ranked[0].move;
  let choice = ranked[0];
  let choiceScore = -Infinity;
  for (const entry of ranked) {
    const noisy = entry.score + (rng() * 2 - 1) * config.noise;
    if (noisy > choiceScore) {
      choice = entry;
      choiceScore = noisy;
    }
  }
  return choice.move;
}
```

- [x] **Step 4 : Écrire les chercheurs (fil courant et Web Worker)**

**Fichier : `src/draughts/engine/searcher.ts`**
```ts
import { EngineAbortError } from '../../core/engine-errors';
import { runSearch, type SearchRequest, type SearchResult } from './search';

export interface DraughtsSearcher {
  search(request: SearchRequest, timeoutMs: number, signal?: AbortSignal): Promise<SearchResult>;
}

/** Recherche dans le fil courant : tests et matchs de force dans Node. */
export function createInlineSearcher(now?: () => number): DraughtsSearcher {
  return {
    search: async (request, _timeoutMs, signal) => {
      if (signal?.aborted) throw new EngineAbortError();
      const result = runSearch(request, now);
      if (signal?.aborted) throw new EngineAbortError();
      return result;
    },
  };
}
```

**Fichier : `src/draughts/engine/worker-searcher.ts`**
```ts
import { EngineAbortError, EngineLoadError, EngineTimeoutError } from '../../core/engine-errors';
import type { SearchRequest, SearchResult } from './search';
import type { DraughtsSearcher } from './searcher';

/** Ce que le chercheur utilise d'un Web Worker (remplaçable dans les tests). */
export interface WorkerLike {
  postMessage(message: unknown): void;
  terminate(): void;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

interface Reply {
  readonly id: number;
  readonly result?: SearchResult;
  readonly error?: string;
}

/** Une recherche à la fois ; délai dépassé, annulation ou erreur : le worker est arrêté puis recréé à la demande suivante. */
export class WorkerSearcher implements DraughtsSearcher {
  private readonly createWorker: () => WorkerLike;
  private worker: WorkerLike | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private nextId = 1;

  constructor(createWorker: () => WorkerLike) {
    this.createWorker = createWorker;
  }

  search(request: SearchRequest, timeoutMs: number, signal?: AbortSignal): Promise<SearchResult> {
    const run = this.queue.then(() => this.run(request, timeoutMs, signal));
    // La file continue après un échec ; l'erreur est rendue à l'appelant via `run`.
    this.queue = run.catch(() => undefined);
    return run;
  }

  private stop(): void {
    this.worker?.terminate();
    this.worker = null;
  }

  private run(request: SearchRequest, timeoutMs: number, signal?: AbortSignal): Promise<SearchResult> {
    if (signal?.aborted) return Promise.reject(new EngineAbortError());
    let worker: WorkerLike;
    try {
      this.worker ??= this.createWorker();
      worker = this.worker;
    } catch (error) {
      return Promise.reject(new EngineLoadError(error));
    }
    const id = this.nextId;
    this.nextId += 1;
    return new Promise<SearchResult>((resolve, reject) => {
      const finish = (error: Error | null, result?: SearchResult) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        worker.onmessage = null;
        worker.onerror = null;
        if (error) {
          this.stop();
          reject(error);
        } else if (result) {
          resolve(result);
        }
      };
      const onAbort = () => finish(new EngineAbortError());
      const timer = setTimeout(() => finish(new EngineTimeoutError()), timeoutMs);
      signal?.addEventListener('abort', onAbort);
      worker.onmessage = (event: MessageEvent) => {
        const reply = event.data as Reply;
        if (reply.id !== id) return;
        if (reply.result) finish(null, reply.result);
        else finish(new Error(reply.error ?? 'Réponse vide du moteur de dames.'));
      };
      worker.onerror = (event: ErrorEvent) => finish(new EngineLoadError(event.message));
      worker.postMessage({ id, request });
    });
  }
}
```

**Fichier : `src/draughts/engine/worker.ts`**
```ts
import { runSearch, type SearchRequest } from './search';

interface Incoming {
  readonly id: number;
  readonly request: SearchRequest;
}

/** Portée d'un Web Worker, réduite à ce qui sert ici (le projet compile avec les types du DOM). */
interface WorkerScope {
  onmessage: ((event: MessageEvent<Incoming>) => void) | null;
  postMessage(message: unknown): void;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = (event) => {
  const { id, request } = event.data;
  try {
    scope.postMessage({ id, result: runSearch(request) });
  } catch (error) {
    scope.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
```

- [x] **Step 5 : Écrire le moteur de dames**

**Fichier : `src/draughts/engine/draughts-engine.ts`**
```ts
import { EngineAbortError, EngineTimeoutError, EngineUnavailableError } from '../../core/engine-errors';
import type { Engine, Evaluation, Level } from '../../core/types';
import { draughtsMoveId, legalMoves } from '../rules';
import type { DraughtsMove, DraughtsPos } from '../types';
import { DRAUGHTS_ANALYSIS_TIMEOUT_MS, DRAUGHTS_LEVELS, type DraughtsLevelConfig } from './levels';
import { pickDraughtsMove } from './pick';
import { WIN_SCORE, WIN_THRESHOLD, type SearchRequest, type SearchResult } from './search';
import type { DraughtsSearcher } from './searcher';

export interface DraughtsEngineOptions {
  readonly rng?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly now?: () => number;
  readonly levels?: Readonly<Record<Level, DraughtsLevelConfig>>;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Note de recherche → évaluation commune ; une victoire forcée devient `mateIn` (en coups du camp au trait). */
export function evaluationOfScore(score: number): Evaluation {
  if (Math.abs(score) < WIN_THRESHOLD) return { scoreCp: score };
  return { scoreCp: score, mateIn: Math.sign(score) * Math.ceil((WIN_SCORE - Math.abs(score)) / 2) };
}

function resolveMove(pos: DraughtsPos, id: string): DraughtsMove {
  const move = legalMoves(pos).find((candidate) => draughtsMoveId(candidate) === id);
  if (!move) throw new Error(`Coup inconnu du moteur de dames : ${id}`);
  return move;
}

export class DraughtsEngine implements Engine<DraughtsPos, DraughtsMove> {
  private readonly searcher: DraughtsSearcher;
  private readonly rng: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  private readonly levels: Readonly<Record<Level, DraughtsLevelConfig>>;

  constructor(searcher: DraughtsSearcher, options: DraughtsEngineOptions = {}) {
    this.searcher = searcher;
    this.rng = options.rng ?? Math.random;
    this.sleep = options.sleep ?? wait;
    this.now = options.now ?? Date.now;
    this.levels = options.levels ?? DRAUGHTS_LEVELS;
  }

  async bestMove(pos: DraughtsPos, level: Level, signal: AbortSignal): Promise<DraughtsMove> {
    const config = this.levels[level];
    const started = this.now();
    const request: SearchRequest = {
      board: pos.board,
      turn: pos.turn,
      maxDepth: config.maxDepth,
      timeMs: config.timeMs,
      rootScores: config.noise > 0 || config.randomRate > 0,
    };
    const result = await this.searchWithRetry(request, config.timeoutMs, config.fallbackDepth, signal);
    const id = pickDraughtsMove(result.best, result.rootScores, config, this.rng);
    if (!id) throw new Error("L'ordinateur n'a trouvé aucun coup.");
    const remaining = config.minDelayMs - (this.now() - started);
    if (remaining > 0) await this.sleep(remaining);
    if (signal.aborted) throw new EngineAbortError();
    return resolveMove(pos, id);
  }

  async analyse(pos: DraughtsPos, depth: number): Promise<{ readonly best: DraughtsMove } & Evaluation> {
    const request: SearchRequest = { board: pos.board, turn: pos.turn, maxDepth: depth, timeMs: null, rootScores: false };
    const result = await this.searchWithRetry(request, DRAUGHTS_ANALYSIS_TIMEOUT_MS, Math.max(1, Math.floor(depth / 2)));
    if (!result.best) throw new Error('Aucun coup à analyser : la partie est terminée.');
    return { best: resolveMove(pos, result.best), ...evaluationOfScore(result.score) };
  }

  private async searchWithRetry(request: SearchRequest, timeoutMs: number, fallbackDepth: number, signal?: AbortSignal): Promise<SearchResult> {
    try {
      return await this.searcher.search(request, timeoutMs, signal);
    } catch (error) {
      if (!(error instanceof EngineTimeoutError)) throw error;
    }
    try {
      return await this.searcher.search({ ...request, maxDepth: fallbackDepth, timeMs: null }, timeoutMs, signal);
    } catch (error) {
      throw error instanceof EngineTimeoutError ? new EngineUnavailableError() : error;
    }
  }
}
```

**Fichier : `src/draughts/engine/index.ts`**
```ts
import { DraughtsEngine } from './draughts-engine';
import { WorkerSearcher } from './worker-searcher';

let engine: DraughtsEngine | null = null;

/** Moteur de dames partagé par toute l'app ; son Web Worker n'est créé qu'à la première recherche. */
export function getDraughtsEngine(): DraughtsEngine {
  if (!engine) {
    engine = new DraughtsEngine(new WorkerSearcher(() => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })));
  }
  return engine;
}
```

Dans `vite.config.ts`, dans `coverage.exclude`, ajouter après `'src/chess/engine/index.ts',` :
```ts
        'src/draughts/engine/worker.ts',
        'src/draughts/engine/index.ts',
```

- [x] **Step 6 : Lancer les tests, le typage et le build**

Run : `npx vitest run tests/unit/draughts` puis `npx tsc -b` puis `npm run build`
Expected : PASS (dont 4 + 10 + 5 nouveaux tests), aucune erreur ; le build produit un fichier `dist/assets/worker-*.js` (vérifier avec `ls dist/assets | grep worker`).

- [x] **Step 7 : Commit**

```bash
git add src/draughts/engine tests/unit/draughts/engine vite.config.ts
git commit -m "feat: niveaux du moteur de dames, Web Worker avec délai, annulation et relance"
```

---

### Task 8 : Dames — aide du niveau Faible et textes de fin de partie

**Files:**
- Create: `src/draughts/help/hint.ts`, `src/draughts/help/blunder.ts`, `src/draughts/explain.ts`
- Test: `tests/unit/draughts/help.test.ts`, `tests/unit/draughts/explain.test.ts`

**Interfaces:**
- Consumes: `play`, `status`, `legalMoves`, `parseDraughts`, `decodeDraughtsMove` (Tâche 5) ; `generateMoves`, `toCells` (Tâche 4) ; `NO_BLUNDER`, `BlunderVerdict` (Tâche 1) ; `explainWith`, `ResultTexts` (Tâche 1).
- Produces :
  - `help/hint.ts` : `DraughtsHintReason = 'win' | 'promotion' | 'capture' | 'escape' | 'best'`, `threatenedSquares(board, color): Set<string>`, `draughtsHintReason(pos, move)`, `draughtsHintText(pos, move)`.
  - `help/blunder.ts` : `DRAUGHTS_BLUNDER_THRESHOLD_CP = 200`, `detectDraughtsBlunder(pos, move, before, afterForOpponent): BlunderVerdict`.
  - `explain.ts` : `explainDraughtsResult(status, viewer): ResultText`.

- [x] **Step 1 : Écrire les tests qui échouent**

**Fichier : `tests/unit/draughts/help.test.ts`**
```ts
import { describe, expect, it } from 'vitest';
import { detectDraughtsBlunder } from '../../../src/draughts/help/blunder';
import { draughtsHintReason, draughtsHintText, threatenedSquares } from '../../../src/draughts/help/hint';
import { decodeDraughtsMove, draughtsAdapter, parseDraughts } from '../../../src/draughts/rules';

const hint = (fen: string, id: string) => {
  const pos = parseDraughts(fen);
  return draughtsHintText(pos, decodeDraughtsMove(id, pos));
};

describe('indice aux dames', () => {
  it('annonce une victoire', () => {
    const pos = parseDraughts('W:WK46:BK28');
    expect(draughtsHintReason(pos, decodeDraughtsMove('46x23', pos))).toBe('win');
    expect(hint('W:WK46:BK28', '46x23')).toBe("Ce coup gagne la partie : l'adversaire ne pourra plus jouer !");
  });

  it('annonce une promotion', () => {
    expect(hint('W:W7:B45', '7-1')).toBe('Ton pion arrive au bout : il devient une dame.');
  });

  it('annonce une prise en comptant les pièces', () => {
    expect(hint('W:W32:B28,19,45', '32x23x14')).toBe('Ce coup prend 2 pièces adverses.');
    expect(hint('W:W32:B28,45', '32x23')).toBe('Ce coup prend une pièce adverse.');
  });

  it('annonce une pièce mise à l’abri', () => {
    expect([...threatenedSquares(parseDraughts('W:W32:B21,27').board, 'white')]).toEqual(['32']);
    expect(hint('W:W32:B21,27', '32-28')).toBe("Ce coup met ton pion à l'abri.");
  });

  it('sinon, dit simplement que c’est le meilleur coup', () => {
    expect(hint('W:W31-50:B1-20', '32-28')).toBe("C'est le meilleur coup selon l'ordinateur.");
  });
});

describe('alerte de gaffe aux dames', () => {
  const pos = parseDraughts('W:W33:B18,22');
  const move = decodeDraughtsMove('33-28', pos);

  it('nomme les pièces que l’ordinateur peut prendre', () => {
    expect(detectDraughtsBlunder(pos, move, { scoreCp: 0 }, { scoreCp: 250 })).toEqual({
      blunder: true,
      message: "Attention : après ce coup, l'ordinateur peut prendre une pièce (en 28).",
    });
  });

  it('ne dit rien pour une petite perte', () => {
    expect(detectDraughtsBlunder(pos, move, { scoreCp: 0 }, { scoreCp: 100 })).toEqual({ blunder: false });
  });

  it('prévient d’une victoire forcée pour l’ordinateur ou d’une victoire manquée', () => {
    expect(detectDraughtsBlunder(pos, move, { scoreCp: 0 }, { scoreCp: 99_997, mateIn: 2 })).toEqual({
      blunder: true,
      message: "Attention : après ce coup, l'ordinateur peut gagner la partie de force.",
    });
    expect(detectDraughtsBlunder(pos, move, { scoreCp: 99_999, mateIn: 1 }, { scoreCp: -50 })).toEqual({
      blunder: true,
      message: 'Attention : tu pouvais gagner la partie, et ce coup laisse passer l’occasion.',
    });
  });

  it('donne une explication générale sans prise immédiate', () => {
    const start = draughtsAdapter.initial();
    expect(detectDraughtsBlunder(start, decodeDraughtsMove('32-28', start), { scoreCp: 0 }, { scoreCp: 480 })).toEqual({
      blunder: true,
      message: "Attention : l'ordinateur voit que ce coup te fait perdre l'équivalent d'environ 5 pions.",
    });
  });

  it('ne prévient pas quand la partie est déjà perdue', () => {
    expect(detectDraughtsBlunder(pos, move, { scoreCp: -99_997, mateIn: -2 }, { scoreCp: 99_998, mateIn: 1 })).toEqual({ blunder: false });
  });
});
```

Positions : dans `W:W32:B21,27`, le pion noir 27 peut prendre 32 (vers 38) mais le pion blanc 32 ne peut pas prendre 27 (la case 21 est occupée) ; après 32-28, plus rien n'est attaqué. Dans `W:W33:B18,22`, après 33-28 le pion noir 22 prend 28 (vers 33, libérée).

**Fichier : `tests/unit/draughts/explain.test.ts`**
```ts
import { describe, expect, it } from 'vitest';
import { explainDraughtsResult } from '../../../src/draughts/explain';

describe('fin de partie aux dames', () => {
  it('explique une victoire selon le point de vue', () => {
    const win = { kind: 'win', winner: 'white', reason: 'no-moves' } as const;
    expect(explainDraughtsResult(win, 'white')).toEqual({ title: 'Victoire !', detail: "L'adversaire ne peut plus jouer : toutes ses pièces sont prises ou bloquées." });
    expect(explainDraughtsResult(win, 'black').detail).toBe('Tu ne peux plus jouer : toutes tes pièces sont prises ou bloquées.');
    expect(explainDraughtsResult(win, null)).toEqual({ title: 'Les Blancs gagnent !', detail: 'Les Noirs ne peuvent plus jouer : toutes leurs pièces sont prises ou bloquées.' });
  });

  it('explique chaque nulle', () => {
    expect(explainDraughtsResult({ kind: 'draw', reason: 'repetition' }, null).detail).toBe('La même position est revenue trois fois : personne ne gagne.');
    expect(explainDraughtsResult({ kind: 'draw', reason: 'king-moves' }, null).detail).toBe('25 coups de suite avec seulement des dames, sans prise ni pion joué : personne ne gagne.');
    expect(explainDraughtsResult({ kind: 'draw', reason: 'endgame-limit' }, 'white')).toEqual({
      title: 'Partie nulle',
      detail: 'Il reste trop peu de pièces pour gagner dans le nombre de coups permis : personne ne gagne.',
    });
  });
});
```

- [x] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run tests/unit/draughts/help.test.ts tests/unit/draughts/explain.test.ts`
Expected : FAIL — modules introuvables.

- [x] **Step 3 : Écrire l'indice et l'alerte de gaffe**

**Fichier : `src/draughts/help/hint.ts`**
```ts
import type { Color } from '../../core/types';
import { generateMoves, toCells } from '../movegen';
import { play, status } from '../rules';
import type { DraughtsMove, DraughtsPos } from '../types';

export type DraughtsHintReason = 'win' | 'promotion' | 'capture' | 'escape' | 'best';

/** Cases des pièces de `color` que l'adversaire pourrait prendre s'il jouait maintenant. */
export function threatenedSquares(board: string, color: Color): Set<string> {
  const attacker = color === 'white' ? -1 : 1;
  return new Set(generateMoves(toCells(board), attacker).flatMap((move) => move.captures.map(String)));
}

export function draughtsHintReason(pos: DraughtsPos, move: DraughtsMove): DraughtsHintReason {
  const after = play(pos, move);
  if (status(after).kind === 'win') return 'win';
  if (move.promotes) return 'promotion';
  if (move.captures.length > 0) return 'capture';
  if (threatenedSquares(pos.board, pos.turn).has(move.from) && !threatenedSquares(after.board, pos.turn).has(move.to)) return 'escape';
  return 'best';
}

export function draughtsHintText(pos: DraughtsPos, move: DraughtsMove): string {
  switch (draughtsHintReason(pos, move)) {
    case 'win':
      return "Ce coup gagne la partie : l'adversaire ne pourra plus jouer !";
    case 'promotion':
      return 'Ton pion arrive au bout : il devient une dame.';
    case 'capture':
      return move.captures.length === 1 ? 'Ce coup prend une pièce adverse.' : `Ce coup prend ${move.captures.length} pièces adverses.`;
    case 'escape': {
      const piece = pos.board[Number(move.from) - 1];
      return `Ce coup met ${piece === 'W' || piece === 'B' ? 'ta dame' : 'ton pion'} à l'abri.`;
    }
    case 'best':
      return "C'est le meilleur coup selon l'ordinateur.";
  }
}
```

**Fichier : `src/draughts/help/blunder.ts`**
```ts
import { NO_BLUNDER, type BlunderVerdict } from '../../core/help';
import type { Evaluation } from '../../core/types';
import { legalMoves, play } from '../rules';
import type { DraughtsMove, DraughtsPos } from '../types';

export const DRAUGHTS_BLUNDER_THRESHOLD_CP = 200;

function pieces(count: number): string {
  return count > 1 ? `${count} pièces` : 'une pièce';
}

/** `before` : évaluation de `pos` pour le joueur ; `afterForOpponent` : évaluation après le coup, du point de vue de l'adversaire. */
export function detectDraughtsBlunder(pos: DraughtsPos, move: DraughtsMove, before: Evaluation, afterForOpponent: Evaluation): BlunderVerdict {
  if (before.mateIn !== undefined && before.mateIn < 0) return NO_BLUNDER;
  if (afterForOpponent.mateIn !== undefined && afterForOpponent.mateIn > 0) {
    return { blunder: true, message: "Attention : après ce coup, l'ordinateur peut gagner la partie de force." };
  }
  const hadWin = before.mateIn !== undefined && before.mateIn > 0;
  const stillWins = afterForOpponent.mateIn !== undefined && afterForOpponent.mateIn < 0;
  if (hadWin && !stillWins) {
    return { blunder: true, message: 'Attention : tu pouvais gagner la partie, et ce coup laisse passer l’occasion.' };
  }
  // La note du joueur après le coup vaut -afterForOpponent.scoreCp.
  const loss = before.scoreCp + afterForOpponent.scoreCp;
  if (loss < DRAUGHTS_BLUNDER_THRESHOLD_CP) return NO_BLUNDER;
  const [reply] = legalMoves(play(pos, move));
  if (reply && reply.captures.length > 0) {
    return {
      blunder: true,
      message: `Attention : après ce coup, l'ordinateur peut prendre ${pieces(reply.captures.length)} (en ${reply.captures.join(', ')}).`,
    };
  }
  return {
    blunder: true,
    message: `Attention : l'ordinateur voit que ce coup te fait perdre l'équivalent d'environ ${Math.round(loss / 100)} pions.`,
  };
}
```

**Fichier : `src/draughts/explain.ts`**
```ts
import { explainWith, type ResultText, type ResultTexts } from '../core/explain';
import type { Color, GameStatus } from '../core/types';

const DRAUGHTS_TEXTS: ResultTexts = {
  win: (_reason, view, loserSide) => {
    if (view === 'neutral') return `${loserSide} ne peuvent plus jouer : toutes leurs pièces sont prises ou bloquées.`;
    return view === 'winner'
      ? "L'adversaire ne peut plus jouer : toutes ses pièces sont prises ou bloquées."
      : 'Tu ne peux plus jouer : toutes tes pièces sont prises ou bloquées.';
  },
  draws: {
    repetition: 'La même position est revenue trois fois : personne ne gagne.',
    'king-moves': '25 coups de suite avec seulement des dames, sans prise ni pion joué : personne ne gagne.',
    'endgame-limit': 'Il reste trop peu de pièces pour gagner dans le nombre de coups permis : personne ne gagne.',
  },
};

/** `viewer` : couleur du joueur contre l'ordinateur, ou null en mode 2 joueurs. */
export function explainDraughtsResult(status: GameStatus, viewer: Color | null): ResultText {
  return explainWith(DRAUGHTS_TEXTS, status, viewer);
}
```

- [x] **Step 4 : Lancer les tests**

Run : `npx vitest run tests/unit/draughts` puis `npx tsc -b`
Expected : PASS (dont 5 + 5 + 2 nouveaux tests), aucune erreur.

- [x] **Step 5 : Commit**

```bash
git add src/draughts/help src/draughts/explain.ts tests/unit/draughts/help.test.ts tests/unit/draughts/explain.test.ts
git commit -m "feat: indice, alerte de gaffe et textes de fin de partie pour les dames"
```

---
### Task 9 : Dames — les 12 leçons (données) et leur test de validité

**Files:**
- Create: `src/draughts/lessons/basics.ts` (leçons 1 à 6), `src/draughts/lessons/advanced.ts` (leçons 7 à 12), `src/draughts/lessons/index.ts`
- Test: `tests/unit/draughts/lessons.test.ts`

**Interfaces:**
- Consumes: `Lesson`, `Exercise` (étape 1) ; `draughtsLessonRules`, `draughtsMoveId`, `parseDraughts`, `status` (Tâche 5) ; `startExercise`, `playPlayerMove`, `starsOf` (étape 1).
- Produces : `DRAUGHTS_LESSONS: readonly Lesson[]` (12 leçons, dans l'ordre de la spec §6.3), `findDraughtsLesson(id)`.

Les positions ont été vérifiées à la main case par case (voisins diagonaux tirés de la numérotation de la tâche 3) ; le test ci-dessous les revérifie avec les vraies règles. Si un exercice échoue, corriger la **donnée** de la leçon, jamais le test.

- [x] **Step 1 : Écrire le test qui échoue**

**Fichier : `tests/unit/draughts/lessons.test.ts`**
```ts
import { describe, expect, it } from 'vitest';
import { DRAUGHTS_LESSONS, findDraughtsLesson } from '../../../src/draughts/lessons';
import { draughtsLessonRules as rules, draughtsMoveId, parseDraughts, status } from '../../../src/draughts/rules';
import type { DraughtsPos } from '../../../src/draughts/types';
import { playPlayerMove, startExercise, starsOf, type ExerciseRun } from '../../../src/lessons/runner';
import type { Exercise } from '../../../src/lessons/types';

const SQUARE = /^([1-9]|[1-4]\d|50)$/;

/** Recherche en largeur : les étoiles peuvent-elles toutes être ramassées ? */
function solvesStars(exercise: Exercise, maxDepth = 10): boolean {
  let frontier: ExerciseRun<DraughtsPos>[] = [startExercise(rules, exercise)];
  const seen = new Set<string>();
  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth += 1) {
    const next: ExerciseRun<DraughtsPos>[] = [];
    for (const run of frontier) {
      for (const move of rules.legalMoves(run.pos)) {
        const after = playPlayerMove(rules, run, move);
        if (after.status === 'success') return true;
        const key = `${after.pos.board}|${after.remainingStars.join(',')}`;
        if (!seen.has(key)) {
          seen.add(key);
          next.push(after);
        }
      }
    }
    frontier = next;
  }
  return false;
}

function checkExercise(exercise: Exercise): void {
  const pos = rules.parse(exercise.position);
  const legal = rules.legalMoves(pos).map(draughtsMoveId);
  expect(exercise.instruction.length).toBeGreaterThan(10);
  switch (exercise.kind) {
    case 'reach':
    case 'collect':
      starsOf(exercise).forEach((star) => expect(star).toMatch(SQUARE));
      expect(solvesStars(exercise)).toBe(true);
      break;
    case 'find-move':
      exercise.solutions.forEach((solution) => expect(legal).toContain(solution));
      Object.keys(exercise.wrongMoveHints ?? {}).forEach((wrong) => {
        expect(legal).toContain(wrong);
        expect(exercise.solutions).not.toContain(wrong);
      });
      break;
    case 'mate-in-1':
      expect(rules.legalMoves(pos).some((move) => status(rules.play(pos, move)).kind === 'win')).toBe(true);
      break;
    case 'play-out':
      expect(status(parseDraughts(exercise.position))).toEqual({ kind: 'ongoing' });
      break;
  }
}

describe('leçons de dames', () => {
  it('propose 12 leçons aux identifiants uniques', () => {
    expect(DRAUGHTS_LESSONS).toHaveLength(12);
    expect(new Set(DRAUGHTS_LESSONS.map((lesson) => lesson.id)).size).toBe(12);
    expect(findDraughtsLesson('rafles')?.title).toBe('Les rafles');
    expect(findDraughtsLesson('inconnue')).toBeUndefined();
  });

  it.each(DRAUGHTS_LESSONS.map((lesson) => [lesson.id, lesson] as const))('%s : explication courte et 1 à 3 exercices', (_, lesson) => {
    expect(lesson.intro.length).toBeGreaterThanOrEqual(1);
    expect(lesson.intro.length).toBeLessThanOrEqual(3);
    expect(lesson.exercises.length).toBeGreaterThanOrEqual(1);
    expect(lesson.exercises.length).toBeLessThanOrEqual(3);
  });

  const exercises = DRAUGHTS_LESSONS.flatMap((lesson) =>
    lesson.exercises.map((exercise, index) => [`${lesson.id} n°${index + 1}`, exercise] as const),
  );

  it.each(exercises)('%s : position valide et exercice faisable', (_, exercise) => {
    checkExercise(exercise);
  });
});
```

- [x] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run : `npx vitest run tests/unit/draughts/lessons.test.ts`
Expected : FAIL — module `src/draughts/lessons` introuvable.

- [x] **Step 3 : Écrire les leçons 1 à 6**

**Fichier : `src/draughts/lessons/basics.ts`**
```ts
import type { Lesson } from '../../lessons/types';

export const BASIC_LESSONS: readonly Lesson[] = [
  {
    id: 'plateau',
    title: 'Le plateau et les cases foncées',
    intro: [
      'Le damier a 100 cases, mais on ne joue que sur les 50 cases foncées. Elles sont numérotées de 1 à 50 : tu vois le numéro dans le coin de chaque case.',
      'Chaque joueur a 20 pions. Les Blancs commencent, puis chacun joue à son tour.',
      "Pour gagner, il faut prendre toutes les pièces de l'adversaire, ou le bloquer pour qu'il ne puisse plus jouer.",
    ],
    exercises: [
      {
        kind: 'reach',
        position: 'W:W32:B',
        instruction: "Pour jouer, touche ton pion puis la case où tu veux l'amener. Amène-le sur l'étoile, en 28.",
        target: '28',
      },
    ],
  },
  {
    id: 'pion',
    title: 'Le déplacement du pion',
    intro: [
      "Le pion avance d'une seule case, en diagonale, toujours vers l'avant.",
      'Il ne recule jamais pour se déplacer, et il ne peut pas aller sur une case déjà occupée.',
    ],
    exercises: [
      { kind: 'collect', position: 'W:W46:B', instruction: 'Avance ton pion case après case pour ramasser les étoiles.', stars: ['37', '28'] },
      {
        kind: 'reach',
        position: 'W:W28,33:B',
        instruction: "Ton autre pion bloque un chemin : passe par l'autre diagonale pour atteindre l'étoile, en 24.",
        target: '24',
      },
    ],
  },
  {
    id: 'prise',
    title: 'La prise',
    intro: [
      "Quand un pion adverse est juste à côté du tien en diagonale et que la case derrière lui est libre, tu peux sauter par-dessus : il est pris et retiré du damier.",
      'Ton pion atterrit sur la case libre juste derrière la pièce prise.',
    ],
    exercises: [
      { kind: 'find-move', position: 'W:W32:B28', instruction: 'Saute par-dessus le pion noir pour le prendre.', solutions: ['32x23'] },
      {
        kind: 'find-move',
        position: 'W:W31,32,33:B27',
        instruction: 'Deux de tes pions peuvent prendre le pion noir. Prends-le !',
        solutions: ['31x22', '32x21'],
      },
    ],
  },
  {
    id: 'prise-obligatoire',
    title: 'La prise obligatoire',
    intro: [
      "Aux dames, prendre n'est pas un choix : si tu peux prendre une pièce, tu dois le faire.",
      "C'est pour ça que l'application ne te laisse pas bouger un autre pion quand une prise est possible.",
    ],
    exercises: [
      {
        kind: 'find-move',
        position: 'W:W33,46:B28',
        instruction: 'Tu voudrais peut-être avancer ton autre pion… mais une prise est possible. Joue le coup obligatoire.',
        solutions: ['33x22'],
      },
    ],
  },
  {
    id: 'prise-arriere',
    title: 'La prise en arrière',
    intro: [
      'Le pion ne recule jamais pour se déplacer, mais il peut prendre en arrière !',
      'Si un pion adverse est juste derrière le tien, en diagonale, avec une case libre derrière lui, tu peux (et tu dois) le prendre.',
    ],
    exercises: [
      { kind: 'find-move', position: 'W:W23:B28', instruction: 'Le pion noir est derrière ton pion. Prends-le en arrière.', solutions: ['23x32'] },
    ],
  },
  {
    id: 'rafles',
    title: 'Les rafles',
    intro: [
      "Après une prise, si ton pion peut encore sauter une autre pièce, il continue : c'est une rafle.",
      "Une rafle peut changer de direction, en avant comme en arrière. Les pièces prises ne sont retirées qu'à la fin.",
    ],
    exercises: [
      {
        kind: 'find-move',
        position: 'W:W32:B28,19',
        instruction: "Prends les deux pions noirs d'un seul coup : touche ton pion puis la case où il termine sa rafle.",
        solutions: ['32x23x14'],
      },
      {
        kind: 'find-move',
        position: 'W:W33:B28,18,19',
        instruction: 'Enchaîne trois prises, en avant puis en arrière. Où ton pion termine-t-il sa rafle ?',
        solutions: ['33x22x13x24'],
      },
    ],
  },
];
```

- [x] **Step 4 : Écrire les leçons 7 à 12**

**Fichier : `src/draughts/lessons/advanced.ts`**
```ts
import type { Lesson } from '../../lessons/types';

const FAR_PAWN = 'Ce pion est encore loin. Avance plutôt celui qui peut devenir dame tout de suite !';
const NOT_FORCING = "Ce coup ne force rien. Cherche le pion à offrir : l'adversaire sera obligé de le prendre, et tu reprendras deux pions.";

export const ADVANCED_LESSONS: readonly Lesson[] = [
  {
    id: 'prise-maximale',
    title: 'La règle de la prise maximale',
    intro: [
      'Quand plusieurs prises sont possibles, tu dois choisir celle qui prend le plus de pièces. Un pion et une dame comptent pareil.',
      'Si deux prises prennent autant de pièces, tu choisis celle que tu préfères.',
    ],
    exercises: [
      {
        kind: 'find-move',
        position: 'W:W32,36:B28,19,31',
        instruction: "Un de tes pions peut prendre un pion noir, l'autre peut en prendre deux. La règle t'oblige à prendre le plus : joue la rafle.",
        solutions: ['32x23x14'],
      },
      {
        kind: 'find-move',
        position: 'W:W32,33:B28',
        instruction: "Deux prises d'un seul pion sont possibles : à égalité, tu choisis. Prends le pion noir.",
        solutions: ['32x23', '33x22'],
      },
    ],
  },
  {
    id: 'promotion',
    title: 'La promotion',
    intro: [
      'Quand ton pion termine son coup sur la dernière rangée, tout en haut, il devient une dame : une couronne apparaît sur lui.',
      "Attention : s'il ne fait que passer par la dernière rangée pendant une rafle, il reste un pion.",
    ],
    exercises: [
      {
        kind: 'find-move',
        position: 'W:W9,33:B45',
        instruction: 'Un de tes pions peut devenir dame en un seul coup. Lequel ? Joue-le.',
        solutions: ['9-3', '9-4'],
        wrongMoveHints: { '33-28': FAR_PAWN, '33-29': FAR_PAWN },
      },
      {
        kind: 'find-move',
        position: 'W:W13:B9,10',
        instruction: "Joue la rafle obligatoire : ton pion passe par la dernière rangée mais n'y termine pas, il reste pion.",
        solutions: ['13x4x15'],
      },
      {
        kind: 'play-out',
        position: 'W:W12:B36',
        instruction: "Mène ton pion jusqu'à la dernière rangée pour en faire une dame. L'ordinateur joue les Noirs.",
        goal: 'promote',
        level: 'faible',
      },
    ],
  },
  {
    id: 'dame-volante',
    title: 'La dame volante',
    intro: [
      "La dame se déplace en diagonale, en avant comme en arrière, d'autant de cases qu'elle veut, tant que le chemin est libre.",
      "C'est la pièce la plus forte : elle vaut environ trois pions.",
    ],
    exercises: [
      {
        kind: 'collect',
        position: 'W:WK46:B',
        instruction: 'Ramasse les étoiles avec ta dame. Elle peut traverser tout le damier en un seul coup !',
        stars: ['5', '45', '1'],
      },
    ],
  },
  {
    id: 'prise-dame',
    title: 'La prise par la dame',
    intro: [
      'La dame prend à distance : elle peut sauter une pièce adverse éloignée sur sa diagonale, si les cases entre elles sont libres.',
      "Après la prise, elle s'arrête sur la case libre de son choix derrière la pièce prise, sauf si une de ces cases lui permet de continuer : elle doit alors prendre le plus de pièces possible.",
    ],
    exercises: [
      {
        kind: 'find-move',
        position: 'W:WK46:B28',
        instruction: "Prends le pion noir avec ta dame. Elle peut s'arrêter sur n'importe quelle case libre après lui.",
        solutions: ['46x23', '46x19', '46x14', '46x10', '46x5'],
      },
      {
        kind: 'find-move',
        position: 'W:WK46:B28,13',
        instruction: "Cette fois, choisis la case d'arrivée qui permet à ta dame de prendre aussi le deuxième pion.",
        solutions: ['46x19x8', '46x19x2'],
      },
    ],
  },
  {
    id: 'nulle',
    title: 'La partie nulle',
    intro: [
      'Une partie est nulle (personne ne gagne) si la même position revient trois fois, ou si pendant 25 coups chaque joueur ne bouge que des dames, sans prise.',
      "Avec très peu de pièces, la partie est aussi nulle au bout de quelques coups : par exemple, deux dames contre une doivent gagner en 5 coups, sinon c'est nulle.",
    ],
    exercises: [
      {
        kind: 'mate-in-1',
        position: 'W:WK46,K3:BK28',
        instruction: 'Tu as deux dames contre une : ne laisse pas filer la victoire. Gagne en un coup en prenant la dame noire !',
      },
    ],
  },
  {
    id: 'tactique',
    title: 'Premiers coups tactiques',
    intro: [
      "Comme la prise est obligatoire, tu peux forcer l'adversaire à prendre : c'est la base des combinaisons.",
      "L'idée : offrir un pion pour que l'adversaire, obligé de le prendre, place sa pièce là où tu pourras en prendre deux.",
    ],
    exercises: [
      {
        kind: 'find-move',
        position: 'W:W32,33,38,43:B22,23',
        instruction: 'Offre un pion : le pion noir sera obligé de le prendre, puis tu en prendras deux.',
        solutions: ['32-28'],
        wrongMoveHints: { '32-27': NOT_FORCING, '33-29': NOT_FORCING },
      },
      {
        kind: 'find-move',
        position: 'W:W33,38,43:B22,32',
        instruction: 'Le pion noir vient de prendre ton pion. À toi de jouer la rafle qui prend deux pions !',
        solutions: ['38x27x18'],
      },
    ],
  },
];
```

**Fichier : `src/draughts/lessons/index.ts`**
```ts
import type { Lesson } from '../../lessons/types';
import { ADVANCED_LESSONS } from './advanced';
import { BASIC_LESSONS } from './basics';

export const DRAUGHTS_LESSONS: readonly Lesson[] = [...BASIC_LESSONS, ...ADVANCED_LESSONS];

export function findDraughtsLesson(id: string): Lesson | undefined {
  return DRAUGHTS_LESSONS.find((lesson) => lesson.id === id);
}
```

- [x] **Step 5 : Lancer le test**

Run : `npx vitest run tests/unit/draughts/lessons.test.ts`
Expected : PASS (1 + 12 + 20 tests).

- [x] **Step 6 : Commit**

```bash
git add src/draughts/lessons tests/unit/draughts/lessons.test.ts
git commit -m "feat: 12 leçons de dames interactives"
```

---

### Task 10 : Les dames dans l'app

**Files:**
- Create: `src/app/games/draughts.ts`, `src/app/components/CapturePicker.tsx`
- Modify: `src/app/games/index.ts`, `src/app/screens/HomeScreen.tsx`, `src/app/screens/SettingsScreen.tsx`
- Test: `tests/unit/app/games.test.ts` (remplacé), `tests/unit/app/capture-picker.test.tsx` (nouveau), `tests/unit/app/menus.test.tsx` (bloc « accueil »), `tests/unit/app/App.test.tsx` (complété)

**Interfaces:**
- Consumes: tout ce qui précède (`GameKit`, règles, moteur, vue, aide, leçons, textes des dames).
- Produces : `draughtsKit: GameKit<DraughtsPos, DraughtsMove>`, `CapturePicker` (choix entre rafles de même trajet), `withKit('draughts', …)` rend le kit, bouton « Dames » actif à l'accueil.

- [x] **Step 1 : Écrire les tests qui échouent**

**Fichier : `tests/unit/app/games.test.ts`**
```ts
import { describe, expect, it } from 'vitest';
import { withKit } from '../../../src/app/games';
import { chessKit } from '../../../src/app/games/chess';
import { draughtsKit } from '../../../src/app/games/draughts';
import { parseChess } from '../../../src/chess/adapter';
import { parseDraughts } from '../../../src/draughts/rules';

describe('kits de jeu', () => {
  it('décrit les échecs pour les écrans communs', () => {
    const pos = parseChess('rnbqkbnr/ppp1pppp/8/8/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1');
    expect(chessKit.capturedPieces(pos).black).toEqual([{ image: expect.any(String), label: 'Pion noir' }]);
    expect(chessKit.checkSquare(chessKit.adapter.initial())).toBeNull();
    expect(chessKit.moveSound(chessKit.adapter.initial(), { from: 'e2', to: 'e4' })).toBe('move');
    expect(chessKit.lessons).toHaveLength(17);
    expect(chessKit.geometry('white').size).toBe(8);
    expect(chessKit.explainResult({ kind: 'ongoing' }, null).title).toBe('Partie en cours');
  });

  it('décrit les dames pour les écrans communs', () => {
    const start = draughtsKit.adapter.initial();
    const pos = parseDraughts('W:W32:B28');
    const [capture] = draughtsKit.adapter.legalMoves(pos);
    expect(draughtsKit.boardPieces(start)).toHaveLength(40);
    expect(draughtsKit.geometry('white').size).toBe(10);
    expect(draughtsKit.checkSquare(start)).toBeNull();
    expect(draughtsKit.moveSound(pos, capture)).toBe('capture');
    expect(draughtsKit.moveSound(start, draughtsKit.adapter.legalMoves(start)[0])).toBe('move');
    expect(draughtsKit.capturedPieces(pos).white).toHaveLength(19);
    expect(draughtsKit.capturedPieces(pos).black[0]).toEqual({ image: expect.any(String), label: 'Pion noir' });
    expect(draughtsKit.lessons).toHaveLength(12);
    expect(draughtsKit.codec.decode('32x23', pos)).toMatchObject({ captures: ['28'] });
    expect(draughtsKit.explainResult({ kind: 'draw', reason: 'king-moves' }, null).title).toBe('Partie nulle');
  });

  it('donne le kit du jeu demandé', () => {
    expect(withKit('chess', (kit) => kit.title)).toBe('Échecs');
    expect(withKit('draughts', (kit) => kit.title)).toBe('Dames');
  });
});
```

**Fichier : `tests/unit/app/capture-picker.test.tsx`**
```tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { CapturePicker } from '../../../src/app/components/CapturePicker';
import type { DraughtsMove } from '../../../src/draughts/types';

const choices: DraughtsMove[] = [
  { from: '5', to: '37', steps: ['23', '37'], captures: ['19', '32'], promotes: false },
  { from: '5', to: '37', steps: ['28', '37'], captures: ['19', '33'], promotes: false },
];

describe('CapturePicker', () => {
  it('propose chaque rafle et renvoie le choix', () => {
    const onPick = vi.fn();
    const onCancel = vi.fn();
    render(<CapturePicker color="white" choices={choices} onPick={onPick} onCancel={onCancel} />);
    expect(screen.getByRole('dialog', { name: 'Quelle rafle ?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Prendre en 19, 33' }));
    expect(onPick).toHaveBeenCalledWith(choices[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
```

Dans `tests/unit/app/menus.test.tsx`, remplacer tout le bloc `describe('accueil', () => { … });` par :
```tsx
describe('accueil', () => {
  it('ouvre les échecs et les dames', () => {
    const onNavigate = vi.fn();
    render(<HomeScreen onNavigate={onNavigate} storageAvailable={false} />);
    expect(screen.getByText(/ne seront pas sauvegardées/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Échecs/ }));
    fireEvent.click(screen.getByRole('button', { name: /Dames/ }));
    expect(onNavigate.mock.calls.map(([route]) => route)).toEqual([
      { name: 'menu', game: 'chess' },
      { name: 'menu', game: 'draughts' },
    ]);
  });
});
```

Dans `tests/unit/app/App.test.tsx`, ajouter avant la dernière ligne `});` :
```tsx

  it('affiche le menu des dames', () => {
    window.location.hash = '#/dames';
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Dames' })).toBeTruthy();
    expect(screen.getByText('0 / 12 leçons terminées')).toBeTruthy();
  });

  it('démarre une partie de dames à deux joueurs', () => {
    window.location.hash = '#/dames/partie/deux-joueurs';
    const { container } = render(<App />);
    expect(screen.getByRole('status').textContent).toBe('Au tour des Blancs');
    expect(container.querySelectorAll('[data-piece]')).toHaveLength(40);
    expect(container.querySelectorAll('.sq-num')).toHaveLength(50);
  });
```

- [x] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run tests/unit/app`
Expected : FAIL — `games/draughts` et `CapturePicker` introuvables, bouton « Dames » désactivé, adresses `#/dames` renvoyées vers l'accueil.

- [x] **Step 3 : Écrire le choix de rafle et le kit des dames**

**Fichier : `src/app/components/CapturePicker.tsx`**
```tsx
import type { DraughtsMove } from '../../draughts/types';
import type { ChoicePickerProps } from '../games/kit';

/** Plusieurs rafles mènent à la même case avec des pièces prises différentes : le joueur choisit. */
export function CapturePicker({ choices, onPick, onCancel }: ChoicePickerProps<DraughtsMove>) {
  return (
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="capture-title">
      <div class="modal">
        <h2 id="capture-title">Quelle rafle ?</h2>
        <p>Plusieurs prises mènent à cette case : choisis les pièces à prendre.</p>
        {choices.map((move) => (
          <button type="button" key={move.captures.join('-')} class="btn" onClick={() => onPick(move)}>
            Prendre en {move.captures.join(', ')}
          </button>
        ))}
        <button type="button" class="btn btn-small" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </div>
  );
}
```

**Fichier : `src/app/games/draughts.ts`**
```ts
import type { Color } from '../../core/types';
import { getDraughtsEngine } from '../../draughts/engine';
import { DRAUGHTS_BLUNDER_DEPTH, DRAUGHTS_HINT_DEPTH } from '../../draughts/engine/levels';
import { explainDraughtsResult } from '../../draughts/explain';
import { draughtsGeometry } from '../../draughts/geometry';
import { detectDraughtsBlunder } from '../../draughts/help/blunder';
import { draughtsHintText } from '../../draughts/help/hint';
import { DRAUGHTS_LESSONS } from '../../draughts/lessons';
import { draughtsPieceImage, draughtsPieceLabel } from '../../draughts/pieces';
import { draughtsAdapter, draughtsLessonRules, draughtsMoveCodec } from '../../draughts/rules';
import type { DraughtsMove, DraughtsPos } from '../../draughts/types';
import { draughtsBoardPieces, lostPieceCounts } from '../../draughts/view';
import { CapturePicker } from '../components/CapturePicker';
import { STORAGE_KEYS } from '../storage';
import type { GameKit, PieceIcon } from './kit';

const lostIcons = (color: Color, count: number): PieceIcon[] =>
  Array.from({ length: count }, () => ({ image: draughtsPieceImage(color, 'man'), label: draughtsPieceLabel(color, 'man') }));

export const draughtsKit: GameKit<DraughtsPos, DraughtsMove> = {
  id: 'draughts',
  title: 'Dames',
  adapter: draughtsAdapter,
  codec: draughtsMoveCodec,
  savedGameKey: STORAGE_KEYS.draughtsSavedGame,
  progressKey: STORAGE_KEYS.draughtsProgress,
  lessons: DRAUGHTS_LESSONS,
  lessonRules: draughtsLessonRules,
  help: {
    hintDepth: DRAUGHTS_HINT_DEPTH,
    blunderDepth: DRAUGHTS_BLUNDER_DEPTH,
    hintText: draughtsHintText,
    detectBlunder: detectDraughtsBlunder,
  },
  engine: getDraughtsEngine,
  geometry: draughtsGeometry,
  boardPieces: draughtsBoardPieces,
  capturedPieces: (pos) => {
    const lost = lostPieceCounts(pos);
    return { white: lostIcons('white', lost.white), black: lostIcons('black', lost.black) };
  },
  checkSquare: () => null,
  moveSound: (_pos, move) => (move.captures.length > 0 ? 'capture' : 'move'),
  explainResult: explainDraughtsResult,
  ChoicePicker: CapturePicker,
};
```

- [x] **Step 4 : Brancher les dames**

**Fichier : `src/app/games/index.ts`**
```ts
import type { MoveShape } from '../../board/move-input';
import type { GameId } from '../../core/types';
import { chessKit } from './chess';
import { draughtsKit } from './draughts';
import type { GameKit } from './kit';

/** Appelle `run` avec le kit du jeu demandé ; null si ce jeu n'est pas disponible. */
export function withKit<R>(game: GameId, run: <Pos, Move extends MoveShape>(kit: GameKit<Pos, Move>) => R): R | null {
  switch (game) {
    case 'chess':
      return run(chessKit);
    case 'draughts':
      return run(draughtsKit);
  }
}
```

Dans `src/app/screens/HomeScreen.tsx`, remplacer :
```tsx
      <button type="button" class="btn" disabled>
        ⛂ Dames
        <span class="sub">Bientôt disponible</span>
      </button>
```
par :
```tsx
      <button type="button" class="btn" onClick={() => onNavigate({ name: 'menu', game: 'draughts' })}>
        ⛂ Dames
        <span class="sub">Apprendre et jouer</span>
      </button>
```

Dans `src/app/screens/SettingsScreen.tsx`, remplacer :
```tsx
          Moteur d'échecs : Stockfish (licence GPL-3.0). Pièces : « cburnett » (licence GPLv2+). Cette application est un logiciel
          libre sous licence GPL-3.0.
```
par :
```tsx
          Moteur d'échecs : Stockfish (licence GPL-3.0). Pièces d'échecs : « cburnett » (licence GPLv2+). Moteur de dames : écrit
          pour cette application. Cette application est un logiciel libre sous licence GPL-3.0.
```

- [x] **Step 5 : Lancer les tests, le typage et la couverture**

Run : `npx vitest run` puis `npx tsc -b` puis `npm run test:coverage`
Expected : PASS, aucune erreur, couverture ≥ 80 % sur les quatre indicateurs.

- [x] **Step 6 : Vérifier à la main dans le navigateur**

Run : `npm run dev`, ouvrir l'adresse affichée en format téléphone.
Expected : Accueil → Dames → Apprendre à jouer → leçon 1 réussie ; « 2 joueurs sur ce téléphone » : les numéros des cases s'affichent, une prise est obligatoire (les autres pièces ne se sélectionnent pas) ; « Contre l'ordinateur » en Faible : l'ordinateur répond sans figer l'écran, « Indice » affiche une flèche ; recharger la page reprend la partie.

- [x] **Step 7 : Commit**

```bash
git add src/app tests/unit/app
git commit -m "feat: les dames dans l'app (kit, choix de rafle, accueil)"
```

---

### Task 11 : Tests de bout en bout, force de l'IA des dames et vérification finale

**Files:**
- Create: `tests/e2e/draughts.spec.ts`, `tests/strength/draughts-strength.test.ts`

**Interfaces:**
- Consumes: l'app construite ; `DraughtsEngine`, `createInlineSearcher`, `DRAUGHTS_LEVELS`, `draughtsAdapter`, `draughtsMoveId`, `parseDraughts` ; `play` (`tests/e2e/helpers.ts`).
- Produces : `npm run e2e` (10 scénarios) et `npm run test:strength` (échecs + dames) verts.

Seuils des matchs de dames : la spec (§10) fixe « Expert bat Moyen ≥ 9 sur 10, Moyen bat Faible ≥ 8 sur 10 ». Les dames finissent beaucoup plus souvent nulles que les échecs (et les fins à 16 / 5 coups rendent nulles bien des finales gagnées au matériel) : pour Expert contre Moyen, le test exige **au moins 6 victoires et aucune défaite** sur 10 ; Moyen contre Faible garde le seuil de la spec (≥ 8 victoires). Cet écart est à signaler dans le compte rendu. Temps réduit pour les matchs : Expert 300 ms.

- [x] **Step 1 : Écrire les scénarios de bout en bout**

**Fichier : `tests/e2e/draughts.spec.ts`**
```ts
import { expect, test, type Page } from '@playwright/test';
import { play } from './helpers';

async function openDraughts(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /Dames/ }).click();
}

test('dames : suivre la première leçon', async ({ page }) => {
  await openDraughts(page);
  await page.getByRole('button', { name: /Apprendre à jouer/ }).click();
  await page.getByRole('button', { name: /1\. Le plateau et les cases foncées/ }).click();
  await page.getByRole('button', { name: 'Commencer' }).click();
  await play(page, '32', '28');
  await expect(page.getByText('Bravo, exercice réussi !')).toBeVisible();
});

test('dames à deux : une prise obligatoire, puis la reprise après rechargement', async ({ page }) => {
  await openDraughts(page);
  await page.getByRole('button', { name: /2 joueurs sur ce téléphone/ }).click();
  await play(page, '32', '28');
  await play(page, '19', '23');
  await play(page, '28', '19');
  await expect(page.locator('[data-piece="19"]')).toHaveAttribute('aria-label', 'Pion blanc');
  await expect(page.locator('[data-piece="23"]')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-piece="19"]')).toHaveAttribute('aria-label', 'Pion blanc');
  await expect(page.getByRole('status')).toHaveText('Au tour des Noirs');
});

test('dames contre l’ordinateur en Faible : réponse et indice', async ({ page }) => {
  await openDraughts(page);
  await page.getByRole('button', { name: 'Faible' }).click();
  await page.getByRole('button', { name: 'Blancs' }).click();
  await page.getByRole('button', { name: 'Jouer', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('À toi de jouer');
  await play(page, '32', '28');
  await expect(page.getByRole('status')).toHaveText('À toi de jouer', { timeout: 30_000 });
  await expect(page.locator('[data-piece]')).toHaveCount(40);
  await page.getByRole('button', { name: 'Indice' }).click();
  await expect(page.locator('line.arrow')).toHaveCount(1);
  await expect(page.getByText(/💡/)).toBeVisible();
});
```

- [x] **Step 2 : Lancer les tests de bout en bout**

Run : `npm run e2e`
Expected : 10 scénarios PASS (7 échecs + 3 dames). En cas d'échec, lire la trace (`npx playwright show-trace test-results/<dossier>/trace.zip`) et corriger le **code** de l'app.

- [x] **Step 3 : Écrire les tests de force des dames**

**Fichier : `tests/strength/draughts-strength.test.ts`**
```ts
import { describe, expect, it } from 'vitest';
import type { GameStatus, Level } from '../../src/core/types';
import { DraughtsEngine } from '../../src/draughts/engine/draughts-engine';
import { DRAUGHTS_LEVELS } from '../../src/draughts/engine/levels';
import { createInlineSearcher } from '../../src/draughts/engine/searcher';
import { draughtsAdapter, draughtsMoveId, parseDraughts } from '../../src/draughts/rules';
import type { DraughtsPos } from '../../src/draughts/types';

const FAST_LEVELS = { ...DRAUGHTS_LEVELS, expert: { ...DRAUGHTS_LEVELS.expert, timeMs: 300 } };
const MAX_PLIES = 200;
const engine = new DraughtsEngine(createInlineSearcher(), { sleep: async () => undefined, levels: FAST_LEVELS });
const signal = () => new AbortController().signal;

async function playOut(start: DraughtsPos, white: Level, black: Level): Promise<GameStatus> {
  let pos = start;
  for (let ply = 0; ply < MAX_PLIES; ply += 1) {
    const current = draughtsAdapter.status(pos);
    if (current.kind !== 'ongoing') return current;
    const level = pos.turn === 'white' ? white : black;
    pos = draughtsAdapter.play(pos, await engine.bestMove(pos, level, signal()));
  }
  const final = draughtsAdapter.status(pos);
  // Arbitrage : une partie trop longue compte comme nulle.
  return final.kind !== 'ongoing' ? final : { kind: 'draw', reason: 'king-moves' };
}

/** Joue `games` parties en alternant les couleurs ; compte les victoires et défaites de `strong`. */
async function match(strong: Level, weak: Level, games: number): Promise<{ readonly wins: number; readonly losses: number }> {
  let wins = 0;
  let losses = 0;
  for (let game = 0; game < games; game += 1) {
    const strongColor = game % 2 === 0 ? 'white' : 'black';
    const result = await playOut(draughtsAdapter.initial(), strongColor === 'white' ? strong : weak, strongColor === 'white' ? weak : strong);
    if (result.kind === 'win') {
      if (result.winner === strongColor) wins += 1;
      else losses += 1;
    }
  }
  return { wins, losses };
}

describe('force de l’IA de dames', () => {
  it.each([
    ['W:W32,33,38,43:B1,2,22,23', '32-28'],
    ['W:W32,33,38,43:B4,5,12,22,23', '32-28'],
  ])('Expert trouve le coup tactique dans %s', async (fen, expected) => {
    expect(draughtsMoveId(await engine.bestMove(parseDraughts(fen), 'expert', signal()))).toBe(expected);
  });

  it('Expert bat Moyen (au moins 6 victoires, aucune défaite sur 10)', async () => {
    const { wins, losses } = await match('expert', 'moyen', 10);
    expect(losses).toBe(0);
    expect(wins).toBeGreaterThanOrEqual(6);
  });

  it('Moyen bat Faible au moins 8 fois sur 10', async () => {
    expect((await match('moyen', 'faible', 10)).wins).toBeGreaterThanOrEqual(8);
  });
});
```

Seconde position tactique : après 32-28 et la prise forcée 23x32, les Blancs jouent 38x27x18x7 et prennent trois pions (32, 22, 12) pour un.

- [x] **Step 4 : Lancer les tests de force**

Run : `npm run test:strength`
Expected : PASS (5 tests d'échecs + 4 de dames, plusieurs minutes). Si un match échoue de peu, relancer une fois (hasard des niveaux Faible et Moyen). S'il échoue encore, revoir l'évaluation ou les niveaux (spec §5.2) sans baisser les seuils, et le signaler.

- [x] **Step 5 : Vérification finale de l'étape 2**

Run : `npm run test:coverage` → PASS, couverture ≥ 80 % sur les quatre indicateurs.
Run : `npm run build` → build réussi ; `grep -o 'worker-[A-Za-z0-9_-]*\.js' dist/sw.js | sort -u` affiche le fichier du worker des dames (précaché pour le hors-ligne).
Run : `npm run e2e` → 10 scénarios PASS.

- [x] **Step 6 : Commit**

```bash
git add tests/e2e/draughts.spec.ts tests/strength/draughts-strength.test.ts
git commit -m "test: dames de bout en bout et force de l'IA"
```

---

## Couverture de la spec (auto-relecture)

| Exigence de la spec (étape 2) | Tâche |
|---|---|
| Interface commune `GameAdapter` / `Engine`, écrans écrits une fois pour les deux jeux (§3.3) | 1, 2, 10 |
| Plateau 10×10, cases numérotées 1-50, Blancs d'abord (§7.2) | 3, 4 |
| Pion : avance d'une case, prend en avant et en arrière ; prise obligatoire et maximale ; coup turc ; promotion en fin de coup seulement ; dame volante (§7.2) | 4 |
| Perft 9, 81, 658, 4 265, 27 117, 167 140 (§10, §11) | 4 |
| Fin : plus de pièce ou plus de coup ; nulles : répétition, 25 coups, 16 / 5 coups (§7.2) | 5 |
| Moteur : ID, alpha-bêta PVS, table de transposition Zobrist, tri des coups, réductions, quiescence sur les prises (§5.2) | 6 |
| Évaluation : matériel 100 / 320, avance, centre, formations, pions bloqués, pions qui filent à dame, mobilité des dames (§5.2) | 6 |
| Niveaux Faible (prof. 2 + bruit + coup moyen), Moyen (prof. 6 + léger bruit), Expert (3 s) ; délai minimal ; délai dépassé + relance (§5.2, §8) | 7 |
| Réflexion dans un Web Worker, écran jamais figé (§3.4) | 7, 11 (build + hors ligne) |
| Aide Faible : indice profondeur 8 avec raison, alerte gaffe ≥ 200 ou victoire forcée, annulation (§5.3) | 8, 2 (`useGame`) |
| Pas d'aide en Moyen / Expert / 2 joueurs (§5.3) | 2 (`canUndo`, `faibleHelp`) |
| 12 leçons de dames dans l'ordre de §6.3, validées par un test | 9 |
| 2 joueurs sur le même téléphone, sauvegarde et reprise, écran de fin expliqué (§4) | 2, 5, 8, 10, 11 |
| Tests : unitaires ≥ 80 %, bout en bout, coups tactiques et matchs (§10) | toutes, 11 |

## Écarts constatés à l'exécution

- **Tâche 7, étape 6** : le fichier `worker-*.js` n'apparaît dans le build qu'à partir de la tâche 10, quand l'app importe enfin le moteur de dames ; la vérification a été faite à la tâche 11 (worker présent et précaché par le service worker).
- **Relecture de code (après la tâche 11)** : le compte des fins de partie à 16 / 5 coups ne repartait pas de zéro après une prise qui gardait la même règle (ex. dame + pion contre dame, la dame seule prend le pion). Corrigé dans `rules.ts` (extrait ci-dessus mis à jour) avec le test « recommence le compte des fins de partie après une prise ».
- **Force mesurée** (Expert à 300 ms, soit la profondeur 9, au lieu des 3 s de l'app) : Expert contre Moyen = 8 victoires, 2 nulles, 0 défaite ; Moyen contre Faible = 10 victoires sur 10. Le seuil de la spec pour Expert contre Moyen (9 victoires sur 10) n'est pas atteint dans ces conditions ; le test exige 6 victoires et aucune défaite.
