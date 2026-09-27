# Étape 3 — Jeu en ligne entre amis : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deux amis jouent aux échecs ou aux dames en ligne (en direct ou à leur rythme), par un code ou un lien, sans compte ; l'app est mise en ligne sur GitHub Pages.

**Architecture:** Une table Postgres `parties` (projet Supabase « jeux-kzo ») est la source de vérité ; toute écriture passe par des fonctions `security definer` qui vérifient l'identité, le tour et l'ordre des coups ; les téléphones vérifient la légalité avec les kits de jeu existants. Côté app, `src/online/` (données et transport, chargé à la demande) fournit une `OnlineApi` construite sur une interface `Backend` (Supabase en vrai, faux serveur en test) ; `src/app/online/` contient la logique d'affichage, les hooks et les écrans. Une notification Realtime déclenche simplement une relecture de la partie.

**Tech Stack:** Vite 8, Preact 10, TypeScript 6, `@supabase/supabase-js` 2.117, Supabase (Postgres 17, Auth anonyme, Realtime, pg_cron), Vitest 5, Playwright 1.63, GitHub Actions (`checkout@v7`, `setup-node@v7`, `upload-pages-artifact@v5`, `deploy-pages@v5`).

**Spec :** `docs/superpowers/specs/2026-09-26-etape3-en-ligne-design.md`

## Global Constraints

- Interface **en français** ; le joueur est tutoyé ; formulations neutres (pas de « il / elle » pour l'ami : « C'est à Marie de jouer »).
- Licence GPL-3.0-or-later ; le code source est lié depuis « À propos ».
- `tsconfig` : `erasableSyntaxOnly`, `verbatimModuleSyntax`, `noUnusedLocals`, `noUnusedParameters` (préfixe `_`).
- Pas de `console.log` (`logWarning`). Fichiers ≤ 400 lignes. Couverture ≥ 80 % (hors `src/online/client.ts`, `src/online/index.ts`, écrans et hooks d'écran déjà exclus).
- Toute donnée reçue du serveur est **validée** (`parseGameRow`) avant usage.
- Codes de partie : 6 caractères de `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. Pseudo : 1 à 20 caractères, espaces retirés aux bords.
- Serveur : lecture réservée aux deux joueurs (RLS) ; aucune écriture directe ; fonctions `creer_partie`, `rejoindre_partie`, `jouer_coup`, `proposer_nulle`, `repondre_nulle`, `abandonner`, `annuler_partie`, `lancer_revanche` ; au plus 20 parties non terminées par joueur ; nettoyage des parties inactives depuis 7 jours.
- Clés dans l'app : `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` (publiques par nature) ; en local dans `.env.local` (ignoré par git), en CI dans les variables du dépôt.
- Actions sur les comptes de l'utilisateur (création du projet, réglages Supabase, dépôt public, GitHub Pages) : **annoncées et confirmées** au moment de les faire.
- Commits conventionnels, sans `Co-Authored-By`.

## Carte des fichiers

```
supabase/migrations/20260926000000_parties.sql   table, RLS, fonctions, Realtime, nettoyage
src/core/types.ts          + DrawReason 'agreement', WIN_REASONS, DRAW_REASONS
src/core/explain.ts        + texte commun « nulle d'un commun accord »
src/app/settings.ts        + pseudo, cleanPseudo, PSEUDO_MAX_LENGTH
src/app/game/session.ts    + GameMode 'online'
src/online/                données et transport (chargé à la demande)
  code.ts                  CODE_ALPHABET, normalizeCode, inviteLink
  types.ts                 OnlineGame, OnlineSeat, OnlineStatus
  errors.ts                OnlineError, codes du serveur, messages
  rows.ts                  parseGameRow, parseResult
  backend.ts               interface Backend, WatchHandlers
  api.ts                   OnlineApi, createOnlineApi
  config.ts                readConfig
  client.ts                Backend Supabase (exclu de la couverture)
  index.ts                 getOnlineApi (import dynamique, exclu de la couverture)
src/board/useMoveInput.ts  saisie d'un coup (toucher / glisser / choix)
src/app/components/BoardView.tsx   plateau + pièces prises + choix (commun local / en ligne)
src/app/online/            écrans et logique d'affichage du jeu en ligne
  view.ts                  buildOnlineView, resultAfter, onlineStatusText, listEntries, turnOf
  share.ts                 shareInvite
  useOnlineApi.ts, useOnlineGame.ts
  OnlineFrame.tsx          cadre commun (barre du haut) et état de la connexion
  PseudoForm.tsx, WaitingRoom.tsx, OnlineMenuScreen.tsx, OnlineGameScreen.tsx, JoinScreen.tsx
src/app/router.ts          + routes online, onlineGame, join
src/app/navigation.ts      + redirect (remplace l'entrée d'historique)
vitest.online.config.ts, playwright.online.config.ts   tests à la demande contre le vrai serveur
.github/workflows/pages.yml         typage + tests + build ; déploiement GitHub Pages sur main
tests/unit/online/**, tests/unit/app/online/**, tests/online/parties.test.ts, tests/e2e-online/online.spec.ts
```

## Mode d'emploi des blocs de code

Un bloc précédé de **`Fichier : chemin`** donne le contenu **complet** du fichier. Les petites retouches sont données en « remplacer … par … ».

---

### Task 1 : Socle — nulle d'accord, mode en ligne, pseudo, codes de partie

**Files:**
- Create: `src/online/code.ts`
- Modify: `src/core/types.ts`, `src/core/explain.ts`, `src/app/game/session.ts`, `src/app/settings.ts`, `src/app/screens/SettingsScreen.tsx`, `src/styles/global.css`
- Test: `tests/unit/online/code.test.ts` (nouveau), `tests/unit/core/explain.test.ts`, `tests/unit/app/settings-progress.test.ts`, `tests/unit/app/menus.test.tsx` (bloc « réglages »)

**Interfaces:**
- Produces :
  - `core/types.ts` : `DrawReason` + `'agreement'` ; `WIN_REASONS: readonly WinReason[]`, `DRAW_REASONS: readonly DrawReason[]`.
  - `core/explain.ts` : la nulle `agreement` a un texte commun (« Les deux joueurs se sont mis d'accord : personne ne gagne. »).
  - `session.ts` : `GameMode = 'ai' | 'local' | 'online'`.
  - `settings.ts` : `PSEUDO_MAX_LENGTH = 20`, `Settings { sound; pseudo: string | null }`, `DEFAULT_SETTINGS = { sound: true, pseudo: null }`, `cleanPseudo(value): string | null`.
  - `online/code.ts` : `CODE_ALPHABET`, `CODE_LENGTH = 6`, `normalizeCode(input): string | null`, `inviteLink(base, code): string`.
  - `SettingsScreen` : champ « Pseudo pour le jeu en ligne », lien « Code source sur GitHub ».

- [x] **Step 1 : Écrire les tests qui échouent**

**Fichier : `tests/unit/online/code.test.ts`**
```ts
import { describe, expect, it } from 'vitest';
import { CODE_ALPHABET, inviteLink, normalizeCode } from '../../../src/online/code';

describe('codes de partie', () => {
  it('utilise 32 caractères sans O, 0, I ni 1', () => {
    expect(CODE_ALPHABET).toHaveLength(32);
    expect(CODE_ALPHABET).not.toMatch(/[O0I1]/);
  });

  it('normalise un code tapé à la main', () => {
    expect(normalizeCode('k7m2qx')).toBe('K7M2QX');
    expect(normalizeCode(' K7M 2QX ')).toBe('K7M2QX');
    expect(normalizeCode('K7M-2QX')).toBe('K7M2QX');
  });

  it('refuse un code mal formé', () => {
    expect(normalizeCode('K7M2Q')).toBeNull();
    expect(normalizeCode('K7M2QXA')).toBeNull();
    expect(normalizeCode('K7M2Q0')).toBeNull();
    expect(normalizeCode('')).toBeNull();
  });

  it('fabrique le lien d’invitation', () => {
    expect(inviteLink('https://jeaneveillard.github.io/Jeux-KZO/', 'K7M2QX')).toBe('https://jeaneveillard.github.io/Jeux-KZO/#/rejoindre/K7M2QX');
    expect(inviteLink('http://localhost:5173/#/echecs', 'K7M2QX')).toBe('http://localhost:5173/#/rejoindre/K7M2QX');
  });
});
```

Dans `tests/unit/core/explain.test.ts`, ajouter avant la dernière ligne `});` :
```ts

  it('explique la nulle d’un commun accord pour tous les jeux', () => {
    expect(explainWith(texts, { kind: 'draw', reason: 'agreement' }, 'white')).toEqual({
      title: 'Partie nulle',
      detail: "Les deux joueurs se sont mis d'accord : personne ne gagne.",
    });
  });
```

Dans `tests/unit/app/settings-progress.test.ts`, remplacer :
```ts
import { DEFAULT_SETTINGS, validateSettings } from '../../../src/app/settings';

describe('réglages', () => {
  it('active le son par défaut', () => {
    expect(DEFAULT_SETTINGS).toEqual({ sound: true });
  });

  it('valide les réglages enregistrés', () => {
    expect(validateSettings({ sound: false })).toEqual({ sound: false });
    expect(validateSettings({ sound: 'oui' })).toBeNull();
    expect(validateSettings(null)).toBeNull();
  });
});
```
par :
```ts
import { DEFAULT_SETTINGS, cleanPseudo, validateSettings } from '../../../src/app/settings';

describe('réglages', () => {
  it('active le son par défaut, sans pseudo', () => {
    expect(DEFAULT_SETTINGS).toEqual({ sound: true, pseudo: null });
  });

  it('valide les réglages enregistrés, même anciens (sans pseudo)', () => {
    expect(validateSettings({ sound: false })).toEqual({ sound: false, pseudo: null });
    expect(validateSettings({ sound: true, pseudo: '  Marie ' })).toEqual({ sound: true, pseudo: 'Marie' });
    expect(validateSettings({ sound: true, pseudo: 'x'.repeat(21) })).toEqual({ sound: true, pseudo: null });
    expect(validateSettings({ sound: 'oui' })).toBeNull();
    expect(validateSettings(null)).toBeNull();
  });

  it('nettoie un pseudo', () => {
    expect(cleanPseudo(' Bob ')).toBe('Bob');
    expect(cleanPseudo('   ')).toBeNull();
    expect(cleanPseudo('x'.repeat(20))).toHaveLength(20);
    expect(cleanPseudo(42)).toBeNull();
  });
});
```

Dans `tests/unit/app/menus.test.tsx`, remplacer tout le bloc `describe('réglages', () => { … });` par :
```tsx
describe('réglages', () => {
  it('active ou coupe le son', () => {
    const onChange = vi.fn();
    render(<SettingsScreen settings={{ sound: true, pseudo: null }} onChange={onChange} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sons' }));
    expect(onChange).toHaveBeenCalledWith({ sound: false, pseudo: null });
    expect(screen.getByText(/Stockfish/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Code source sur GitHub' }).getAttribute('href')).toBe('https://github.com/Jeaneveillard/Jeux-KZO');
  });

  it('change le pseudo du jeu en ligne', () => {
    const onChange = vi.fn();
    render(<SettingsScreen settings={{ sound: true, pseudo: 'Ancien' }} onChange={onChange} onBack={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Pseudo pour le jeu en ligne'), { target: { value: '  Marie ' } });
    expect(onChange).toHaveBeenCalledWith({ sound: true, pseudo: 'Marie' });
  });
});
```

- [x] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run tests/unit/online tests/unit/core tests/unit/app/settings-progress.test.ts tests/unit/app/menus.test.tsx`
Expected : FAIL — `src/online/code` introuvable, `cleanPseudo` absent, texte de nulle d'accord et champ pseudo absents.

- [x] **Step 3 : Écrire le code**

**Fichier : `src/online/code.ts`**
```ts
/** Alphabet des codes de partie : sans O/0 ni I/1, pour éviter les confusions à la lecture. */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

/** Code en majuscules, sans espaces ni tirets ; null s'il n'est pas valide. */
export function normalizeCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '');
  return code.length === CODE_LENGTH && [...code].every((char) => CODE_ALPHABET.includes(char)) ? code : null;
}

/** Lien d'invitation ; `base` est l'adresse de l'app (ex. `https://…/Jeux-KZO/`). */
export function inviteLink(base: string, code: string): string {
  return `${base.replace(/#.*$/, '')}#/rejoindre/${code}`;
}
```

Dans `src/core/types.ts`, remplacer :
```ts
  | 'king-moves'
  | 'endgame-limit';
```
par :
```ts
  | 'king-moves'
  | 'endgame-limit'
  | 'agreement';

export const WIN_REASONS: readonly WinReason[] = ['checkmate', 'resign', 'no-moves'];
export const DRAW_REASONS: readonly DrawReason[] = [
  'stalemate',
  'repetition',
  'fifty-moves',
  'insufficient-material',
  'king-moves',
  'endgame-limit',
  'agreement',
];
```
et, dans le commentaire au-dessus de `DrawReason`, ajouter la ligne ` * `agreement` : nulle d'un commun accord (jeu en ligne).` avant ` */`.

Dans `src/core/explain.ts`, remplacer :
```ts
const DEFAULT_DRAW_DETAIL = 'Personne ne gagne.';
```
par :
```ts
const DEFAULT_DRAW_DETAIL = 'Personne ne gagne.';
/** Nulles communes à tous les jeux. */
const COMMON_DRAW_DETAILS: Readonly<Partial<Record<DrawReason, string>>> = {
  agreement: "Les deux joueurs se sont mis d'accord : personne ne gagne.",
};
```
et :
```ts
  if (status.kind === 'draw') return { title: 'Partie nulle', detail: texts.draws[status.reason] ?? DEFAULT_DRAW_DETAIL };
```
par :
```ts
  if (status.kind === 'draw') {
    return { title: 'Partie nulle', detail: texts.draws[status.reason] ?? COMMON_DRAW_DETAILS[status.reason] ?? DEFAULT_DRAW_DETAIL };
  }
```

Dans `src/app/game/session.ts`, remplacer `export type GameMode = 'ai' | 'local';` par :
```ts
/** `online` : partie en ligne (jamais sauvegardée localement, arbitrée par le serveur). */
export type GameMode = 'ai' | 'local' | 'online';
```

**Fichier : `src/app/settings.ts`**
```ts
import { isRecord } from '../core/guards';

export const PSEUDO_MAX_LENGTH = 20;

export interface Settings {
  readonly sound: boolean;
  /** Pseudo du jeu en ligne ; null tant qu'il n'a pas été choisi. */
  readonly pseudo: string | null;
}

export const DEFAULT_SETTINGS: Settings = { sound: true, pseudo: null };

/** Pseudo sans espaces aux bords, ou null s'il est vide, trop long ou absent. */
export function cleanPseudo(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const pseudo = value.trim();
  return pseudo.length >= 1 && pseudo.length <= PSEUDO_MAX_LENGTH ? pseudo : null;
}

export function validateSettings(value: unknown): Settings | null {
  if (!isRecord(value) || typeof value.sound !== 'boolean') return null;
  return { sound: value.sound, pseudo: cleanPseudo(value.pseudo) };
}
```

**Fichier : `src/app/screens/SettingsScreen.tsx`**
```tsx
import { PSEUDO_MAX_LENGTH, cleanPseudo, type Settings } from '../settings';

interface SettingsScreenProps {
  readonly settings: Settings;
  readonly onChange: (settings: Settings) => void;
  readonly onBack: () => void;
}

export const SOURCE_CODE_URL = 'https://github.com/Jeaneveillard/Jeux-KZO';

export function SettingsScreen({ settings, onChange, onBack }: SettingsScreenProps) {
  return (
    <section class="screen">
      <header class="topbar">
        <button type="button" class="back" aria-label="Retour à l'accueil" onClick={onBack}>
          ←
        </button>
        <h1>Réglages</h1>
      </header>
      <label class="card toggle">
        <span>Sons</span>
        <input type="checkbox" checked={settings.sound} onChange={(event) => onChange({ ...settings, sound: event.currentTarget.checked })} />
      </label>
      <label class="card" for="pseudo-reglages">
        <span>Pseudo pour le jeu en ligne</span>
        <input
          id="pseudo-reglages"
          class="text-input"
          type="text"
          maxLength={PSEUDO_MAX_LENGTH}
          value={settings.pseudo ?? ''}
          placeholder="Ton pseudo"
          onChange={(event) => onChange({ ...settings, pseudo: cleanPseudo(event.currentTarget.value) })}
        />
      </label>
      <div class="card">
        <h2>À propos</h2>
        <p class="muted">
          Moteur d'échecs : Stockfish (licence GPL-3.0). Pièces d'échecs : « cburnett » (licence GPLv2+). Moteur de dames : écrit
          pour cette application. Cette application est un logiciel libre sous licence GPL-3.0.
        </p>
        <a href={SOURCE_CODE_URL} target="_blank" rel="noopener noreferrer">
          Code source sur GitHub
        </a>
      </div>
    </section>
  );
}
```

Dans `src/styles/global.css`, après la ligne `.toggle input { width: 24px; height: 24px; }`, ajouter :
```css
.text-input { min-height: 44px; padding: 8px 12px; border-radius: 10px; border: 2px solid var(--border); background: var(--bg); color: var(--text); font-size: 1rem; }
.text-input:focus { outline: none; border-color: var(--primary); }
```

- [x] **Step 4 : Lancer tous les tests et le typage**

Run : `npx vitest run` puis `npx tsc -b`
Expected : PASS, aucune erreur.

- [x] **Step 5 : Commit**

```bash
git add src tests
git commit -m "feat: socle du jeu en ligne (nulle d'accord, pseudo, codes de partie)"
```

---

### Task 2 : Données du jeu en ligne et logique d'affichage

**Files:**
- Create: `src/online/types.ts`, `src/online/errors.ts`, `src/online/rows.ts`, `src/app/online/view.ts`
- Test: `tests/unit/online/fixtures.ts`, `tests/unit/online/rows.test.ts`, `tests/unit/online/errors.test.ts`, `tests/unit/app/online/view.test.ts`

**Interfaces:**
- Consumes: `isOneOf`, `isRecord`, `GAME_IDS`, `WIN_REASONS`, `DRAW_REASONS`, `normalizeCode` (Tâche 1) ; `createSession`, `applyMove`, `currentPosition`, `Session` ; `chessKit`, `draughtsKit` (tests).
- Produces :
  - `types.ts` : `OnlineStatus = 'attente' | 'en_cours' | 'terminee'`, `OnlineSeat { id: string | null; pseudo: string | null }`, `OnlineGame { id; code; game; start; moves; white; black; status; result; drawOfferedBy; rematchCode; updatedAt }`.
  - `errors.ts` : `SERVER_ERROR_CODES`, `ServerErrorCode`, `OnlineErrorCode`, `class OnlineError { code }` avec `OnlineError.fromServer(message)`, `onlineErrorMessage(error)`, `isOnlineError(error, code)`.
  - `rows.ts` : `parseResult(value): GameStatus | null`, `parseGameRow(value): OnlineGame | null`.
  - `view.ts` : `OnlineRules<Pos, Move> { adapter; codec }`, `OnlineView<Pos, Move> { session; invalidMove; myColor; myTurn; opponentName; opponentId; result }`, `colorOf(game, userId)`, `turnOf(game)`, `buildOnlineView(rules, game, userId)`, `resultAfter(rules, pos, move)`, `StatusContext { connected; opponentOnline }`, `onlineStatusText(game, view, context)`, `ListEntry { game; label; detail }`, `listEntries(games, userId)`.

Le trait se déduit du nombre de coups (les deux jeux commencent par les Blancs) : `turnOf` sert à trier la liste sans rejouer les parties. `buildOnlineView` rejoue les coups reçus avec les règles du jeu ; un coup illégal arrête la reconstruction et marque la partie `invalidMove`.

- [x] **Step 1 : Écrire les aides de test et les tests qui échouent**

**Fichier : `tests/unit/online/fixtures.ts`**
```ts
import type { OnlineGame } from '../../../src/online/types';

/** Ligne `parties` telle que le serveur la renvoie (colonnes en snake_case). */
export function row(overrides: Readonly<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    code: 'K7M2QX',
    jeu: 'chess',
    depart: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    coups: [],
    blancs: 'moi',
    noirs: 'ami',
    pseudo_blancs: 'Alice',
    pseudo_noirs: 'Bob',
    statut: 'en_cours',
    resultat: null,
    nulle_proposee_par: null,
    revanche_code: null,
    cree_le: '2026-09-26T10:00:00Z',
    maj_le: '2026-09-26T10:00:00Z',
    ...overrides,
  };
}

/** Partie en ligne vérifiée, pour les tests qui n'ont pas besoin de la ligne brute. */
export function onlineGame(overrides: Partial<OnlineGame> = {}): OnlineGame {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    code: 'K7M2QX',
    game: 'chess',
    start: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves: [],
    white: { id: 'moi', pseudo: 'Alice' },
    black: { id: 'ami', pseudo: 'Bob' },
    status: 'en_cours',
    result: null,
    drawOfferedBy: null,
    rematchCode: null,
    updatedAt: '2026-09-26T10:00:00Z',
    ...overrides,
  };
}
```

**Fichier : `tests/unit/online/rows.test.ts`**
```ts
import { describe, expect, it } from 'vitest';
import { parseGameRow, parseResult } from '../../../src/online/rows';
import { onlineGame, row } from './fixtures';

describe('lignes reçues du serveur', () => {
  it('traduit une ligne valide', () => {
    expect(parseGameRow(row({ coups: ['e2e4'] }))).toEqual(onlineGame({ moves: ['e2e4'] }));
  });

  it('accepte une partie en attente et une partie terminée', () => {
    expect(parseGameRow(row({ noirs: null, pseudo_noirs: null, statut: 'attente' }))?.black).toEqual({ id: null, pseudo: null });
    const finished = parseGameRow(row({ statut: 'terminee', resultat: { kind: 'draw', reason: 'agreement' }, revanche_code: 'ABCDEF' }));
    expect(finished?.result).toEqual({ kind: 'draw', reason: 'agreement' });
    expect(finished?.rematchCode).toBe('ABCDEF');
    expect(parseGameRow(row({ nulle_proposee_par: 'black' }))?.drawOfferedBy).toBe('black');
  });

  it.each([
    ['pas un objet', 'x'],
    ['code invalide', row({ code: 'k7m2qx' })],
    ['jeu inconnu', row({ jeu: 'go' })],
    ['coups mal formés', row({ coups: [1] })],
    ['statut inconnu', row({ statut: 'fini' })],
    ['résultat inventé', row({ statut: 'terminee', resultat: { kind: 'win', winner: 'rouge', reason: 'resign' } })],
    ['partie terminée sans résultat', row({ statut: 'terminee' })],
    ['nulle proposée par un inconnu', row({ nulle_proposee_par: 'rouge' })],
    ['joueur mal formé', row({ blancs: 42 })],
  ])('refuse une ligne : %s', (_, value) => {
    expect(parseGameRow(value)).toBeNull();
  });

  it('lit les résultats', () => {
    expect(parseResult({ kind: 'win', winner: 'white', reason: 'resign' })).toEqual({ kind: 'win', winner: 'white', reason: 'resign' });
    expect(parseResult({ kind: 'draw', reason: 'king-moves' })).toEqual({ kind: 'draw', reason: 'king-moves' });
    expect(parseResult({ kind: 'draw', reason: 'pluie' })).toBeNull();
    expect(parseResult(null)).toBeNull();
  });
});
```

**Fichier : `tests/unit/online/errors.test.ts`**
```ts
import { describe, expect, it } from 'vitest';
import { OnlineError, isOnlineError, onlineErrorMessage } from '../../../src/online/errors';

describe('erreurs du jeu en ligne', () => {
  it('traduit les codes du serveur en messages', () => {
    const error = OnlineError.fromServer('code_inconnu');
    expect(error.code).toBe('code_inconnu');
    expect(error.message).toBe('Ce code ne correspond à aucune partie.');
    expect(isOnlineError(error, 'code_inconnu')).toBe(true);
    expect(isOnlineError(error, 'conflit')).toBe(false);
  });

  it('considère tout autre message comme une panne', () => {
    expect(OnlineError.fromServer('TypeError: Failed to fetch').code).toBe('indisponible');
    expect(OnlineError.fromServer(undefined).message).toBe('Le jeu en ligne est momentanément indisponible.');
  });

  it('donne un message pour n’importe quelle erreur', () => {
    expect(onlineErrorMessage(new OnlineError('conflit'))).toBe('La partie a changé : rejoue ton coup.');
    expect(onlineErrorMessage(new Error('boum'))).toBe('Le jeu en ligne est momentanément indisponible.');
  });
});
```

**Fichier : `tests/unit/app/online/view.test.ts`**
```ts
import { describe, expect, it } from 'vitest';
import { chessKit } from '../../../../src/app/games/chess';
import { draughtsKit } from '../../../../src/app/games/draughts';
import { buildOnlineView, colorOf, listEntries, onlineStatusText, resultAfter, turnOf } from '../../../../src/app/online/view';
import { parseChess } from '../../../../src/chess/adapter';
import { onlineGame } from '../../online/fixtures';

const online = { connected: true, opponentOnline: true };

describe('vue d’une partie en ligne', () => {
  it('rejoue les coups et sait à qui est le tour', () => {
    const view = buildOnlineView(chessKit, onlineGame({ moves: ['e2e4'] }), 'ami');
    expect(view.myColor).toBe('black');
    expect(view.myTurn).toBe(true);
    expect(view.session.moves).toEqual([{ from: 'e2', to: 'e4' }]);
    expect(view.opponentName).toBe('Alice');
    expect(view.opponentId).toBe('moi');
    expect(buildOnlineView(chessKit, onlineGame({ moves: ['e2e4'] }), 'moi').myTurn).toBe(false);
  });

  it('marque un coup reçu illégal', () => {
    const view = buildOnlineView(chessKit, onlineGame({ moves: ['e2e4', 'e7e4'] }), 'moi');
    expect(view.invalidMove).toBe(true);
    expect(view.myTurn).toBe(false);
    expect(view.session.moves).toHaveLength(1);
    expect(onlineStatusText(onlineGame(), view, online)).toBe('Coup invalide reçu : la partie ne peut pas continuer.');
  });

  it('rejoue aussi les dames', () => {
    const view = buildOnlineView(draughtsKit, onlineGame({ game: 'draughts', start: 'W:W31-50:B1-20', moves: ['32-28'] }), 'ami');
    expect(view.myTurn).toBe(true);
    expect(view.session.moves[0]).toMatchObject({ from: '32', to: '28' });
  });

  it('prend le résultat officiel d’une partie terminée', () => {
    const resigned = onlineGame({ status: 'terminee', result: { kind: 'win', winner: 'black', reason: 'resign' } });
    expect(buildOnlineView(chessKit, resigned, 'moi').result).toEqual({ kind: 'win', winner: 'black', reason: 'resign' });
    expect(buildOnlineView(chessKit, onlineGame(), 'moi').result).toEqual({ kind: 'ongoing' });
  });

  it('calcule le résultat à envoyer avec un coup', () => {
    const pos = parseChess('rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2');
    expect(resultAfter(chessKit, pos, { from: 'd8', to: 'h4' })).toEqual({ kind: 'win', winner: 'black', reason: 'checkmate' });
    expect(resultAfter(chessKit, chessKit.adapter.initial(), { from: 'e2', to: 'e4' })).toBeNull();
  });

  it('décrit la situation en une phrase', () => {
    const game = onlineGame({ moves: ['e2e4'] });
    const mine = buildOnlineView(chessKit, game, 'ami');
    const theirs = buildOnlineView(chessKit, game, 'moi');
    expect(onlineStatusText(game, mine, online)).toBe('À toi de jouer');
    expect(onlineStatusText(game, theirs, online)).toBe("C'est à Bob de jouer");
    expect(onlineStatusText(game, theirs, { connected: true, opponentOnline: false })).toBe("C'est à Bob de jouer (hors ligne pour l'instant)");
    expect(onlineStatusText(game, theirs, { connected: false, opponentOnline: true })).toBe('Connexion perdue, reconnexion…');
    expect(onlineStatusText(onlineGame({ status: 'attente' }), theirs, online)).toBe('En attente de ton ami…');
  });

  it('trie « Mes parties en ligne »', () => {
    const waiting = onlineGame({ code: 'AAAAAA', status: 'attente', black: { id: null, pseudo: null } });
    const myTurn = onlineGame({ code: 'BBBBBB', moves: [] });
    const theirTurn = onlineGame({ code: 'CCCCCC', moves: ['e2e4'] });
    const finished = onlineGame({ code: 'DDDDDD', status: 'terminee', result: { kind: 'draw', reason: 'agreement' } });
    const entries = listEntries([finished, waiting, theirTurn, myTurn], 'moi');
    expect(entries.map((entry) => entry.game.code)).toEqual(['BBBBBB', 'CCCCCC', 'AAAAAA', 'DDDDDD']);
    expect(entries.map((entry) => entry.detail)).toEqual(['À toi de jouer', "C'est à Bob de jouer", 'En attente de ton ami', 'Partie terminée']);
    expect(entries[0].label).toBe('Contre Bob');
    expect(entries[2].label).toBe('Partie AAAAAA');
  });

  it('déduit couleur et trait', () => {
    expect(colorOf(onlineGame(), 'moi')).toBe('white');
    expect(colorOf(onlineGame(), 'intrus')).toBeNull();
    expect(turnOf(onlineGame({ moves: ['e2e4'] }))).toBe('black');
  });
});
```

- [x] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run tests/unit/online tests/unit/app/online`
Expected : FAIL — modules `rows`, `errors`, `view` introuvables.

- [x] **Step 3 : Écrire les types, erreurs et lignes**

**Fichier : `src/online/types.ts`**
```ts
import type { Color, GameId, GameStatus } from '../core/types';

export type OnlineStatus = 'attente' | 'en_cours' | 'terminee';

export interface OnlineSeat {
  readonly id: string | null;
  readonly pseudo: string | null;
}

/** Partie en ligne telle que la connaît le serveur, déjà vérifiée par `parseGameRow`. */
export interface OnlineGame {
  readonly id: string;
  readonly code: string;
  readonly game: GameId;
  /** Position de départ (FEN du jeu). */
  readonly start: string;
  /** Coups encodés comme les sauvegardes locales (`e2e4`, `32-28`, `28x19x10`). */
  readonly moves: readonly string[];
  readonly white: OnlineSeat;
  readonly black: OnlineSeat;
  readonly status: OnlineStatus;
  readonly result: GameStatus | null;
  readonly drawOfferedBy: Color | null;
  readonly rematchCode: string | null;
  readonly updatedAt: string;
}
```

**Fichier : `src/online/errors.ts`**
```ts
import { isOneOf } from '../core/guards';

/** Messages d'erreur levés par les fonctions du serveur (migration `parties`). */
export const SERVER_ERROR_CODES = [
  'non_connecte',
  'entree_invalide',
  'trop_de_parties',
  'code_inconnu',
  'partie_complete',
  'partie_introuvable',
  'adversaire_absent',
  'partie_terminee',
  'conflit',
  'pas_ton_tour',
  'coup_invalide',
  'resultat_invalide',
  'pas_de_proposition',
  'partie_commencee',
  'partie_en_cours',
] as const;

export type ServerErrorCode = (typeof SERVER_ERROR_CODES)[number];
export type OnlineErrorCode = ServerErrorCode | 'non_configure' | 'indisponible' | 'reponse_invalide' | 'hors_ligne';

const MESSAGES: Readonly<Record<OnlineErrorCode, string>> = {
  non_connecte: 'La connexion au jeu en ligne a échoué. Réessaie dans un instant.',
  entree_invalide: 'Le pseudo doit faire de 1 à 20 caractères.',
  trop_de_parties: "Tu as déjà 20 parties en cours : termines-en ou annules-en une avant d'en créer une autre.",
  code_inconnu: 'Ce code ne correspond à aucune partie.',
  partie_complete: 'Cette partie a déjà ses deux joueurs.',
  partie_introuvable: "Cette partie n'existe plus, ou ce n'est pas la tienne.",
  adversaire_absent: "Ton ami n'a pas encore rejoint la partie.",
  partie_terminee: 'La partie est terminée.',
  conflit: 'La partie a changé : rejoue ton coup.',
  pas_ton_tour: "Ce n'est pas ton tour.",
  coup_invalide: 'Le serveur a refusé ce coup.',
  resultat_invalide: 'Le serveur a refusé le résultat de la partie.',
  pas_de_proposition: "Il n'y a plus de nulle à accepter.",
  partie_commencee: 'Ton ami a déjà rejoint la partie : elle ne peut plus être annulée.',
  partie_en_cours: "La revanche n'est possible qu'à la fin de la partie.",
  non_configure: "Le jeu en ligne n'est pas disponible dans cette version de l'app.",
  indisponible: 'Le jeu en ligne est momentanément indisponible.',
  reponse_invalide: 'Le serveur a envoyé une réponse inattendue.',
  hors_ligne: "Pas de connexion internet : le jeu en ligne a besoin du réseau.",
};

export class OnlineError extends Error {
  readonly code: OnlineErrorCode;

  constructor(code: OnlineErrorCode, cause?: unknown) {
    super(MESSAGES[code], { cause });
    this.name = 'OnlineError';
    this.code = code;
  }

  /** Erreur du serveur : son message est un code connu, sinon le serveur est injoignable ou en panne. */
  static fromServer(message: string | undefined): OnlineError {
    return new OnlineError(isOneOf(message, SERVER_ERROR_CODES) ? message : 'indisponible', message);
  }
}

export function onlineErrorMessage(error: unknown): string {
  return error instanceof OnlineError ? error.message : MESSAGES.indisponible;
}

export function isOnlineError(error: unknown, code: OnlineErrorCode): boolean {
  return error instanceof OnlineError && error.code === code;
}
```

**Fichier : `src/online/rows.ts`**
```ts
import { isOneOf, isRecord } from '../core/guards';
import { DRAW_REASONS, GAME_IDS, WIN_REASONS, type GameStatus } from '../core/types';
import { normalizeCode } from './code';
import type { OnlineGame, OnlineSeat } from './types';

const COLORS = ['white', 'black'] as const;
const STATUSES = ['attente', 'en_cours', 'terminee'] as const;

/** Texte, null, ou undefined si la valeur n'est ni l'un ni l'autre. */
function optionalText(value: unknown): string | null | undefined {
  if (value === null) return null;
  return typeof value === 'string' ? value : undefined;
}

function seat(player: unknown, pseudo: unknown): OnlineSeat | null {
  const id = optionalText(player);
  const name = optionalText(pseudo);
  return id === undefined || name === undefined ? null : { id, pseudo: name };
}

export function parseResult(value: unknown): GameStatus | null {
  if (!isRecord(value)) return null;
  if (value.kind === 'win' && isOneOf(value.winner, COLORS) && isOneOf(value.reason, WIN_REASONS)) {
    return { kind: 'win', winner: value.winner, reason: value.reason };
  }
  if (value.kind === 'draw' && isOneOf(value.reason, DRAW_REASONS)) return { kind: 'draw', reason: value.reason };
  return null;
}

/** Ligne `parties` reçue du serveur → partie vérifiée, ou null si elle est mal formée. */
export function parseGameRow(value: unknown): OnlineGame | null {
  if (!isRecord(value)) return null;
  const { id, code, jeu, depart, coups, statut, resultat, nulle_proposee_par: drawOffer, revanche_code: rematch, maj_le: updatedAt } = value;
  if (typeof id !== 'string' || typeof code !== 'string' || normalizeCode(code) !== code) return null;
  if (!isOneOf(jeu, GAME_IDS) || typeof depart !== 'string' || !isOneOf(statut, STATUSES) || typeof updatedAt !== 'string') return null;
  if (!Array.isArray(coups)) return null;
  const moves: unknown[] = coups;
  if (!moves.every((move): move is string => typeof move === 'string')) return null;
  const white = seat(value.blancs, value.pseudo_blancs);
  const black = seat(value.noirs, value.pseudo_noirs);
  const drawOfferedBy = drawOffer === null ? null : isOneOf(drawOffer, COLORS) ? drawOffer : undefined;
  const rematchCode = optionalText(rematch);
  const result = resultat === null ? null : parseResult(resultat);
  if (!white || !black || drawOfferedBy === undefined || rematchCode === undefined) return null;
  if ((resultat !== null && result === null) || (statut === 'terminee' && result === null)) return null;
  return { id, code, game: jeu, start: depart, moves: [...moves], white, black, status: statut, result, drawOfferedBy, rematchCode, updatedAt };
}
```

- [x] **Step 4 : Écrire la logique d'affichage**

**Fichier : `src/app/online/view.ts`**
```ts
import type { Color, GameAdapter, GameStatus } from '../../core/types';
import type { OnlineGame } from '../../online/types';
import { applyMove, createSession, currentPosition, type Session } from '../game/session';

/** Ce qu'il faut d'un jeu pour rejouer une partie en ligne (un `GameKit` convient). */
export interface OnlineRules<Pos, Move> {
  readonly adapter: GameAdapter<Pos, Move>;
  readonly codec: { encode(move: Move): string; decode(text: string, pos: Pos): Move };
}

export interface OnlineView<Pos, Move> {
  readonly session: Session<Pos, Move>;
  /** Un coup reçu est illégal selon nos règles : la partie ne peut pas continuer. */
  readonly invalidMove: boolean;
  /** Ma couleur, ou null si je ne joue pas cette partie. */
  readonly myColor: Color | null;
  readonly myTurn: boolean;
  readonly opponentName: string;
  readonly opponentId: string | null;
  /** Résultat officiel (serveur) d'une partie terminée, sinon celui des règles. */
  readonly result: GameStatus;
}

export function colorOf(game: OnlineGame, userId: string): Color | null {
  if (game.white.id === userId) return 'white';
  if (game.black.id === userId) return 'black';
  return null;
}

/** Les deux jeux commencent par les Blancs : le trait se déduit du nombre de coups. */
export function turnOf(game: OnlineGame): Color {
  return game.moves.length % 2 === 0 ? 'white' : 'black';
}

function opponentName(game: OnlineGame, myColor: Color | null): string {
  return (myColor === 'black' ? game.white : game.black).pseudo ?? 'ton ami';
}

export function buildOnlineView<Pos, Move>(rules: OnlineRules<Pos, Move>, game: OnlineGame, userId: string): OnlineView<Pos, Move> {
  const myColor = colorOf(game, userId);
  const setup = { game: game.game, mode: 'online', level: null, playerColor: myColor ?? 'white' } as const;
  let session = createSession(rules.adapter, setup, rules.adapter.parse(game.start));
  let invalidMove = false;
  for (const text of game.moves) {
    try {
      session = applyMove(rules.adapter, session, rules.codec.decode(text, currentPosition(session)));
    } catch {
      invalidMove = true;
      break;
    }
  }
  const myTurn = game.status === 'en_cours' && !invalidMove && myColor !== null && rules.adapter.turn(currentPosition(session)) === myColor;
  return {
    session,
    invalidMove,
    myColor,
    myTurn,
    opponentName: opponentName(game, myColor),
    opponentId: (myColor === 'black' ? game.white : game.black).id,
    result: game.status === 'terminee' && game.result ? game.result : session.result,
  };
}

/** Résultat à envoyer avec un coup : null si la partie continue. */
export function resultAfter<Pos, Move>(rules: OnlineRules<Pos, Move>, pos: Pos, move: Move): GameStatus | null {
  const status = rules.adapter.status(rules.adapter.play(pos, move));
  return status.kind === 'ongoing' ? null : status;
}

export interface StatusContext {
  readonly connected: boolean;
  readonly opponentOnline: boolean;
}

export function onlineStatusText<Pos, Move>(game: OnlineGame, view: OnlineView<Pos, Move>, context: StatusContext): string {
  if (!context.connected) return 'Connexion perdue, reconnexion…';
  if (view.invalidMove) return 'Coup invalide reçu : la partie ne peut pas continuer.';
  if (game.status === 'attente') return 'En attente de ton ami…';
  if (game.status === 'terminee') return 'Partie terminée';
  if (view.myTurn) return 'À toi de jouer';
  return context.opponentOnline ? `C'est à ${view.opponentName} de jouer` : `C'est à ${view.opponentName} de jouer (hors ligne pour l'instant)`;
}

export interface ListEntry {
  readonly game: OnlineGame;
  readonly label: string;
  readonly detail: string;
}

/** « Mes parties en ligne » : à mon tour, puis au tour de l'ami, puis en attente, puis terminées ; les plus récentes d'abord. */
export function listEntries(games: readonly OnlineGame[], userId: string): ListEntry[] {
  const rank = (game: OnlineGame): number => {
    if (game.status === 'en_cours') return turnOf(game) === colorOf(game, userId) ? 0 : 1;
    return game.status === 'attente' ? 2 : 3;
  };
  const describe = (game: OnlineGame): ListEntry => {
    const opponent = opponentName(game, colorOf(game, userId));
    const details = ['À toi de jouer', `C'est à ${opponent} de jouer`, 'En attente de ton ami', 'Partie terminée'];
    return { game, label: game.status === 'attente' ? `Partie ${game.code}` : `Contre ${opponent}`, detail: details[rank(game)] };
  };
  return [...games].sort((a, b) => rank(a) - rank(b) || b.updatedAt.localeCompare(a.updatedAt)).map(describe);
}
```

- [x] **Step 5 : Lancer les tests**

Run : `npx vitest run tests/unit/online tests/unit/app/online` puis `npx tsc -b`
Expected : PASS (4 + 14 + 3 + 8 tests), aucune erreur.

- [x] **Step 6 : Commit**

```bash
git add src/online src/app/online tests/unit/online tests/unit/app/online
git commit -m "feat: données du jeu en ligne (lignes vérifiées, erreurs, vue d'une partie)"
```

---

### Task 3 : Accès au serveur (API, Backend Supabase, chargement à la demande)

**Files:**
- Create: `src/online/backend.ts`, `src/online/api.ts`, `src/online/config.ts`, `src/online/client.ts`, `src/online/index.ts`
- Modify: `package.json` (dépendance), `vite.config.ts` (exclusions de couverture)
- Test: `tests/unit/online/api.test.ts`, `tests/unit/online/config.test.ts`

**Interfaces:**
- Consumes: `parseGameRow`, `OnlineError`, `OnlineGame` (Tâche 2).
- Produces :
  - `backend.ts` : `WatchHandlers { onChange(); onPresence(userIds); onConnection(connected) }`, `Backend { userId(); rpc(fn, args); listGames(game); findGame(code); watch(gameId, userId, handlers): () => void }`.
  - `api.ts` : `OnlineApi { userId; createGame(game, color, pseudo); joinGame(code, pseudo); playMove(game, move, result); offerDraw(id); answerDraw(id, accept); resign(id); cancel(id); rematch(id); findGame(code); listGames(game); watch(…) }`, `createOnlineApi(backend)`.
  - `config.ts` : `OnlineConfig { url; key }`, `readConfig(env): OnlineConfig | null`.
  - `client.ts` : `createSupabaseBackend(config): Backend` (session anonyme gardée sous la clé `jeux.en-ligne.session`).
  - `index.ts` : `getOnlineApi(): Promise<OnlineApi>` (erreur `non_configure` sans configuration ; Supabase importé dynamiquement).

`playMove` envoie `p_numero = game.moves.length` : `game` doit être la **dernière partie confirmée par le serveur**, jamais une copie optimiste.

- [x] **Step 1 : Installer Supabase**

Run : `npm install @supabase/supabase-js@^2.117.2`
Expected : dépendance ajoutée à `package.json`, aucune vulnérabilité haute.

- [x] **Step 2 : Écrire les tests qui échouent**

**Fichier : `tests/unit/online/api.test.ts`**
```ts
import { describe, expect, it, vi } from 'vitest';
import { createOnlineApi } from '../../../src/online/api';
import type { Backend } from '../../../src/online/backend';
import { OnlineError } from '../../../src/online/errors';
import { onlineGame, row } from './fixtures';

function fakeBackend(rpcResult: unknown = row()) {
  const backend: Backend = {
    userId: vi.fn(async () => 'moi'),
    rpc: vi.fn(async () => rpcResult),
    listGames: vi.fn(async () => [row(), row({ code: 'ABCDEF' })]),
    findGame: vi.fn(async (code: string) => (code === 'K7M2QX' ? row() : null)),
    watch: vi.fn(() => () => undefined),
  };
  return backend;
}

describe('API du jeu en ligne', () => {
  it('appelle les fonctions du serveur avec les bons paramètres', async () => {
    const backend = fakeBackend();
    const api = createOnlineApi(backend);
    await api.createGame('draughts', 'black', 'Alice');
    await api.joinGame('K7M2QX', 'Bob');
    await api.playMove(onlineGame({ moves: ['e2e4'] }), 'e7e5', null);
    await api.offerDraw('p1');
    await api.answerDraw('p1', true);
    await api.resign('p1');
    await api.cancel('p1');
    await api.rematch('p1');
    expect(vi.mocked(backend.rpc).mock.calls).toEqual([
      ['creer_partie', { p_jeu: 'draughts', p_couleur: 'black', p_pseudo: 'Alice' }],
      ['rejoindre_partie', { p_code: 'K7M2QX', p_pseudo: 'Bob' }],
      ['jouer_coup', { p_partie: '11111111-1111-4111-8111-111111111111', p_numero: 1, p_coup: 'e7e5', p_resultat: null }],
      ['proposer_nulle', { p_partie: 'p1' }],
      ['repondre_nulle', { p_partie: 'p1', p_accepte: true }],
      ['abandonner', { p_partie: 'p1' }],
      ['annuler_partie', { p_partie: 'p1' }],
      ['lancer_revanche', { p_partie: 'p1' }],
    ]);
  });

  it('vérifie les réponses du serveur', async () => {
    await expect(createOnlineApi(fakeBackend(row())).resign('p1')).resolves.toEqual(onlineGame());
    await expect(createOnlineApi(fakeBackend({ n: 1 })).resign('p1')).rejects.toThrow(OnlineError);
    await expect(createOnlineApi(fakeBackend({ n: 1 })).resign('p1')).rejects.toMatchObject({ code: 'reponse_invalide' });
  });

  it('relit une partie, liste les parties et suit les changements', async () => {
    const backend = fakeBackend();
    const api = createOnlineApi(backend);
    expect(await api.findGame('K7M2QX')).toEqual(onlineGame());
    expect(await api.findGame('ZZZZZZ')).toBeNull();
    expect((await api.listGames('chess')).map((game) => game.code)).toEqual(['K7M2QX', 'ABCDEF']);
    expect(await api.userId()).toBe('moi');
    const handlers = { onChange: vi.fn(), onPresence: vi.fn(), onConnection: vi.fn() };
    api.watch('p1', 'moi', handlers);
    expect(backend.watch).toHaveBeenCalledWith('p1', 'moi', handlers);
  });
});
```

**Fichier : `tests/unit/online/config.test.ts`**
```ts
import { describe, expect, it } from 'vitest';
import { readConfig } from '../../../src/online/config';

describe('configuration du jeu en ligne', () => {
  it('lit l’adresse et la clé publique du projet', () => {
    expect(readConfig({ VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x' })).toEqual({
      url: 'https://abc.supabase.co',
      key: 'sb_publishable_x',
    });
  });

  it('refuse une configuration absente ou douteuse', () => {
    expect(readConfig({})).toBeNull();
    expect(readConfig({ VITE_SUPABASE_URL: 'http://abc.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'k' })).toBeNull();
    expect(readConfig({ VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: '' })).toBeNull();
  });
});
```

- [x] **Step 3 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run tests/unit/online/api.test.ts tests/unit/online/config.test.ts`
Expected : FAIL — modules `api` et `config` introuvables.

- [x] **Step 4 : Écrire l'interface du serveur, l'API et la configuration**

**Fichier : `src/online/backend.ts`**
```ts
import type { GameId } from '../core/types';

export interface WatchHandlers {
  /** La partie a changé sur le serveur : il faut la relire. */
  onChange(): void;
  /** Identifiants des joueurs présents sur la partie. */
  onPresence(userIds: readonly string[]): void;
  /** État de la connexion temps réel. */
  onConnection(connected: boolean): void;
}

/** Accès brut au serveur : Supabase en vrai, faux serveur dans les tests. Les erreurs levées sont des `OnlineError`. */
export interface Backend {
  userId(): Promise<string>;
  rpc(fn: string, args: Readonly<Record<string, unknown>>): Promise<unknown>;
  listGames(game: GameId): Promise<readonly unknown[]>;
  findGame(code: string): Promise<unknown>;
  /** Suit une partie ; renvoie la fonction qui arrête le suivi. */
  watch(gameId: string, userId: string, handlers: WatchHandlers): () => void;
}
```

**Fichier : `src/online/api.ts`**
```ts
import type { Color, GameId, GameStatus } from '../core/types';
import type { Backend, WatchHandlers } from './backend';
import { OnlineError } from './errors';
import { parseGameRow } from './rows';
import type { OnlineGame } from './types';

export interface OnlineApi {
  userId(): Promise<string>;
  createGame(game: GameId, color: Color, pseudo: string): Promise<OnlineGame>;
  joinGame(code: string, pseudo: string): Promise<OnlineGame>;
  /** `game` : dernière partie confirmée par le serveur (son nombre de coups sert de numéro attendu). */
  playMove(game: OnlineGame, move: string, result: GameStatus | null): Promise<OnlineGame>;
  offerDraw(gameId: string): Promise<OnlineGame>;
  answerDraw(gameId: string, accept: boolean): Promise<OnlineGame>;
  resign(gameId: string): Promise<OnlineGame>;
  cancel(gameId: string): Promise<void>;
  rematch(gameId: string): Promise<OnlineGame>;
  findGame(code: string): Promise<OnlineGame | null>;
  listGames(game: GameId): Promise<OnlineGame[]>;
  watch(gameId: string, userId: string, handlers: WatchHandlers): () => void;
}

function toGame(value: unknown): OnlineGame {
  const game = parseGameRow(value);
  if (!game) throw new OnlineError('reponse_invalide');
  return game;
}

export function createOnlineApi(backend: Backend): OnlineApi {
  const call = async (fn: string, args: Readonly<Record<string, unknown>>) => toGame(await backend.rpc(fn, args));
  return {
    userId: () => backend.userId(),
    createGame: (game, color, pseudo) => call('creer_partie', { p_jeu: game, p_couleur: color, p_pseudo: pseudo }),
    joinGame: (code, pseudo) => call('rejoindre_partie', { p_code: code, p_pseudo: pseudo }),
    playMove: (game, move, result) => call('jouer_coup', { p_partie: game.id, p_numero: game.moves.length, p_coup: move, p_resultat: result }),
    offerDraw: (gameId) => call('proposer_nulle', { p_partie: gameId }),
    answerDraw: (gameId, accept) => call('repondre_nulle', { p_partie: gameId, p_accepte: accept }),
    resign: (gameId) => call('abandonner', { p_partie: gameId }),
    cancel: async (gameId) => {
      await backend.rpc('annuler_partie', { p_partie: gameId });
    },
    rematch: (gameId) => call('lancer_revanche', { p_partie: gameId }),
    findGame: async (code) => {
      const value = await backend.findGame(code);
      return value === null || value === undefined ? null : toGame(value);
    },
    listGames: async (game) => (await backend.listGames(game)).map(toGame),
    watch: (gameId, userId, handlers) => backend.watch(gameId, userId, handlers),
  };
}
```

**Fichier : `src/online/config.ts`**
```ts
export interface OnlineConfig {
  readonly url: string;
  readonly key: string;
}

/** Adresse et clé publique du projet Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). */
export function readConfig(env: Readonly<Record<string, unknown>>): OnlineConfig | null {
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (typeof url !== 'string' || !url.startsWith('https://') || typeof key !== 'string' || key.length === 0) return null;
  return { url, key };
}
```

- [x] **Step 5 : Écrire le client Supabase et le chargement à la demande**

**Fichier : `src/online/client.ts`**
```ts
import { createClient } from '@supabase/supabase-js';
import type { GameId } from '../core/types';
import type { Backend } from './backend';
import type { OnlineConfig } from './config';
import { OnlineError } from './errors';

const LIST_LIMIT = 50;

/** Serveur Supabase : session anonyme gardée sur le téléphone, fonctions `rpc`, lecture protégée par les règles d'accès. */
export function createSupabaseBackend(config: OnlineConfig): Backend {
  const supabase = createClient(config.url, config.key, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'jeux.en-ligne.session' },
  });
  let user: Promise<string> | null = null;

  const userId = (): Promise<string> => {
    user ??= (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) return data.session.user.id;
      const signed = await supabase.auth.signInAnonymously();
      if (signed.error || !signed.data.user) throw new OnlineError('non_connecte', signed.error);
      return signed.data.user.id;
    })().catch((error: unknown) => {
      user = null;
      throw error instanceof OnlineError ? error : OnlineError.fromServer(undefined);
    });
    return user;
  };

  /** Exécute une requête ; toute panne réseau devient une `OnlineError`. */
  const run = async <T>(request: () => PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> => {
    await userId();
    let response: { data: T; error: { message: string } | null };
    try {
      response = await request();
    } catch (error) {
      throw new OnlineError('indisponible', error);
    }
    if (response.error) throw OnlineError.fromServer(response.error.message);
    return response.data;
  };

  return {
    userId,
    rpc: (fn, args) => run(() => supabase.rpc(fn, args)),
    listGames: async (game: GameId) =>
      (await run(() => supabase.from('parties').select('*').eq('jeu', game).order('maj_le', { ascending: false }).limit(LIST_LIMIT))) ?? [],
    findGame: (code) => run(() => supabase.from('parties').select('*').eq('code', code).maybeSingle()),
    watch: (gameId, me, handlers) => {
      // Un seul canal privé : changements de la ligne (règles d'accès de la table) et présence (règles sur realtime.messages).
      const channel = supabase.channel(`partie:${gameId}`, { config: { private: true, presence: { key: me } } });
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'parties', filter: `id=eq.${gameId}` }, () => handlers.onChange())
        .on('presence', { event: 'sync' }, () => handlers.onPresence(Object.keys(channel.presenceState())));
      let stopped = false;
      void supabase.realtime.setAuth().then(() => {
        if (stopped) return;
        channel.subscribe(async (status) => {
          if (stopped) return;
          handlers.onConnection(status === 'SUBSCRIBED');
          if (status === 'SUBSCRIBED') await channel.track({ enLigne: true });
        });
      });
      return () => {
        stopped = true;
        void supabase.removeChannel(channel);
      };
    },
  };
}
```

**Fichier : `src/online/index.ts`**
```ts
import { createOnlineApi, type OnlineApi } from './api';
import { readConfig } from './config';
import { OnlineError } from './errors';

let api: Promise<OnlineApi> | null = null;

/** Client du jeu en ligne, créé à la première demande : la bibliothèque Supabase n'est téléchargée qu'à ce moment. */
export function getOnlineApi(): Promise<OnlineApi> {
  api ??= (async () => {
    const config = readConfig(import.meta.env);
    if (!config) throw new OnlineError('non_configure');
    const { createSupabaseBackend } = await import('./client');
    return createOnlineApi(createSupabaseBackend(config));
  })().catch((error: unknown) => {
    api = null;
    throw error;
  });
  return api;
}
```

Dans `vite.config.ts`, dans `coverage.exclude`, ajouter après `'src/draughts/engine/index.ts',` :
```ts
        'src/online/client.ts',
        'src/online/index.ts',
```

- [x] **Step 6 : Lancer les tests, le typage et le build**

Run : `npx vitest run tests/unit/online` puis `npx tsc -b` puis `npm run build`
Expected : PASS (dont 3 + 2 nouveaux tests), aucune erreur ; le build produit un morceau séparé pour Supabase (`ls dist/assets` montre un fichier `client-*.js` distinct de `index-*.js`).

- [x] **Step 7 : Commit**

```bash
git add package.json package-lock.json src/online vite.config.ts tests/unit/online
git commit -m "feat: accès au serveur du jeu en ligne (API vérifiée, client Supabase chargé à la demande)"
```

---
### Task 4 : Base de données Supabase (projet, schéma, tests contre le vrai serveur)

**Files:**
- Create: `supabase/migrations/20260926000000_parties.sql`, `vitest.online.config.ts`, `tests/online/parties.test.ts`, `.env.local` (non versionné)
- Modify: `package.json` (script `test:online`), `tsconfig.node.json` (inclure la nouvelle config)

**Interfaces:**
- Produces : projet Supabase « jeux-kzo » (région `ca-central-1`) avec la table `parties`, ses règles d'accès, les fonctions listées dans les contraintes globales, la publication Realtime, les règles de présence et la tâche `nettoyage-parties` ; `.env.local` avec `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` ; `npm run test:online`.

Les codes d'erreur levés (`raise exception '<code>'`) sont exactement ceux de `SERVER_ERROR_CODES` (Tâche 2). Le trait se déduit du nombre de coups (les Blancs jouent les coups d'indice pair). Les fonctions internes (`nouveau_code`, `pseudo_propre`, `resultat_valide`, `ma_partie`, `ma_couleur`, `exiger_en_cours`) ne sont pas appelables par l'app.

- [x] **Step 1 : Écrire la migration**

**Fichier : `supabase/migrations/20260926000000_parties.sql`**
```sql
-- Jeu en ligne entre amis : parties, règles d'accès, fonctions, temps réel, nettoyage.
create extension if not exists pg_cron with schema pg_catalog;

create table public.parties (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$'),
  jeu text not null check (jeu in ('chess', 'draughts')),
  depart text not null,
  coups text[] not null default '{}',
  blancs uuid references auth.users (id) on delete set null,
  noirs uuid references auth.users (id) on delete set null,
  pseudo_blancs text check (char_length(pseudo_blancs) between 1 and 20),
  pseudo_noirs text check (char_length(pseudo_noirs) between 1 and 20),
  statut text not null default 'attente' check (statut in ('attente', 'en_cours', 'terminee')),
  resultat jsonb,
  nulle_proposee_par text check (nulle_proposee_par in ('white', 'black')),
  revanche_code text,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now()
);

create index parties_blancs_idx on public.parties (blancs);
create index parties_noirs_idx on public.parties (noirs);
create index parties_maj_le_idx on public.parties (maj_le);

alter table public.parties enable row level security;

create policy "les joueurs lisent leurs parties"
  on public.parties for select to authenticated
  using ((select auth.uid()) in (blancs, noirs));

-- Aucune écriture directe : tout passe par les fonctions ci-dessous.
revoke insert, update, delete on public.parties from anon, authenticated;

create function public.parties_maj() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.maj_le := now();
  return new;
end $$;

create trigger parties_maj before update on public.parties
  for each row execute function public.parties_maj();

-- Aides internes -------------------------------------------------------------

create function public.nouveau_code() returns text
language plpgsql set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidat text;
begin
  loop
    candidat := '';
    for i in 1..6 loop
      candidat := candidat || substr(alphabet, 1 + floor(random() * 32)::int, 1);
    end loop;
    exit when not exists (select 1 from public.parties where code = candidat);
  end loop;
  return candidat;
end $$;

create function public.pseudo_propre(p_pseudo text) returns text
language plpgsql immutable set search_path = '' as $$
declare
  propre text := btrim(coalesce(p_pseudo, ''), E' \t\r\n');
begin
  if char_length(propre) not between 1 and 20 then
    raise exception 'entree_invalide';
  end if;
  return propre;
end $$;

create function public.resultat_valide(p_resultat jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(
    case p_resultat ->> 'kind'
      when 'win' then (p_resultat ->> 'winner') in ('white', 'black') and (p_resultat ->> 'reason') in ('checkmate', 'no-moves')
      when 'draw' then (p_resultat ->> 'reason') in ('stalemate', 'repetition', 'fifty-moves', 'insufficient-material', 'king-moves', 'endgame-limit')
      else false
    end,
    false)
$$;

create function public.ma_partie(p_partie uuid) returns public.parties
language plpgsql set search_path = '' as $$
declare
  partie public.parties;
begin
  if auth.uid() is null then
    raise exception 'non_connecte';
  end if;
  select * into partie from public.parties where id = p_partie for update;
  if not found or not coalesce(auth.uid() in (partie.blancs, partie.noirs), false) then
    raise exception 'partie_introuvable';
  end if;
  return partie;
end $$;

create function public.ma_couleur(p_partie public.parties) returns text
language sql stable set search_path = '' as $$
  select case when p_partie.blancs = auth.uid() then 'white' else 'black' end
$$;

create function public.exiger_en_cours(p_partie public.parties) returns void
language plpgsql set search_path = '' as $$
begin
  if p_partie.statut = 'attente' then
    raise exception 'adversaire_absent';
  end if;
  if p_partie.statut = 'terminee' then
    raise exception 'partie_terminee';
  end if;
end $$;

-- Fonctions appelées par l'app ----------------------------------------------

create function public.creer_partie(p_jeu text, p_couleur text, p_pseudo text) returns public.parties
language plpgsql security definer set search_path = '' as $$
declare
  moi uuid := auth.uid();
  nom text;
  partie public.parties;
begin
  if moi is null then
    raise exception 'non_connecte';
  end if;
  if coalesce(p_jeu, '') not in ('chess', 'draughts') or coalesce(p_couleur, '') not in ('white', 'black') then
    raise exception 'entree_invalide';
  end if;
  nom := public.pseudo_propre(p_pseudo);
  if (select count(*) from public.parties where moi in (blancs, noirs) and statut <> 'terminee') >= 20 then
    raise exception 'trop_de_parties';
  end if;
  insert into public.parties (code, jeu, depart, blancs, noirs, pseudo_blancs, pseudo_noirs)
  values (
    public.nouveau_code(),
    p_jeu,
    case p_jeu when 'chess' then 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' else 'W:W31-50:B1-20' end,
    case when p_couleur = 'white' then moi end,
    case when p_couleur = 'black' then moi end,
    case when p_couleur = 'white' then nom end,
    case when p_couleur = 'black' then nom end
  )
  returning * into partie;
  return partie;
end $$;

create function public.rejoindre_partie(p_code text, p_pseudo text) returns public.parties
language plpgsql security definer set search_path = '' as $$
declare
  moi uuid := auth.uid();
  nom text;
  partie public.parties;
begin
  if moi is null then
    raise exception 'non_connecte';
  end if;
  select * into partie from public.parties where code = upper(btrim(coalesce(p_code, ''))) for update;
  if not found then
    raise exception 'code_inconnu';
  end if;
  if moi = partie.blancs or moi = partie.noirs then
    return partie;
  end if;
  if partie.statut <> 'attente' then
    raise exception 'partie_complete';
  end if;
  nom := public.pseudo_propre(p_pseudo);
  if partie.blancs is null then
    update public.parties set blancs = moi, pseudo_blancs = nom, statut = 'en_cours' where id = partie.id returning * into partie;
  else
    update public.parties set noirs = moi, pseudo_noirs = nom, statut = 'en_cours' where id = partie.id returning * into partie;
  end if;
  return partie;
end $$;

create function public.jouer_coup(p_partie uuid, p_numero integer, p_coup text, p_resultat jsonb default null) returns public.parties
language plpgsql security definer set search_path = '' as $$
declare
  partie public.parties := public.ma_partie(p_partie);
  joues integer := coalesce(array_length(partie.coups, 1), 0);
  fin jsonb := case when p_resultat is null or jsonb_typeof(p_resultat) = 'null' then null else p_resultat end;
begin
  perform public.exiger_en_cours(partie);
  if p_numero is distinct from joues then
    raise exception 'conflit';
  end if;
  if public.ma_couleur(partie) <> (case when joues % 2 = 0 then 'white' else 'black' end) then
    raise exception 'pas_ton_tour';
  end if;
  if p_coup is null or not (
    case partie.jeu
      when 'chess' then p_coup ~ '^[a-h][1-8][a-h][1-8][qrbn]?$'
      else p_coup ~ '^[0-9]{1,2}([-x][0-9]{1,2})+$'
    end
  ) then
    raise exception 'coup_invalide';
  end if;
  if fin is not null and not public.resultat_valide(fin) then
    raise exception 'resultat_invalide';
  end if;
  update public.parties
  set coups = array_append(coups, p_coup),
      nulle_proposee_par = null,
      statut = case when fin is null then 'en_cours' else 'terminee' end,
      resultat = fin
  where id = partie.id
  returning * into partie;
  return partie;
end $$;

create function public.proposer_nulle(p_partie uuid) returns public.parties
language plpgsql security definer set search_path = '' as $$
declare
  partie public.parties := public.ma_partie(p_partie);
  couleur text := public.ma_couleur(partie);
begin
  perform public.exiger_en_cours(partie);
  if partie.nulle_proposee_par is not null and partie.nulle_proposee_par <> couleur then
    update public.parties
    set statut = 'terminee', resultat = '{"kind": "draw", "reason": "agreement"}', nulle_proposee_par = null
    where id = partie.id returning * into partie;
  else
    update public.parties set nulle_proposee_par = couleur where id = partie.id returning * into partie;
  end if;
  return partie;
end $$;

create function public.repondre_nulle(p_partie uuid, p_accepte boolean) returns public.parties
language plpgsql security definer set search_path = '' as $$
declare
  partie public.parties := public.ma_partie(p_partie);
begin
  perform public.exiger_en_cours(partie);
  if partie.nulle_proposee_par is null or partie.nulle_proposee_par = public.ma_couleur(partie) then
    raise exception 'pas_de_proposition';
  end if;
  if coalesce(p_accepte, false) then
    update public.parties
    set statut = 'terminee', resultat = '{"kind": "draw", "reason": "agreement"}', nulle_proposee_par = null
    where id = partie.id returning * into partie;
  else
    update public.parties set nulle_proposee_par = null where id = partie.id returning * into partie;
  end if;
  return partie;
end $$;

create function public.abandonner(p_partie uuid) returns public.parties
language plpgsql security definer set search_path = '' as $$
declare
  partie public.parties := public.ma_partie(p_partie);
begin
  perform public.exiger_en_cours(partie);
  update public.parties
  set statut = 'terminee',
      nulle_proposee_par = null,
      resultat = jsonb_build_object(
        'kind', 'win',
        'winner', case when public.ma_couleur(partie) = 'white' then 'black' else 'white' end,
        'reason', 'resign')
  where id = partie.id
  returning * into partie;
  return partie;
end $$;

create function public.annuler_partie(p_partie uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  partie public.parties := public.ma_partie(p_partie);
begin
  if partie.statut <> 'attente' then
    raise exception 'partie_commencee';
  end if;
  delete from public.parties where id = partie.id;
end $$;

create function public.lancer_revanche(p_partie uuid) returns public.parties
language plpgsql security definer set search_path = '' as $$
declare
  partie public.parties := public.ma_partie(p_partie);
  revanche public.parties;
begin
  if partie.statut <> 'terminee' then
    raise exception 'partie_en_cours';
  end if;
  if partie.revanche_code is not null then
    select * into revanche from public.parties where code = partie.revanche_code;
    if found then
      return revanche;
    end if;
  end if;
  if partie.blancs is null or partie.noirs is null then
    raise exception 'adversaire_absent';
  end if;
  insert into public.parties (code, jeu, depart, blancs, noirs, pseudo_blancs, pseudo_noirs, statut)
  values (public.nouveau_code(), partie.jeu, partie.depart, partie.noirs, partie.blancs, partie.pseudo_noirs, partie.pseudo_blancs, 'en_cours')
  returning * into revanche;
  update public.parties set revanche_code = revanche.code where id = partie.id;
  return revanche;
end $$;

-- Droits : seules les fonctions de l'app sont appelables, et seulement par un joueur connecté.
revoke all on function public.parties_maj() from public, anon, authenticated;
revoke all on function public.nouveau_code() from public, anon, authenticated;
revoke all on function public.pseudo_propre(text) from public, anon, authenticated;
revoke all on function public.resultat_valide(jsonb) from public, anon, authenticated;
revoke all on function public.ma_partie(uuid) from public, anon, authenticated;
revoke all on function public.ma_couleur(public.parties) from public, anon, authenticated;
revoke all on function public.exiger_en_cours(public.parties) from public, anon, authenticated;

revoke all on function public.creer_partie(text, text, text) from public, anon;
revoke all on function public.rejoindre_partie(text, text) from public, anon;
revoke all on function public.jouer_coup(uuid, integer, text, jsonb) from public, anon;
revoke all on function public.proposer_nulle(uuid) from public, anon;
revoke all on function public.repondre_nulle(uuid, boolean) from public, anon;
revoke all on function public.abandonner(uuid) from public, anon;
revoke all on function public.annuler_partie(uuid) from public, anon;
revoke all on function public.lancer_revanche(uuid) from public, anon;
grant execute on function public.creer_partie(text, text, text) to authenticated;
grant execute on function public.rejoindre_partie(text, text) to authenticated;
grant execute on function public.jouer_coup(uuid, integer, text, jsonb) to authenticated;
grant execute on function public.proposer_nulle(uuid) to authenticated;
grant execute on function public.repondre_nulle(uuid, boolean) to authenticated;
grant execute on function public.abandonner(uuid) to authenticated;
grant execute on function public.annuler_partie(uuid) to authenticated;
grant execute on function public.lancer_revanche(uuid) to authenticated;

-- Temps réel : changements de la table (règles d'accès appliquées) et présence sur canal privé.
alter publication supabase_realtime add table public.parties;

create policy "joueurs : voir la présence de leur partie"
  on realtime.messages for select to authenticated
  using (
    realtime.messages.extension in ('presence')
    and exists (
      select 1 from public.parties p
      where 'partie:' || p.id::text = (select realtime.topic())
        and (select auth.uid()) in (p.blancs, p.noirs)
    )
  );

create policy "joueurs : annoncer leur présence"
  on realtime.messages for insert to authenticated
  with check (
    realtime.messages.extension in ('presence')
    and exists (
      select 1 from public.parties p
      where 'partie:' || p.id::text = (select realtime.topic())
        and (select auth.uid()) in (p.blancs, p.noirs)
    )
  );

-- Nettoyage : chaque nuit, suppression des parties sans activité depuis 7 jours.
select cron.schedule(
  'nettoyage-parties',
  '17 3 * * *',
  $$ delete from public.parties where maj_le < now() - interval '7 days' $$
);
```

Dans `jouer_coup`, la variable locale s'appelle `fin` (et non `resultat`, nom d'une colonne : PL/pgSQL refuserait la référence ambiguë) ; la valeur JSON `null` envoyée par l'app est traitée comme « pas de résultat ».

- [x] **Step 2 : Créer le projet Supabase « jeux-kzo »** (action sur le compte de l'utilisateur, annoncée)

Avec les outils Supabase : `get_cost` (type `project`, organisation `xfqkaxvozubmuiqeghjf`) → vérifier **0 $** ; `confirm_cost` ; `create_project` (nom `jeux-kzo`, région `ca-central-1`, organisation `xfqkaxvozubmuiqeghjf`) ; attendre avec `get_project` que le statut soit `ACTIVE_HEALTHY`.

- [x] **Step 3 : Appliquer la migration et vérifier la sécurité**

Avec `apply_migration` (nom `parties`, contenu du fichier du Step 1), puis `list_tables` (schéma `public`) : la table `parties` apparaît avec RLS activé. Puis `get_advisors` (type `security`) : aucun avertissement sur `parties` ni sur les fonctions (les avertissements généraux du projet, s'il y en a, sont notés).

- [x] **Step 4 : Écrire la configuration locale**

Avec `get_project_url` et `get_publishable_keys`, écrire `.env.local` (ignoré par git grâce à `.env.*`) :
```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<clé publishable>
```
Vérifier : `git check-ignore .env.local` affiche `.env.local`.

- [x] **Step 5 : Faire activer deux réglages du tableau de bord** (par l'utilisateur)

Les outils ne permettent pas de les changer ; demander à l'utilisateur, avec les liens directs :
1. **Authentication → Sign In / Providers → « Allow anonymous sign-ins »** : activer (`https://supabase.com/dashboard/project/<ref>/auth/providers`).
2. **Realtime → Settings → « Allow public access »** : désactiver, pour imposer les canaux privés (`https://supabase.com/dashboard/project/<ref>/realtime/settings`).
Continuer les tâches 5 et 6 en attendant ; les steps 6 à 8 attendent la confirmation.

- [x] **Step 6 : Écrire les tests contre le vrai serveur**

**Fichier : `vitest.online.config.ts`**
```ts
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => ({
  test: {
    environment: 'node',
    include: ['tests/online/**/*.test.ts'],
    testTimeout: 30_000,
    env: loadEnv(mode, process.cwd(), 'VITE_'),
  },
}));
```

Dans `package.json`, ajouter après la ligne `"test:strength": …,` :
```json
    "test:online": "vitest run --config vitest.online.config.ts",
```
Dans `tsconfig.node.json`, ajouter `"vitest.online.config.ts"` à la liste `include`.

**Fichier : `tests/online/parties.test.ts`**
```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';

const url = process.env.VITE_SUPABASE_URL ?? '';
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

type Row = Record<string, unknown>;

async function player(): Promise<{ client: SupabaseClient; id: string }> {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) throw new Error(`Connexion anonyme impossible (réglage activé ?) : ${error?.message}`);
  return { client, id: data.user.id };
}

async function call(client: SupabaseClient, fn: string, args: Row): Promise<Row> {
  const { data, error } = await client.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as Row;
}

async function failure(client: SupabaseClient, fn: string, args: Row): Promise<string> {
  const { error } = await client.rpc(fn, args);
  return error?.message ?? 'aucune erreur';
}

describe('parties en ligne (vrai serveur)', () => {
  let alice: Awaited<ReturnType<typeof player>>;
  let bob: Awaited<ReturnType<typeof player>>;
  let eve: Awaited<ReturnType<typeof player>>;

  beforeAll(async () => {
    [alice, bob, eve] = await Promise.all([player(), player(), player()]);
  });

  async function started(jeu = 'chess'): Promise<Row> {
    const created = await call(alice.client, 'creer_partie', { p_jeu: jeu, p_couleur: 'white', p_pseudo: 'Alice' });
    return call(bob.client, 'rejoindre_partie', { p_code: created.code, p_pseudo: 'Bob' });
  }

  it('crée et rejoint une partie par son code', async () => {
    const created = await call(alice.client, 'creer_partie', { p_jeu: 'chess', p_couleur: 'white', p_pseudo: '  Alice ' });
    expect(created).toMatchObject({ statut: 'attente', pseudo_blancs: 'Alice', blancs: alice.id, noirs: null, coups: [] });
    expect(String(created.code)).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    const joined = await call(bob.client, 'rejoindre_partie', { p_code: ` ${String(created.code).toLowerCase()} `, p_pseudo: 'Bob' });
    expect(joined).toMatchObject({ id: created.id, statut: 'en_cours', noirs: bob.id, pseudo_noirs: 'Bob' });
    expect(await call(bob.client, 'rejoindre_partie', { p_code: created.code, p_pseudo: 'Bob' })).toMatchObject({ id: created.id });
    expect(await failure(eve.client, 'rejoindre_partie', { p_code: created.code, p_pseudo: 'Eve' })).toBe('partie_complete');
    expect(await failure(eve.client, 'rejoindre_partie', { p_code: 'ZZZZZZ', p_pseudo: 'Eve' })).toBe('code_inconnu');
  });

  it('arbitre les coups : tour, ordre et format', async () => {
    const game = await started();
    const move = (who: typeof alice, numero: number, coup: string, resultat: unknown = null) =>
      ({ who, args: { p_partie: game.id, p_numero: numero, p_coup: coup, p_resultat: resultat } });
    const play = ({ who, args }: ReturnType<typeof move>) => call(who.client, 'jouer_coup', args);
    const refuse = ({ who, args }: ReturnType<typeof move>) => failure(who.client, 'jouer_coup', args);
    expect(await refuse(move(bob, 0, 'e7e5'))).toBe('pas_ton_tour');
    expect(await play(move(alice, 0, 'e2e4'))).toMatchObject({ coups: ['e2e4'] });
    expect(await refuse(move(bob, 0, 'e7e5'))).toBe('conflit');
    expect(await refuse(move(bob, 1, 'e7e9'))).toBe('coup_invalide');
    expect(await refuse(move(bob, 1, 'e7e5', { kind: 'win', winner: 'black', reason: 'resign' }))).toBe('resultat_invalide');
    expect(await play(move(bob, 1, 'e7e5'))).toMatchObject({ coups: ['e2e4', 'e7e5'], statut: 'en_cours' });
    const won = await play(move(alice, 2, 'd1h5', { kind: 'win', winner: 'white', reason: 'checkmate' }));
    expect(won).toMatchObject({ statut: 'terminee', resultat: { kind: 'win', winner: 'white', reason: 'checkmate' } });
    expect(await refuse(move(bob, 3, 'a7a6'))).toBe('partie_terminee');
  });

  it('cache les parties aux autres et interdit toute écriture directe', async () => {
    const game = await started('draughts');
    const { data } = await eve.client.from('parties').select('*').eq('id', game.id);
    expect(data).toEqual([]);
    expect(await failure(eve.client, 'jouer_coup', { p_partie: game.id, p_numero: 0, p_coup: '32-28', p_resultat: null })).toBe('partie_introuvable');
    const direct = await alice.client.from('parties').update({ statut: 'terminee' }).eq('id', game.id);
    expect(direct.error).not.toBeNull();
    expect(await failure(alice.client, 'ma_partie', { p_partie: game.id })).not.toBe('aucune erreur');
  });

  it('nulle proposée, refusée puis acceptée, et une seule revanche aux couleurs inversées', async () => {
    const game = await started();
    expect(await call(alice.client, 'proposer_nulle', { p_partie: game.id })).toMatchObject({ nulle_proposee_par: 'white' });
    expect(await failure(alice.client, 'repondre_nulle', { p_partie: game.id, p_accepte: true })).toBe('pas_de_proposition');
    expect(await call(bob.client, 'repondre_nulle', { p_partie: game.id, p_accepte: false })).toMatchObject({ nulle_proposee_par: null });
    await call(alice.client, 'proposer_nulle', { p_partie: game.id });
    const drawn = await call(bob.client, 'repondre_nulle', { p_partie: game.id, p_accepte: true });
    expect(drawn).toMatchObject({ statut: 'terminee', resultat: { kind: 'draw', reason: 'agreement' } });
    const [first, second] = await Promise.all([
      call(alice.client, 'lancer_revanche', { p_partie: game.id }),
      call(bob.client, 'lancer_revanche', { p_partie: game.id }),
    ]);
    expect(first.code).toBe(second.code);
    expect(first).toMatchObject({ statut: 'en_cours', blancs: bob.id, noirs: alice.id, pseudo_blancs: 'Bob' });
  });

  it('abandon, annulation et entrées invalides', async () => {
    const game = await started();
    expect(await call(bob.client, 'abandonner', { p_partie: game.id })).toMatchObject({
      statut: 'terminee',
      resultat: { kind: 'win', winner: 'white', reason: 'resign' },
    });
    const waiting = await call(alice.client, 'creer_partie', { p_jeu: 'draughts', p_couleur: 'black', p_pseudo: 'Alice' });
    expect(await failure(alice.client, 'abandonner', { p_partie: waiting.id })).toBe('adversaire_absent');
    await call(alice.client, 'annuler_partie', { p_partie: waiting.id });
    expect(await failure(bob.client, 'rejoindre_partie', { p_code: waiting.code, p_pseudo: 'Bob' })).toBe('code_inconnu');
    expect(await failure(alice.client, 'annuler_partie', { p_partie: game.id })).toBe('partie_commencee');
    expect(await failure(alice.client, 'creer_partie', { p_jeu: 'chess', p_couleur: 'white', p_pseudo: '   ' })).toBe('entree_invalide');
    expect(await failure(alice.client, 'creer_partie', { p_jeu: 'chess', p_couleur: 'white', p_pseudo: 'x'.repeat(21) })).toBe('entree_invalide');
    expect(await failure(alice.client, 'creer_partie', { p_jeu: 'go', p_couleur: 'white', p_pseudo: 'Alice' })).toBe('entree_invalide');
  });
});
```

- [x] **Step 7 : Lancer les tests contre le serveur**

Run : `npm run test:online`
Expected : 5 tests PASS. Si « Connexion anonyme impossible », le réglage du Step 5 n'est pas encore activé.

- [x] **Step 8 : Commit** (sans `.env.local`)

```bash
git add supabase vitest.online.config.ts tests/online package.json tsconfig.node.json
git commit -m "feat: base de données du jeu en ligne (parties, règles d'accès, fonctions, présence, nettoyage)"
```

---

### Task 5 : Hooks du jeu en ligne et plateau commun

**Files:**
- Create: `src/board/useMoveInput.ts`, `src/app/components/BoardView.tsx`, `src/app/online/share.ts`, `src/app/online/useOnlineApi.ts`, `src/app/online/useOnlineGame.ts`
- Modify: `src/app/screens/PlayScreen.tsx` (utilise `BoardView`), `vite.config.ts` (exclusions)
- Test: `tests/unit/board/useMoveInput.test.ts`, `tests/unit/app/online/fake-api.ts`, `tests/unit/app/online/useOnlineGame.test.ts`, `tests/unit/app/online/share.test.ts`

**Interfaces:**
- Consumes: `OnlineApi`, `WatchHandlers`, `OnlineError`, `onlineErrorMessage`, `isOnlineError`, `OnlineGame` (Tâches 2-3) ; `buildOnlineView`, `resultAfter`, `OnlineRules` (Tâche 2) ; `GameKit` ; `tapSquare`, `dropPiece`, `EMPTY_INPUT`.
- Produces :
  - `useMoveInput.ts` : `MoveInput<Move> { input; choices; tap; drop; choose; cancelChoice }`, `useMoveInput(legal, onMove)`.
  - `BoardView` `{ kit; position; bottom; legal; input; last; arrow?; choices; onTap; onDrop; onChoose; onCancelChoice }` : pièces prises des deux camps, plateau, choix de promotion / de rafle.
  - `share.ts` : `ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed'`, `shareInvite(url, title)`.
  - `useOnlineApi.ts` : `OnlineConnection { api; userId; error; retry }`, `useOnlineApi(enabled, load = getOnlineApi)` : rien n'est chargé tant que `enabled` est faux ; hors ligne → message `hors_ligne`.
  - `useOnlineGame.ts` : `OnlineGameController<Pos, Move> { game; view; loading; error; notice; connected; opponentOnline; busy; legal; input; offerDraw; answerDraw; resign; cancel(): Promise<boolean>; rematch(): Promise<string | null>; refresh }`, `useOnlineGame(rules, api, userId, code, sound)`.

`useOnlineGame` garde la **partie confirmée** (dernière réponse du serveur) et un **coup en attente** affiché tout de suite ; `playMove` reçoit toujours la partie confirmée. Chaque notification (changement, retour du réseau, retour au premier plan, reconnexion temps réel) relit la partie.

- [x] **Step 1 : Écrire les tests qui échouent**

**Fichier : `tests/unit/board/useMoveInput.test.ts`**
```ts
import { act, renderHook } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { useMoveInput } from '../../../src/board/useMoveInput';

const legal = [
  { from: 'e7', to: 'e8', promotion: 'q' },
  { from: 'e7', to: 'e8', promotion: 'n' },
  { from: 'a2', to: 'a3' },
];

describe('saisie d’un coup', () => {
  it('joue un coup en deux touchers', () => {
    const onMove = vi.fn();
    const { result } = renderHook(() => useMoveInput(legal, onMove));
    act(() => result.current.tap('a2'));
    expect(result.current.input.selected).toBe('a2');
    act(() => result.current.tap('a3'));
    expect(onMove).toHaveBeenCalledWith({ from: 'a2', to: 'a3' });
    expect(result.current.input.selected).toBeNull();
  });

  it('demande de choisir entre plusieurs coups du même trajet', () => {
    const onMove = vi.fn();
    const { result } = renderHook(() => useMoveInput(legal, onMove));
    act(() => result.current.drop('e7', 'e8'));
    expect(result.current.choices).toHaveLength(2);
    act(() => result.current.tap('a2'));
    expect(onMove).not.toHaveBeenCalled();
    act(() => result.current.choose(legal[1]));
    expect(onMove).toHaveBeenCalledWith(legal[1]);
    expect(result.current.choices).toBeNull();
    act(() => result.current.drop('e7', 'e8'));
    act(() => result.current.cancelChoice());
    expect(result.current.choices).toBeNull();
    expect(result.current.input.selected).toBeNull();
  });
});
```

**Fichier : `tests/unit/app/online/fake-api.ts`**
```ts
import { vi } from 'vitest';
import type { OnlineApi } from '../../../../src/online/api';
import type { WatchHandlers } from '../../../../src/online/backend';
import type { OnlineGame } from '../../../../src/online/types';
import { onlineGame } from '../../online/fixtures';

/** Faux serveur : une partie en mémoire, modifiable, et des événements déclenchables. */
export function fakeApi(initial: OnlineGame | null = onlineGame()) {
  let current: OnlineGame | null = initial;
  let handlers: WatchHandlers | null = null;
  const now = (): OnlineGame => {
    if (!current) throw new Error('aucune partie');
    return current;
  };
  const update = (changes: Partial<OnlineGame>): OnlineGame => {
    current = { ...now(), ...changes };
    return current;
  };
  const api = {
    userId: vi.fn(async () => 'moi'),
    createGame: vi.fn(async () => now()),
    joinGame: vi.fn(async () => now()),
    playMove: vi.fn(async (game: OnlineGame, move: string) => update({ moves: [...game.moves, move] })),
    offerDraw: vi.fn(async () => update({ drawOfferedBy: 'white' })),
    answerDraw: vi.fn(async (_gameId: string, accept: boolean) =>
      update(accept ? { status: 'terminee', result: { kind: 'draw', reason: 'agreement' }, drawOfferedBy: null } : { drawOfferedBy: null }),
    ),
    resign: vi.fn(async () => update({ status: 'terminee', result: { kind: 'win', winner: 'black', reason: 'resign' } })),
    cancel: vi.fn(async () => {
      current = null;
    }),
    rematch: vi.fn(async () => onlineGame({ code: 'REVAN2', white: { id: 'ami', pseudo: 'Bob' }, black: { id: 'moi', pseudo: 'Alice' } })),
    findGame: vi.fn(async () => current),
    listGames: vi.fn(async () => (current ? [current] : [])),
    watch: vi.fn((_gameId: string, _userId: string, next: WatchHandlers) => {
      handlers = next;
      return () => {
        handlers = null;
      };
    }),
  } satisfies OnlineApi;
  return {
    api,
    set: (game: OnlineGame | null) => {
      current = game;
    },
    changed: () => handlers?.onChange(),
    presence: (userIds: readonly string[]) => handlers?.onPresence(userIds),
    connection: (connected: boolean) => handlers?.onConnection(connected),
    watching: () => handlers !== null,
  };
}
```

**Fichier : `tests/unit/app/online/useOnlineGame.test.ts`**
```ts
import { act, renderHook, waitFor } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { chessKit } from '../../../../src/app/games/chess';
import { useOnlineGame } from '../../../../src/app/online/useOnlineGame';
import { OnlineError } from '../../../../src/online/errors';
import { onlineGame } from '../../online/fixtures';
import { fakeApi } from './fake-api';

function setup(fake = fakeApi()) {
  const hook = renderHook(() => useOnlineGame(chessKit, fake.api, 'moi', 'K7M2QX', false));
  return { fake, hook };
}

describe('useOnlineGame', () => {
  it('charge la partie et suit ses changements', async () => {
    const { fake, hook } = setup();
    await waitFor(() => expect(hook.result.current.view?.myTurn).toBe(true));
    expect(hook.result.current.loading).toBe(false);
    expect(fake.watching()).toBe(true);
    fake.set(onlineGame({ moves: ['e2e4', 'e7e5'] }));
    act(() => fake.changed());
    await waitFor(() => expect(hook.result.current.game?.moves).toEqual(['e2e4', 'e7e5']));
  });

  it('joue un coup avec le numéro attendu et affiche le coup tout de suite', async () => {
    const { fake, hook } = setup();
    await waitFor(() => expect(hook.result.current.legal.length).toBeGreaterThan(0));
    act(() => hook.result.current.input.tap('e2'));
    act(() => hook.result.current.input.tap('e4'));
    expect(hook.result.current.view?.session.moves).toHaveLength(1);
    expect(fake.api.playMove).toHaveBeenCalledWith(onlineGame(), 'e2e4', null);
    await waitFor(() => expect(hook.result.current.game?.moves).toEqual(['e2e4']));
    expect(hook.result.current.view?.myTurn).toBe(false);
  });

  it('relit la partie après des coups croisés', async () => {
    const { fake, hook } = setup();
    await waitFor(() => expect(hook.result.current.legal.length).toBeGreaterThan(0));
    fake.api.playMove.mockRejectedValueOnce(new OnlineError('conflit'));
    act(() => hook.result.current.input.tap('e2'));
    act(() => hook.result.current.input.tap('e4'));
    await waitFor(() => expect(hook.result.current.notice).toBe('La partie a changé : rejoue ton coup.'));
    expect(hook.result.current.view?.session.moves).toHaveLength(0);
    expect(fake.api.findGame.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('suit la présence de l’ami et la connexion', async () => {
    const { fake, hook } = setup();
    await waitFor(() => expect(fake.watching()).toBe(true));
    act(() => fake.presence(['moi', 'ami']));
    expect(hook.result.current.opponentOnline).toBe(true);
    act(() => fake.connection(false));
    expect(hook.result.current.connected).toBe(false);
    expect(hook.result.current.legal).toEqual([]);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(hook.result.current.connected).toBe(true);
  });

  it('signale une partie introuvable', async () => {
    const { hook } = setup(fakeApi(null));
    await waitFor(() => expect(hook.result.current.error).toBe("Cette partie n'existe plus, ou ce n'est pas la tienne."));
  });

  it('propose, accepte la nulle, abandonne, annule et lance la revanche', async () => {
    const { fake, hook } = setup();
    const idle = () => expect(hook.result.current.busy).toBe(false);
    await waitFor(() => expect(hook.result.current.game).not.toBeNull());
    act(() => hook.result.current.offerDraw());
    await waitFor(() => {
      expect(hook.result.current.game?.drawOfferedBy).toBe('white');
      idle();
    });
    act(() => hook.result.current.answerDraw(true));
    await waitFor(() => {
      expect(hook.result.current.game?.status).toBe('terminee');
      idle();
    });
    expect(await hook.result.current.rematch()).toBe('REVAN2');
    fake.set(onlineGame());
    act(() => fake.changed());
    await waitFor(() => expect(hook.result.current.game?.status).toBe('en_cours'));
    act(() => hook.result.current.resign());
    await waitFor(() => {
      expect(hook.result.current.game?.status).toBe('terminee');
      idle();
    });
    expect(await hook.result.current.cancel()).toBe(true);
    expect(fake.api.cancel).toHaveBeenCalledWith(onlineGame().id);
  });
});
```

**Fichier : `tests/unit/app/online/share.test.ts`**
```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { shareInvite } from '../../../../src/app/online/share';

const nav = navigator as { share?: unknown; clipboard?: unknown };

afterEach(() => {
  delete nav.share;
  delete nav.clipboard;
});

describe('partage du lien', () => {
  it('ouvre le menu de partage du téléphone', async () => {
    nav.share = vi.fn(async () => undefined);
    expect(await shareInvite('https://x/#/rejoindre/K7M2QX', 'Échecs')).toBe('shared');
  });

  it('copie le lien sans menu de partage', async () => {
    const writeText = vi.fn(async () => undefined);
    nav.clipboard = { writeText };
    expect(await shareInvite('https://x/#/rejoindre/K7M2QX', 'Échecs')).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('https://x/#/rejoindre/K7M2QX');
  });

  it('distingue un partage annulé d’un échec', async () => {
    nav.share = vi.fn(async () => {
      throw new DOMException('annulé', 'AbortError');
    });
    expect(await shareInvite('u', 't')).toBe('cancelled');
    nav.share = vi.fn(async () => {
      throw new Error('refusé');
    });
    expect(await shareInvite('u', 't')).toBe('failed');
  });
});
```

- [x] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run tests/unit/board/useMoveInput.test.ts tests/unit/app/online`
Expected : FAIL — modules `useMoveInput`, `useOnlineGame`, `share` introuvables.

- [x] **Step 3 : Écrire la saisie et le plateau commun**

**Fichier : `src/board/useMoveInput.ts`**
```ts
import { useState } from 'preact/hooks';
import { EMPTY_INPUT, dropPiece, tapSquare, type InputResult, type InputState, type MoveShape } from './move-input';

export interface MoveInput<Move> {
  readonly input: InputState;
  /** Plusieurs coups pour le même trajet (promotion, rafles) : il faut choisir. */
  readonly choices: readonly Move[] | null;
  tap(square: string): void;
  drop(from: string, to: string): void;
  choose(move: Move): void;
  cancelChoice(): void;
}

/** Saisie d'un coup au toucher ou au glisser ; `onMove` reçoit le coup choisi. */
export function useMoveInput<Move extends MoveShape>(legal: readonly Move[], onMove: (move: Move) => void): MoveInput<Move> {
  const [input, setInput] = useState<InputState>(EMPTY_INPUT);
  const [choices, setChoices] = useState<readonly Move[] | null>(null);

  const handle = (result: InputResult<Move>) => {
    if (result.choices) {
      setInput(result.state);
      setChoices(result.choices);
      return;
    }
    setInput(result.move ? EMPTY_INPUT : result.state);
    if (result.move) onMove(result.move);
  };

  return {
    input,
    choices,
    tap: (square) => {
      if (choices === null) handle(tapSquare(input, square, legal));
    },
    drop: (from, to) => {
      if (choices === null) handle(dropPiece(from, to, legal));
    },
    choose: (move) => {
      setChoices(null);
      setInput(EMPTY_INPUT);
      onMove(move);
    },
    cancelChoice: () => {
      setChoices(null);
      setInput(EMPTY_INPUT);
    },
  };
}
```

**Fichier : `src/app/components/BoardView.tsx`**
```tsx
import { useMemo } from 'preact/hooks';
import { Board } from '../../board/Board';
import { targetsOf, type InputState, type MoveShape } from '../../board/move-input';
import { opposite, type Color } from '../../core/types';
import type { GameKit } from '../games/kit';
import { CapturedRow } from './CapturedRow';

interface BoardViewProps<Pos, Move extends MoveShape> {
  readonly kit: GameKit<Pos, Move>;
  readonly position: Pos;
  /** Couleur affichée en bas du plateau. */
  readonly bottom: Color;
  readonly legal: readonly Move[];
  readonly input: InputState;
  readonly last: Move | null;
  readonly arrow?: Move | null;
  readonly choices: readonly Move[] | null;
  readonly onTap: (square: string) => void;
  readonly onDrop: (from: string, to: string) => void;
  readonly onChoose: (move: Move) => void;
  readonly onCancelChoice: () => void;
}

/** Plateau, pièces prises des deux camps et choix entre coups de même trajet : commun au jeu local et en ligne. */
export function BoardView<Pos, Move extends MoveShape>(props: BoardViewProps<Pos, Move>) {
  const { kit, position, bottom, legal, input, last, choices } = props;
  const geometry = useMemo(() => kit.geometry(bottom), [kit, bottom]);
  const captured = kit.capturedPieces(position);
  const ChoicePicker = kit.ChoicePicker;
  return (
    <>
      <CapturedRow color={bottom} pieces={captured[bottom]} />
      <div class="board-wrap">
        <Board
          geometry={geometry}
          pieces={kit.boardPieces(position)}
          selected={input.selected}
          targets={targetsOf(input.selected, legal)}
          highlights={last ? [last.from, last.to] : []}
          check={kit.checkSquare(position)}
          arrows={props.arrow ? [props.arrow] : []}
          animate={last}
          onSquareTap={props.onTap}
          onDrop={props.onDrop}
          canDrag={(square) => legal.some((move) => move.from === square)}
        />
      </div>
      <CapturedRow color={opposite(bottom)} pieces={captured[opposite(bottom)]} />
      {choices && <ChoicePicker color={kit.adapter.turn(position)} choices={choices} onPick={props.onChoose} onCancel={props.onCancelChoice} />}
    </>
  );
}
```

Dans `src/app/screens/PlayScreen.tsx` :
- remplacer les imports `import { useEffect, useMemo, useState } from 'preact/hooks';`, `import { Board } from '../../board/Board';`, `import { targetsOf, type MoveShape } from '../../board/move-input';`, `import { opposite } from '../../core/types';` et `import { CapturedRow } from '../components/CapturedRow';` par :
```tsx
import { useEffect, useState } from 'preact/hooks';
import type { MoveShape } from '../../board/move-input';
import { BoardView } from '../components/BoardView';
```
- supprimer les lignes `const geometry = useMemo(() => kit.geometry(bottom), [kit, bottom]);`, `const captured = kit.capturedPieces(position);` et `const ChoicePicker = kit.ChoicePicker;` ;
- remplacer tout le bloc qui va de `<CapturedRow color={bottom} pieces={captured[bottom]} />` à `<CapturedRow color={opposite(bottom)} pieces={captured[opposite(bottom)]} />` inclus par :
```tsx
      <BoardView
        kit={kit}
        position={position}
        bottom={bottom}
        legal={game.legal}
        input={game.input}
        last={last}
        arrow={game.hint?.move ?? null}
        choices={game.choices}
        onTap={game.tap}
        onDrop={game.drop}
        onChoose={game.choose}
        onCancelChoice={game.cancelChoice}
      />
```
- supprimer le bloc `{game.choices && ( <ChoicePicker … /> )}` (désormais dans `BoardView`).

- [x] **Step 4 : Écrire le partage et les hooks**

**Fichier : `src/app/online/share.ts`**
```ts
export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

/** Menu de partage du téléphone (WhatsApp, SMS…), sinon copie du lien. */
export async function shareInvite(url: string, title: string): Promise<ShareOutcome> {
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title, text: `${title} : rejoins ma partie !`, url });
      return 'shared';
    }
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch (error) {
    return error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}
```

**Fichier : `src/app/online/useOnlineApi.ts`**
```ts
import { useEffect, useState } from 'preact/hooks';
import type { OnlineApi } from '../../online/api';
import { OnlineError, onlineErrorMessage } from '../../online/errors';
import { getOnlineApi } from '../../online/index';

export interface OnlineConnection {
  readonly api: OnlineApi | null;
  readonly userId: string | null;
  readonly error: string | null;
  retry(): void;
}

interface ConnectionState {
  readonly api: OnlineApi | null;
  readonly userId: string | null;
  readonly error: string | null;
}

const EMPTY: ConnectionState = { api: null, userId: null, error: null };

/** Charge le client du jeu en ligne et ouvre la session anonyme ; rien n'est chargé tant que `enabled` est faux. */
export function useOnlineApi(enabled: boolean, load: () => Promise<OnlineApi> = getOnlineApi): OnlineConnection {
  const [state, setState] = useState<ConnectionState>(EMPTY);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    if (!navigator.onLine) {
      setState({ ...EMPTY, error: new OnlineError('hors_ligne').message });
      return undefined;
    }
    let alive = true;
    setState(EMPTY);
    load()
      .then(async (api) => {
        const userId = await api.userId();
        if (alive) setState({ api, userId, error: null });
      })
      .catch((error: unknown) => {
        if (alive) setState({ ...EMPTY, error: onlineErrorMessage(error) });
      });
    return () => {
      alive = false;
    };
  }, [enabled, attempt]);

  return { ...state, retry: () => setAttempt((value) => value + 1) };
}
```

**Fichier : `src/app/online/useOnlineGame.ts`**
```ts
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { MoveShape } from '../../board/move-input';
import { useMoveInput, type MoveInput } from '../../board/useMoveInput';
import type { OnlineApi } from '../../online/api';
import { isOnlineError, onlineErrorMessage } from '../../online/errors';
import type { OnlineGame } from '../../online/types';
import { currentPosition } from '../game/session';
import { playSound } from '../sound';
import { buildOnlineView, resultAfter, type OnlineRules, type OnlineView } from './view';

const NOT_FOUND = "Cette partie n'existe plus, ou ce n'est pas la tienne.";

export interface OnlineGameController<Pos, Move> {
  /** Dernière partie confirmée par le serveur. */
  readonly game: OnlineGame | null;
  /** Vue affichée : inclut le coup envoyé et pas encore confirmé. */
  readonly view: OnlineView<Pos, Move> | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly notice: string | null;
  readonly connected: boolean;
  readonly opponentOnline: boolean;
  readonly busy: boolean;
  readonly legal: readonly Move[];
  readonly input: MoveInput<Move>;
  offerDraw(): void;
  answerDraw(accept: boolean): void;
  resign(): void;
  cancel(): Promise<boolean>;
  rematch(): Promise<string | null>;
  refresh(): void;
}

export function useOnlineGame<Pos, Move extends MoveShape>(
  rules: OnlineRules<Pos, Move>,
  api: OnlineApi,
  userId: string,
  code: string,
  sound: boolean,
): OnlineGameController<Pos, Move> {
  const [game, setGame] = useState<OnlineGame | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  const [present, setPresent] = useState<readonly string[]>([]);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const seenMoves = useRef(-1);

  const refresh = () => {
    api
      .findGame(code)
      .then((found) => {
        if (!alive.current) return;
        setLoading(false);
        if (found) {
          setGame(found);
          setError(null);
        } else {
          setError(NOT_FOUND);
        }
      })
      .catch((failure: unknown) => {
        if (!alive.current) return;
        setLoading(false);
        setNotice(onlineErrorMessage(failure));
      });
  };

  useEffect(() => {
    alive.current = true;
    refresh();
    return () => {
      alive.current = false;
    };
  }, [code]);

  const gameId = game?.id ?? null;
  useEffect(() => {
    if (!gameId) return undefined;
    const stop = api.watch(gameId, userId, {
      onChange: refresh,
      onPresence: setPresent,
      onConnection: (value) => {
        setConnected(value);
        if (value) refresh();
      },
    });
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const onOnline = () => {
      setConnected(true);
      refresh();
    };
    const onOffline = () => setConnected(false);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [gameId]);

  // Son discret quand un coup de l'ami ou la fin de partie arrive.
  useEffect(() => {
    if (!game) return;
    if (seenMoves.current >= 0 && game.moves.length > seenMoves.current) playSound(game.status === 'terminee' ? 'end' : 'move', sound);
    seenMoves.current = game.moves.length;
  }, [game]);

  const shown = useMemo(() => (game && pending ? { ...game, moves: [...game.moves, pending] } : game), [game, pending]);
  const view = useMemo(() => (shown ? buildOnlineView(rules, shown, userId) : null), [shown, userId]);
  const canPlay = view !== null && view.myTurn && connected && !busy && pending === null;
  const legal = useMemo(() => (canPlay && view ? rules.adapter.legalMoves(currentPosition(view.session)) : []), [view, canPlay]);

  const play = (move: Move) => {
    if (!game || !view || !canPlay) return;
    const encoded = rules.codec.encode(move);
    const result = resultAfter(rules, currentPosition(view.session), move);
    setPending(encoded);
    setBusy(true);
    setNotice(null);
    seenMoves.current = game.moves.length + 1;
    // Réponse ou refus : tout change d'un coup (coup en attente retiré, partie ou message à jour).
    const settle = () => {
      setPending(null);
      setBusy(false);
    };
    api
      .playMove(game, encoded, result)
      .then((next) => {
        if (!alive.current) return;
        settle();
        setGame(next);
      })
      .catch((failure: unknown) => {
        if (!alive.current) return;
        settle();
        setNotice(isOnlineError(failure, 'conflit') ? 'La partie a changé : rejoue ton coup.' : onlineErrorMessage(failure));
        refresh();
      });
  };

  const input = useMoveInput(legal, play);

  const act = (action: (gameId: string) => Promise<OnlineGame>) => {
    if (!game || busy) return;
    setBusy(true);
    setNotice(null);
    action(game.id)
      .then((next) => {
        if (alive.current) setGame(next);
      })
      .catch((failure: unknown) => {
        if (!alive.current) return;
        setNotice(onlineErrorMessage(failure));
        refresh();
      })
      .finally(() => {
        if (alive.current) setBusy(false);
      });
  };

  return {
    game,
    view,
    loading,
    error,
    notice,
    connected,
    opponentOnline: view?.opponentId ? present.includes(view.opponentId) : false,
    busy,
    legal,
    input,
    offerDraw: () => act((id) => api.offerDraw(id)),
    answerDraw: (accept) => act((id) => api.answerDraw(id, accept)),
    resign: () => act((id) => api.resign(id)),
    cancel: async () => {
      if (!game) return false;
      try {
        await api.cancel(game.id);
        return true;
      } catch (failure) {
        setNotice(onlineErrorMessage(failure));
        refresh();
        return false;
      }
    },
    rematch: async () => {
      if (!game) return null;
      try {
        return (await api.rematch(game.id)).code;
      } catch (failure) {
        setNotice(onlineErrorMessage(failure));
        return null;
      }
    },
    refresh,
  };
}
```

Dans `vite.config.ts`, dans `coverage.exclude`, ajouter après `'src/app/game/useGame.ts',` :
```ts
        'src/app/online/useOnlineApi.ts',
        'src/app/online/useOnlineGame.ts',
```

- [x] **Step 5 : Lancer tous les tests et le typage**

Run : `npx vitest run` puis `npx tsc -b`
Expected : PASS (dont 2 + 6 + 3 nouveaux tests ; les tests des écrans de partie existants passent toujours avec `BoardView`), aucune erreur.

- [x] **Step 6 : Commit**

```bash
git add src tests vite.config.ts
git commit -m "feat: hooks du jeu en ligne (partie suivie en direct, coups confirmés, présence) et plateau commun"
```

---
### Task 6 : Écrans du jeu en ligne, adresses et bouton « En ligne »

**Files:**
- Create: `src/app/online/OnlineFrame.tsx`, `src/app/online/PseudoForm.tsx`, `src/app/online/OnlineMenuScreen.tsx`, `src/app/online/JoinScreen.tsx`, `src/app/online/WaitingRoom.tsx`, `src/app/online/OnlineGameScreen.tsx`
- Modify: `src/app/router.ts`, `src/app/navigation.ts`, `src/app/labels.ts`, `src/app/App.tsx`, `src/app/screens/GameMenuScreen.tsx`, `src/app/components/EndDialog.tsx`, `src/styles/global.css`, `vite.config.ts` (exclusions)
- Test: `tests/unit/app/online/screens.test.tsx` (nouveau), `tests/unit/app/router.test.ts`, `tests/unit/app/labels.test.ts`, `tests/unit/app/menus.test.tsx`

**Interfaces:**
- Consumes: `useOnlineApi`, `OnlineConnection`, `useOnlineGame`, `shareInvite`, `BoardView` (Tâche 5) ; `listEntries`, `onlineStatusText` (Tâche 2) ; `normalizeCode`, `inviteLink`, `cleanPseudo`, `PSEUDO_MAX_LENGTH` (Tâche 1) ; `fakeApi` (tests, Tâche 5).
- Produces :
  - `Route` + `{ name: 'online'; game }` (`#/echecs/en-ligne`), `{ name: 'onlineGame'; game; code }` (`#/echecs/en-ligne/K7M2QX`), `{ name: 'join'; code }` (`#/rejoindre/K7M2QX`).
  - `navigation.ts` : `redirect(route)` (change d'écran sans ajouter d'entrée d'historique : le retour arrière ne rejoue pas l'invitation).
  - `EndDialog` : props optionnelles `replayLabel` (défaut « Rejouer ») et `note`.
  - Écrans : `OnlineMenuScreen`, `JoinScreen`, `OnlineGameScreen` ; composants `OnlineFrame`, `ConnectionNotice`, `PseudoForm`, `WaitingRoom`.

Libellés utilisés par les tests de bout en bout (Tâche 7) : champ « Ton pseudo », boutons « Continuer », « Créer la partie », « Rejoindre », « Rejoindre la partie », « Partager le lien », « Annuler la partie », « Proposer la nulle », « Accepter », « Refuser », « Abandonner », « Revanche », « Jouer la revanche » ; code affiché dans `.invite-code` ; présence : image « Bob est en ligne » / « Bob n'est pas en ligne ».

- [x] **Step 1 : Écrire les tests qui échouent**

**Fichier : `tests/unit/app/online/screens.test.tsx`**
```tsx
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { chessKit } from '../../../../src/app/games/chess';
import { JoinScreen } from '../../../../src/app/online/JoinScreen';
import { OnlineGameScreen } from '../../../../src/app/online/OnlineGameScreen';
import { OnlineMenuScreen } from '../../../../src/app/online/OnlineMenuScreen';
import type { OnlineConnection } from '../../../../src/app/online/useOnlineApi';
import { OnlineError } from '../../../../src/online/errors';
import { onlineGame } from '../../online/fixtures';
import { fakeApi } from './fake-api';

type Fake = ReturnType<typeof fakeApi>;

function connected(fake: Fake = fakeApi()): OnlineConnection {
  return { api: fake.api, userId: 'moi', error: null, retry: vi.fn() };
}

function menu(fake: Fake, pseudo: string | null, onNavigate = vi.fn()) {
  render(<OnlineMenuScreen game="chess" title="Échecs" connection={connected(fake)} pseudo={pseudo} onPseudo={vi.fn()} onNavigate={onNavigate} />);
  return onNavigate;
}

function gameScreen(fake: Fake, onNavigate = vi.fn()) {
  render(<OnlineGameScreen kit={chessKit} api={fake.api} userId="moi" code="K7M2QX" sound={false} onNavigate={onNavigate} />);
  return onNavigate;
}

afterEach(() => {
  delete (navigator as { clipboard?: unknown }).clipboard;
});

describe('écran « En ligne »', () => {
  it('demande d’abord un pseudo', () => {
    const onPseudo = vi.fn();
    render(<OnlineMenuScreen game="chess" title="Échecs" connection={connected()} pseudo={null} onPseudo={onPseudo} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.getByRole('alert').textContent).toBe('Le pseudo doit faire de 1 à 20 caractères.');
    fireEvent.input(screen.getByLabelText('Ton pseudo'), { target: { value: ' Alice ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(onPseudo).toHaveBeenCalledWith('Alice');
  });

  it('explique une panne et propose de réessayer', () => {
    const connection: OnlineConnection = { api: null, userId: null, error: 'Le jeu en ligne est momentanément indisponible.', retry: vi.fn() };
    render(<OnlineMenuScreen game="chess" title="Échecs" connection={connection} pseudo="Alice" onPseudo={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByRole('alert').textContent).toContain('momentanément indisponible');
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(connection.retry).toHaveBeenCalled();
  });

  it('crée une partie avec la couleur choisie', async () => {
    const fake = fakeApi(onlineGame({ status: 'attente', black: { id: null, pseudo: null } }));
    const onNavigate = menu(fake, 'Alice');
    fireEvent.click(screen.getByRole('button', { name: 'Noirs' }));
    fireEvent.click(screen.getByRole('button', { name: 'Créer la partie' }));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith({ name: 'onlineGame', game: 'chess', code: 'K7M2QX' }));
    expect(fake.api.createGame).toHaveBeenCalledWith('chess', 'black', 'Alice');
  });

  it('rejoint avec un code et refuse un code mal formé', async () => {
    const fake = fakeApi();
    const onNavigate = menu(fake, 'Bob');
    const input = screen.getByLabelText('Code de la partie');
    fireEvent.input(input, { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre' }));
    expect(screen.getByRole('alert').textContent).toBe('Le code fait 6 caractères (lettres et chiffres).');
    fireEvent.input(input, { target: { value: 'k7m 2qx' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre' }));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith({ name: 'onlineGame', game: 'chess', code: 'K7M2QX' }));
    expect(fake.api.joinGame).toHaveBeenCalledWith('K7M2QX', 'Bob');
  });

  it('affiche le refus du serveur', async () => {
    const fake = fakeApi();
    fake.api.joinGame.mockRejectedValueOnce(new OnlineError('partie_complete'));
    menu(fake, 'Bob');
    fireEvent.input(screen.getByLabelText('Code de la partie'), { target: { value: 'K7M2QX' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Cette partie a déjà ses deux joueurs.'));
  });

  it('liste mes parties, à mon tour d’abord', async () => {
    const fake = fakeApi();
    fake.api.listGames.mockResolvedValueOnce([onlineGame({ code: 'CCCCCC', moves: ['e2e4'] }), onlineGame({ code: 'BBBBBB' })]);
    const onNavigate = menu(fake, 'Alice');
    const [first, second] = await screen.findAllByRole('button', { name: /Contre Bob/ });
    expect(first.textContent).toContain('À toi de jouer');
    expect(second.textContent).toContain("C'est à Bob de jouer");
    fireEvent.click(first);
    expect(onNavigate).toHaveBeenCalledWith({ name: 'onlineGame', game: 'chess', code: 'BBBBBB' });
  });
});

describe('lien d’invitation', () => {
  it('rejoint la partie dès que le pseudo est connu', async () => {
    const fake = fakeApi();
    const onJoined = vi.fn();
    const onPseudo = vi.fn();
    const props = { code: 'K7M2QX', onPseudo, onJoined, onHome: vi.fn() };
    const view = render(<JoinScreen {...props} connection={connected(fake)} pseudo={null} />);
    fireEvent.input(screen.getByLabelText('Ton pseudo'), { target: { value: 'Bob' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre la partie' }));
    expect(onPseudo).toHaveBeenCalledWith('Bob');
    expect(fake.api.joinGame).not.toHaveBeenCalled();
    view.rerender(<JoinScreen {...props} connection={connected(fake)} pseudo="Bob" />);
    await waitFor(() => expect(onJoined).toHaveBeenCalledWith(onlineGame()));
    expect(fake.api.joinGame).toHaveBeenCalledWith('K7M2QX', 'Bob');
  });

  it('explique un code inconnu', async () => {
    const fake = fakeApi();
    fake.api.joinGame.mockRejectedValueOnce(new OnlineError('code_inconnu'));
    const onHome = vi.fn();
    render(<JoinScreen code="ZZZZZZ" connection={connected(fake)} pseudo="Bob" onPseudo={vi.fn()} onJoined={vi.fn()} onHome={onHome} />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Ce code ne correspond à aucune partie.'));
    fireEvent.click(screen.getByRole('button', { name: 'Accueil' }));
    expect(onHome).toHaveBeenCalled();
  });
});

describe('partie en ligne', () => {
  it('attend l’ami : code, partage du lien et annulation', async () => {
    const fake = fakeApi(onlineGame({ status: 'attente', black: { id: null, pseudo: null } }));
    const writeText = vi.fn(async () => undefined);
    (navigator as { clipboard?: unknown }).clipboard = { writeText };
    const onNavigate = gameScreen(fake);
    expect((await screen.findByText('K7M2QX')).className).toBe('invite-code');
    expect(screen.getByRole('status').textContent).toBe('En attente de ton ami…');
    fireEvent.click(screen.getByRole('button', { name: 'Partager le lien' }));
    await screen.findByText('Lien copié : colle-le dans un message à ton ami.');
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/#\/rejoindre\/K7M2QX$/));
    fireEvent.click(screen.getByRole('button', { name: 'Annuler la partie' }));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith({ name: 'online', game: 'chess' }));
  });

  it('montre les joueurs, la présence de l’ami et à qui est le tour', async () => {
    const fake = fakeApi(onlineGame({ moves: ['e2e4'] }));
    gameScreen(fake);
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe("C'est à Bob de jouer (hors ligne pour l'instant)"));
    expect(screen.getByRole('img', { name: "Bob n'est pas en ligne" })).toBeTruthy();
    await waitFor(() => expect(fake.watching()).toBe(true));
    act(() => fake.presence(['moi', 'ami']));
    expect(screen.getByRole('status').textContent).toBe("C'est à Bob de jouer");
    expect(screen.getByRole('img', { name: 'Bob est en ligne' })).toBeTruthy();
    expect(screen.getByText('⚪ Alice (toi)')).toBeTruthy();
  });

  it('accepte la nulle proposée par l’ami', async () => {
    const fake = fakeApi(onlineGame({ drawOfferedBy: 'black' }));
    gameScreen(fake);
    expect(await screen.findByText('Bob propose la nulle.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Accepter' }));
    expect(await screen.findByRole('dialog', { name: 'Partie nulle' })).toBeTruthy();
    expect(fake.api.answerDraw).toHaveBeenCalledWith(onlineGame().id, true);
  });

  it('abandonne après confirmation', async () => {
    const fake = fakeApi();
    gameScreen(fake);
    fireEvent.click(await screen.findByRole('button', { name: 'Abandonner' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Abandonner' }));
    await waitFor(() => expect(fake.api.resign).toHaveBeenCalledWith(onlineGame().id));
  });

  it('rejoint la revanche lancée par l’ami', async () => {
    const fake = fakeApi(onlineGame({ status: 'terminee', result: { kind: 'win', winner: 'black', reason: 'resign' }, rematchCode: 'REVAN2' }));
    const onNavigate = gameScreen(fake);
    expect(await screen.findByText('Bob lance une revanche !')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Jouer la revanche' }));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith({ name: 'onlineGame', game: 'chess', code: 'REVAN2' }));
  });

  it('explique une partie introuvable', async () => {
    const onNavigate = gameScreen(fakeApi(null));
    expect((await screen.findByRole('alert')).textContent).toBe("Cette partie n'existe plus, ou ce n'est pas la tienne.");
    fireEvent.click(screen.getByRole('button', { name: 'Mes parties en ligne' }));
    expect(onNavigate).toHaveBeenCalledWith({ name: 'online', game: 'chess' });
  });
});
```

Dans `tests/unit/app/router.test.ts`, ajouter à la fin du tableau `routes` (après la route `play` des dames) :
```ts
  { name: 'online', game: 'chess' },
  { name: 'onlineGame', game: 'draughts', code: 'K7M2QX' },
  { name: 'join', code: 'K7M2QX' },
```
et, dans `describe('routes', …)`, ajouter avant la fermeture `});` :
```ts

  it('lit les adresses du jeu en ligne', () => {
    expect(routeToHash({ name: 'join', code: 'K7M2QX' })).toBe('#/rejoindre/K7M2QX');
    expect(routeToHash({ name: 'onlineGame', game: 'chess', code: 'K7M2QX' })).toBe('#/echecs/en-ligne/K7M2QX');
    expect(parseRoute('#/rejoindre/k7m2qx')).toEqual({ name: 'join', code: 'K7M2QX' });
    expect(parseRoute('#/rejoindre/abc')).toEqual({ name: 'home' });
    expect(parseRoute('#/rejoindre')).toEqual({ name: 'home' });
    expect(parseRoute('#/dames/en-ligne/zz')).toEqual({ name: 'online', game: 'draughts' });
  });
```

Dans `tests/unit/app/labels.test.ts`, ajouter dans le test « titre l’écran de partie » :
```ts
    expect(modeTitle({ game: 'chess', mode: 'online', level: null, playerColor: 'black' })).toBe('En ligne');
```

Dans `tests/unit/app/menus.test.tsx`, ajouter dans `describe('menu d’un jeu', …)`, avant sa fermeture `});` :
```tsx

  it('ouvre le jeu en ligne', () => {
    const onNavigate = vi.fn();
    render(<GameMenuScreen game="draughts" title="Dames" onNavigate={onNavigate} hasSavedGame={false} completedCount={0} totalLessons={12} notice={null} />);
    fireEvent.click(screen.getByRole('button', { name: /En ligne/ }));
    expect(onNavigate).toHaveBeenCalledWith({ name: 'online', game: 'draughts' });
  });
```

- [x] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run tests/unit/app`
Expected : FAIL — écrans en ligne introuvables, routes et libellé « En ligne » absents, bouton « En ligne » désactivé.

- [x] **Step 3 : Adresses, navigation, libellé, bouton « En ligne » et boîte de fin**

Dans `src/app/router.ts` :
- ajouter l'import `import { normalizeCode } from '../online/code';` après `import { GAME_IDS, LEVELS_ORDER, type GameId } from '../core/types';` ;
- remplacer `  | { readonly name: 'resume'; readonly game: GameId };` par :
```ts
  | { readonly name: 'resume'; readonly game: GameId }
  | { readonly name: 'online'; readonly game: GameId }
  | { readonly name: 'onlineGame'; readonly game: GameId; readonly code: string }
  | { readonly name: 'join'; readonly code: string };
```
- remplacer `  if (first === 'reglages') return { name: 'settings' };` par :
```ts
  if (first === 'reglages') return { name: 'settings' };
  if (first === 'rejoindre') {
    const code = normalizeCode(second ?? '');
    return code ? { name: 'join', code } : HOME;
  }
```
- remplacer `  if (second === 'reprendre') return { name: 'resume', game };` par :
```ts
  if (second === 'reprendre') return { name: 'resume', game };
  if (second === 'en-ligne') {
    const code = normalizeCode(third ?? '');
    return code ? { name: 'onlineGame', game, code } : { name: 'online', game };
  }
```
- dans `routeToHash`, ajouter après le `case 'resume': …` :
```ts
    case 'online':
      return `#/${SEGMENTS[route.game]}/en-ligne`;
    case 'onlineGame':
      return `#/${SEGMENTS[route.game]}/en-ligne/${route.code}`;
    case 'join':
      return `#/rejoindre/${route.code}`;
```

Dans `src/app/navigation.ts`, ajouter à la fin :
```ts

/** Change d'écran en remplaçant l'entrée d'historique : le retour arrière ne revient pas ici. */
export function redirect(route: Route): void {
  window.location.replace(routeToHash(route));
}
```

Dans `src/app/labels.ts`, remplacer le corps de `modeTitle` par :
```ts
  if (setup.mode === 'online') return 'En ligne';
  return setup.mode === 'ai' && setup.level ? `Contre l'ordinateur · ${LEVEL_LABELS[setup.level].name}` : '2 joueurs';
```

Dans `src/app/screens/GameMenuScreen.tsx`, remplacer :
```tsx
      <button type="button" class="btn" disabled>
        En ligne
        <span class="sub">Bientôt disponible</span>
      </button>
```
par :
```tsx
      <button type="button" class="btn" onClick={() => onNavigate({ name: 'online', game })}>
        En ligne
        <span class="sub">Contre un ami, avec un code ou un lien</span>
      </button>
```

**Fichier : `src/app/components/EndDialog.tsx`**
```tsx
import type { ResultText } from '../../core/explain';

interface EndDialogProps {
  readonly result: ResultText;
  readonly onReplay: () => void;
  readonly onMenu: () => void;
  readonly onClose: () => void;
  readonly onUndo?: () => void;
  readonly replayLabel?: string;
  /** Information en plus (ex. « Marie lance une revanche ! »). */
  readonly note?: string;
}

export function EndDialog({ result, onReplay, onMenu, onClose, onUndo, replayLabel = 'Rejouer', note }: EndDialogProps) {
  return (
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="end-title">
      <div class="modal">
        <h2 id="end-title">{result.title}</h2>
        {result.detail && <p>{result.detail}</p>}
        {note && <p class="feedback feedback-info">{note}</p>}
        <button type="button" class="btn btn-primary" onClick={onReplay}>
          {replayLabel}
        </button>
        {onUndo && (
          <button type="button" class="btn btn-small" onClick={onUndo}>
            Annuler mon dernier coup
          </button>
        )}
        <div class="actions">
          <button type="button" class="btn btn-small" onClick={onClose}>
            Voir le plateau
          </button>
          <button type="button" class="btn btn-small" onClick={onMenu}>
            Menu
          </button>
        </div>
      </div>
    </div>
  );
}
```

Dans `src/styles/global.css`, après la ligne `.text-input:focus { … }` (Tâche 1), ajouter :
```css
.invite-code { margin: 0; font-family: ui-monospace, 'Cascadia Mono', monospace; font-size: 2rem; font-weight: 700; letter-spacing: 0.2em; text-align: center; }
.players { display: flex; justify-content: space-between; gap: 8px; margin: 0; font-weight: 600; }
.presence { display: inline-block; width: 10px; height: 10px; margin-right: 6px; border-radius: 50%; background: var(--muted); }
.presence-on { background: var(--success); }
```

Dans `vite.config.ts`, dans `coverage.exclude`, ajouter après `'src/app/online/useOnlineGame.ts',` (Tâche 5) :
```ts
        'src/app/online/*.tsx',
```

- [x] **Step 4 : Écrire le cadre, le pseudo et l'écran « En ligne »**

**Fichier : `src/app/online/OnlineFrame.tsx`**
```tsx
import type { ComponentChildren } from 'preact';
import type { OnlineConnection } from './useOnlineApi';

interface OnlineFrameProps {
  readonly title: string;
  readonly backLabel: string;
  readonly onBack: () => void;
  readonly children: ComponentChildren;
}

/** Cadre commun des écrans en ligne : barre du haut avec retour. */
export function OnlineFrame({ title, backLabel, onBack, children }: OnlineFrameProps) {
  return (
    <section class="screen">
      <header class="topbar">
        <button type="button" class="back" aria-label={backLabel} onClick={onBack}>
          ←
        </button>
        <h1>{title}</h1>
      </header>
      {children}
    </section>
  );
}

/** Tant que le serveur n'est pas prêt : « Connexion… », ou l'erreur avec « Réessayer ». */
export function ConnectionNotice({ connection }: { readonly connection: OnlineConnection }) {
  if (!connection.error) {
    return (
      <p class="status-line" role="status">
        Connexion au jeu en ligne…
      </p>
    );
  }
  return (
    <div class="banner" role="alert">
      <span>{connection.error}</span>
      <button type="button" class="btn btn-small" onClick={connection.retry}>
        Réessayer
      </button>
    </div>
  );
}
```

**Fichier : `src/app/online/PseudoForm.tsx`**
```tsx
import { useState } from 'preact/hooks';
import { PSEUDO_MAX_LENGTH, cleanPseudo } from '../settings';

interface PseudoFormProps {
  readonly submitLabel: string;
  readonly onSubmit: (pseudo: string) => void;
}

/** Premier passage en ligne : le pseudo que verra l'ami (gardé ensuite dans les réglages). */
export function PseudoForm({ submitLabel, onSubmit }: PseudoFormProps) {
  const [value, setValue] = useState('');
  const [invalid, setInvalid] = useState(false);

  const submit = (event: Event) => {
    event.preventDefault();
    const pseudo = cleanPseudo(value);
    if (pseudo) onSubmit(pseudo);
    else setInvalid(true);
  };

  return (
    <form class="card" onSubmit={submit}>
      <label for="pseudo-en-ligne">Ton pseudo</label>
      <p class="muted">Ton ami le verra pendant la partie. Tu pourras le changer dans les réglages.</p>
      <input
        id="pseudo-en-ligne"
        class="text-input"
        type="text"
        maxLength={PSEUDO_MAX_LENGTH}
        value={value}
        onInput={(event) => {
          setValue(event.currentTarget.value);
          setInvalid(false);
        }}
      />
      {invalid && (
        <p class="feedback feedback-error" role="alert">
          Le pseudo doit faire de 1 à 20 caractères.
        </p>
      )}
      <button type="submit" class="btn btn-primary">
        {submitLabel}
      </button>
    </form>
  );
}
```

**Fichier : `src/app/online/OnlineMenuScreen.tsx`**
```tsx
import { useEffect, useState } from 'preact/hooks';
import type { GameId } from '../../core/types';
import type { OnlineApi } from '../../online/api';
import { normalizeCode } from '../../online/code';
import { onlineErrorMessage } from '../../online/errors';
import type { OnlineGame } from '../../online/types';
import { COLOR_CHOICES, resolveColor, type ColorChoice } from '../menu';
import type { Route } from '../router';
import { ConnectionNotice, OnlineFrame } from './OnlineFrame';
import { PseudoForm } from './PseudoForm';
import type { OnlineConnection } from './useOnlineApi';
import { listEntries } from './view';

interface OnlineMenuScreenProps {
  readonly game: GameId;
  readonly title: string;
  readonly connection: OnlineConnection;
  readonly pseudo: string | null;
  readonly onPseudo: (pseudo: string) => void;
  readonly onNavigate: (route: Route) => void;
}

/** Écran « En ligne » d'un jeu : pseudo au premier passage, puis créer, rejoindre, reprendre. */
export function OnlineMenuScreen({ game, title, connection, pseudo, onPseudo, onNavigate }: OnlineMenuScreenProps) {
  const { api, userId } = connection;
  let content;
  if (pseudo === null) content = <PseudoForm submitLabel="Continuer" onSubmit={onPseudo} />;
  else if (api && userId) content = <OnlineMenu game={game} api={api} userId={userId} pseudo={pseudo} onNavigate={onNavigate} />;
  else content = <ConnectionNotice connection={connection} />;
  return (
    <OnlineFrame title={`${title} en ligne`} backLabel="Retour au menu" onBack={() => onNavigate({ name: 'menu', game })}>
      {content}
    </OnlineFrame>
  );
}

interface OnlineMenuProps {
  readonly game: GameId;
  readonly api: OnlineApi;
  readonly userId: string;
  readonly pseudo: string;
  readonly onNavigate: (route: Route) => void;
}

function OnlineMenu({ game, api, userId, pseudo, onNavigate }: OnlineMenuProps) {
  const [color, setColor] = useState<ColorChoice>('white');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<readonly OnlineGame[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .listGames(game)
      .then((found) => {
        if (alive) setGames(found);
      })
      .catch((failure: unknown) => {
        if (alive) setListError(onlineErrorMessage(failure));
      });
    return () => {
      alive = false;
    };
  }, [api, game]);

  const open = (target: OnlineGame) => onNavigate({ name: 'onlineGame', game: target.game, code: target.code });

  const run = (action: () => Promise<OnlineGame>) => {
    setBusy(true);
    setError(null);
    action()
      .then(open)
      .catch((failure: unknown) => {
        setError(onlineErrorMessage(failure));
        setBusy(false);
      });
  };

  const join = (event: Event) => {
    event.preventDefault();
    const normalized = normalizeCode(code);
    if (normalized) run(() => api.joinGame(normalized, pseudo));
    else setError('Le code fait 6 caractères (lettres et chiffres).');
  };

  return (
    <>
      <p class="muted">Tu joues sous le pseudo « {pseudo} » (modifiable dans les réglages).</p>
      {error && (
        <p class="feedback feedback-error" role="alert">
          {error}
        </p>
      )}
      <div class="card">
        <h2>Créer une partie</h2>
        <div class="choices" role="group" aria-label="Couleur">
          {COLOR_CHOICES.map((choice) => (
            <button type="button" key={choice.value} class="choice" aria-pressed={color === choice.value} onClick={() => setColor(choice.value)}>
              {choice.label}
            </button>
          ))}
        </div>
        <button type="button" class="btn btn-primary" disabled={busy} onClick={() => run(() => api.createGame(game, resolveColor(color), pseudo))}>
          Créer la partie
        </button>
      </div>
      <form class="card" onSubmit={join}>
        <h2>Rejoindre avec un code</h2>
        <label for="code-partie">Code de la partie</label>
        <input id="code-partie" class="text-input" type="text" maxLength={9} value={code} onInput={(event) => setCode(event.currentTarget.value)} />
        <button type="submit" class="btn btn-primary" disabled={busy}>
          Rejoindre
        </button>
      </form>
      <div class="card">
        <h2>Mes parties en ligne</h2>
        {listError && <p class="feedback feedback-error">{listError}</p>}
        {!listError && games === null && <p class="muted">Chargement…</p>}
        {games?.length === 0 && <p class="muted">Aucune partie pour l'instant.</p>}
        {games &&
          listEntries(games, userId).map((entry) => (
            <button type="button" key={entry.game.id + entry.game.code} class="btn" onClick={() => open(entry.game)}>
              {entry.label}
              <span class="sub">{entry.detail}</span>
            </button>
          ))}
      </div>
    </>
  );
}
```

- [x] **Step 5 : Écrire l'invitation, l'attente et l'écran de partie**

**Fichier : `src/app/online/JoinScreen.tsx`**
```tsx
import { useEffect, useState } from 'preact/hooks';
import { onlineErrorMessage } from '../../online/errors';
import type { OnlineGame } from '../../online/types';
import { ConnectionNotice, OnlineFrame } from './OnlineFrame';
import { PseudoForm } from './PseudoForm';
import type { OnlineConnection } from './useOnlineApi';

interface JoinScreenProps {
  readonly code: string;
  readonly connection: OnlineConnection;
  readonly pseudo: string | null;
  readonly onPseudo: (pseudo: string) => void;
  readonly onJoined: (game: OnlineGame) => void;
  readonly onHome: () => void;
}

/** Lien d'invitation : pseudo si besoin, puis arrivée dans la partie (ou dans la sienne si on y joue déjà). */
export function JoinScreen({ code, connection, pseudo, onPseudo, onJoined, onHome }: JoinScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const { api } = connection;

  useEffect(() => {
    if (!api || pseudo === null) return undefined;
    let alive = true;
    api
      .joinGame(code, pseudo)
      .then((game) => {
        if (alive) onJoined(game);
      })
      .catch((failure: unknown) => {
        if (alive) setError(onlineErrorMessage(failure));
      });
    return () => {
      alive = false;
    };
  }, [api, pseudo, code]);

  let content;
  if (pseudo === null) content = <PseudoForm submitLabel="Rejoindre la partie" onSubmit={onPseudo} />;
  else if (error) {
    content = (
      <>
        <p class="feedback feedback-error" role="alert">
          {error}
        </p>
        <button type="button" class="btn" onClick={onHome}>
          Accueil
        </button>
      </>
    );
  } else if (api) {
    content = (
      <p class="status-line" role="status">
        Arrivée dans la partie…
      </p>
    );
  } else content = <ConnectionNotice connection={connection} />;

  return (
    <OnlineFrame title="Rejoindre une partie" backLabel="Retour à l'accueil" onBack={onHome}>
      <p class="invite-code">{code}</p>
      {content}
    </OnlineFrame>
  );
}
```

**Fichier : `src/app/online/WaitingRoom.tsx`**
```tsx
import { useState } from 'preact/hooks';
import { inviteLink } from '../../online/code';
import { shareInvite, type ShareOutcome } from './share';

interface WaitingRoomProps {
  readonly code: string;
  readonly title: string;
  readonly onCancel: () => void;
}

const SHARE_FEEDBACK: Readonly<Record<ShareOutcome, string | null>> = {
  shared: null,
  cancelled: null,
  copied: 'Lien copié : colle-le dans un message à ton ami.',
  failed: "Le partage n'a pas marché : donne le code à ton ami.",
};

/** Partie créée, ami pas encore arrivé : le code, le lien à partager, l'annulation. */
export function WaitingRoom({ code, title, onCancel }: WaitingRoomProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const share = () => {
    void shareInvite(inviteLink(window.location.href, code), title).then((outcome) => setFeedback(SHARE_FEEDBACK[outcome]));
  };
  return (
    <div class="card">
      <h2>Invite ton ami</h2>
      <p class="muted">Donne-lui ce code, ou envoie-lui le lien :</p>
      <p class="invite-code">{code}</p>
      <button type="button" class="btn btn-primary" onClick={share}>
        Partager le lien
      </button>
      {feedback && (
        <p class="feedback feedback-info" aria-live="polite">
          {feedback}
        </p>
      )}
      <p class="muted">La partie commence dès que ton ami la rejoint.</p>
      <button type="button" class="btn btn-small btn-danger" onClick={onCancel}>
        Annuler la partie
      </button>
    </div>
  );
}
```

**Fichier : `src/app/online/OnlineGameScreen.tsx`**
```tsx
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import type { MoveShape } from '../../board/move-input';
import { opposite, type Color } from '../../core/types';
import type { OnlineApi } from '../../online/api';
import type { OnlineGame } from '../../online/types';
import { BoardView } from '../components/BoardView';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EndDialog } from '../components/EndDialog';
import { currentPosition, lastMove } from '../game/session';
import type { GameKit } from '../games/kit';
import type { Route } from '../router';
import { OnlineFrame } from './OnlineFrame';
import { useOnlineGame, type OnlineGameController } from './useOnlineGame';
import { onlineStatusText } from './view';
import { WaitingRoom } from './WaitingRoom';

interface OnlineGameScreenProps<Pos, Move extends MoveShape> {
  readonly kit: GameKit<Pos, Move>;
  readonly api: OnlineApi;
  readonly userId: string;
  readonly code: string;
  readonly sound: boolean;
  readonly onNavigate: (route: Route) => void;
}

interface PlayersProps {
  readonly game: OnlineGame;
  readonly myColor: Color | null;
  readonly opponentOnline: boolean;
}

/** « ⚪ Alice (toi) … ● ⚫ Bob » : le point vert indique que l'ami a l'app ouverte sur cette partie. */
function Players({ game, myColor, opponentOnline }: PlayersProps) {
  const opponent = opposite(myColor ?? 'white');
  const seat = (color: Color) => (color === 'white' ? game.white : game.black);
  const name = (color: Color) => seat(color).pseudo ?? '…';
  return (
    <p class="players">
      {(['white', 'black'] as const).map((color) => (
        <span key={color}>
          {color === opponent && seat(color).id !== null && (
            <span
              class={opponentOnline ? 'presence presence-on' : 'presence'}
              role="img"
              aria-label={opponentOnline ? `${name(color)} est en ligne` : `${name(color)} n'est pas en ligne`}
            />
          )}
          {`${color === 'white' ? '⚪' : '⚫'} ${name(color)}${color === myColor ? ' (toi)' : ''}`}
        </span>
      ))}
    </p>
  );
}

function statusLine<Pos, Move extends MoveShape>(kit: GameKit<Pos, Move>, online: OnlineGameController<Pos, Move>): string {
  const { game, view } = online;
  if (!game || !view) return '';
  const text = onlineStatusText(game, view, { connected: online.connected, opponentOnline: online.opponentOnline });
  if (text === 'Partie terminée') return kit.explainResult(view.result, view.myColor).title;
  const inCheck = text === 'À toi de jouer' && kit.checkSquare(currentPosition(view.session)) !== null;
  return inCheck ? 'À toi de jouer : ton roi est en échec !' : text;
}

export function OnlineGameScreen<Pos, Move extends MoveShape>(props: OnlineGameScreenProps<Pos, Move>) {
  const { kit, onNavigate } = props;
  const online = useOnlineGame(kit, props.api, props.userId, props.code, props.sound);
  const [confirmResign, setConfirmResign] = useState(false);
  const [endDismissed, setEndDismissed] = useState(false);
  const { game, view } = online;
  const toList = () => onNavigate({ name: 'online', game: kit.id });
  const frame = (content: ComponentChildren) => (
    <OnlineFrame title={`${kit.title} en ligne`} backLabel="Retour à mes parties" onBack={toList}>
      {content}
    </OnlineFrame>
  );

  if (online.error) {
    return frame(
      <>
        <p class="feedback feedback-error" role="alert">
          {online.error}
        </p>
        <button type="button" class="btn" onClick={toList}>
          Mes parties en ligne
        </button>
      </>,
    );
  }
  if (!game || !view) {
    return frame(
      <p class="status-line" role="status">
        Chargement de la partie…
      </p>,
    );
  }

  const finished = game.status === 'terminee';
  const dialogOpen = finished && !endDismissed;
  const playing = game.status === 'en_cours';
  const offerFromFriend = playing && game.drawOfferedBy !== null && game.drawOfferedBy !== view.myColor;
  const rematch = () => {
    void online.rematch().then((code) => {
      if (code) onNavigate({ name: 'onlineGame', game: kit.id, code });
    });
  };
  const cancel = () => {
    void online.cancel().then((done) => {
      if (done) toList();
    });
  };
  const status = (
    <p class="status-line" role="status">
      {statusLine(kit, online)}
    </p>
  );

  if (game.status === 'attente') {
    return frame(
      <>
        {status}
        <WaitingRoom code={game.code} title={kit.title} onCancel={cancel} />
      </>,
    );
  }

  return frame(
    <>
      <Players game={game} myColor={view.myColor} opponentOnline={online.opponentOnline} />
      <BoardView
        kit={kit}
        position={currentPosition(view.session)}
        bottom={view.myColor ?? 'white'}
        legal={online.legal}
        input={online.input.input}
        last={lastMove(view.session)}
        choices={online.input.choices}
        onTap={online.input.tap}
        onDrop={online.input.drop}
        onChoose={online.input.choose}
        onCancelChoice={online.input.cancelChoice}
      />
      {status}
      {online.notice && (
        <p class="feedback feedback-info" role="alert">
          {online.notice}
        </p>
      )}
      {offerFromFriend && (
        <div class="card">
          <p>{view.opponentName} propose la nulle.</p>
          <div class="actions">
            <button type="button" class="btn btn-small btn-primary" disabled={online.busy} onClick={() => online.answerDraw(true)}>
              Accepter
            </button>
            <button type="button" class="btn btn-small" disabled={online.busy} onClick={() => online.answerDraw(false)}>
              Refuser
            </button>
          </div>
        </div>
      )}
      {playing && game.drawOfferedBy === view.myColor && (
        <p class="feedback feedback-info">Nulle proposée : {view.opponentName} peut accepter ou refuser.</p>
      )}
      {!dialogOpen && (
        <div class="actions">
          {playing && (
            <button
              type="button"
              class="btn btn-small"
              onClick={online.offerDraw}
              disabled={online.busy || !online.connected || game.drawOfferedBy !== null || view.invalidMove}
            >
              Proposer la nulle
            </button>
          )}
          {playing && (
            <button type="button" class="btn btn-small btn-danger" onClick={() => setConfirmResign(true)} disabled={online.busy || !online.connected}>
              Abandonner
            </button>
          )}
          {finished && (
            <button type="button" class="btn btn-small btn-primary" onClick={rematch}>
              {game.rematchCode ? 'Jouer la revanche' : 'Revanche'}
            </button>
          )}
          <button type="button" class="btn btn-small" onClick={toList}>
            Menu
          </button>
        </div>
      )}
      {confirmResign && (
        <ConfirmDialog
          title="Abandonner ?"
          message="Tu perdras la partie."
          confirmLabel="Abandonner"
          cancelLabel="Continuer à jouer"
          onConfirm={() => {
            setConfirmResign(false);
            online.resign();
          }}
          onCancel={() => setConfirmResign(false)}
        />
      )}
      {dialogOpen && (
        <EndDialog
          result={kit.explainResult(view.result, view.myColor)}
          replayLabel={game.rematchCode ? 'Jouer la revanche' : 'Revanche'}
          note={game.rematchCode ? `${view.opponentName} lance une revanche !` : undefined}
          onReplay={rematch}
          onMenu={toList}
          onClose={() => setEndDismissed(true)}
        />
      )}
    </>,
  );
}
```

- [x] **Step 6 : Brancher les écrans dans l'app**

Dans `src/app/App.tsx` :
- remplacer `import { useMemo, useState } from 'preact/hooks';` par `import { useMemo, useRef, useState } from 'preact/hooks';` ;
- remplacer `import { navigate, useRoute } from './navigation';` par :
```tsx
import { navigate, redirect, useRoute } from './navigation';
import { JoinScreen } from './online/JoinScreen';
import { ConnectionNotice, OnlineFrame } from './online/OnlineFrame';
import { OnlineGameScreen } from './online/OnlineGameScreen';
import { OnlineMenuScreen } from './online/OnlineMenuScreen';
import { useOnlineApi } from './online/useOnlineApi';
```
- remplacer `type GameRoute = Exclude<Route, { readonly name: 'home' } | { readonly name: 'settings' }>;` par :
```tsx
type GameRoute = Exclude<Route, { readonly name: 'home' } | { readonly name: 'settings' } | { readonly name: 'join' }>;

const ONLINE_ROUTES: readonly Route['name'][] = ['online', 'onlineGame', 'join'];
```
- après la ligne `const { route, version } = useRoute();`, ajouter :
```tsx
  // Le client du jeu en ligne n'est chargé qu'au premier écran en ligne, puis gardé.
  const onlineUsed = useRef(false);
  if (ONLINE_ROUTES.includes(route.name)) onlineUsed.current = true;
  const connection = useOnlineApi(onlineUsed.current);
```
- après la fonction `updateSettings`, ajouter :
```tsx

  const setPseudo = (pseudo: string) => updateSettings({ ...settings, pseudo });
```
- dans le `switch (current.name)` de `renderGame`, ajouter après le `case 'resume': …` :
```tsx
      case 'online':
        return (
          <OnlineMenuScreen game={kit.id} title={kit.title} connection={connection} pseudo={settings.pseudo} onPseudo={setPseudo} onNavigate={go} />
        );
      case 'onlineGame':
        if (!connection.api || !connection.userId) {
          return (
            <OnlineFrame title={`${kit.title} en ligne`} backLabel="Retour à mes parties" onBack={() => go({ name: 'online', game: kit.id })}>
              <ConnectionNotice connection={connection} />
            </OnlineFrame>
          );
        }
        return (
          <OnlineGameScreen
            key={`${current.code}-${version}`}
            kit={kit}
            api={connection.api}
            userId={connection.userId}
            code={current.code}
            sound={settings.sound}
            onNavigate={go}
          />
        );
```
- remplacer `  if (route.name === 'settings') {` par :
```tsx
  if (route.name === 'join') {
    return (
      <JoinScreen
        code={route.code}
        connection={connection}
        pseudo={settings.pseudo}
        onPseudo={setPseudo}
        onJoined={(joined) => redirect({ name: 'onlineGame', game: joined.game, code: joined.code })}
        onHome={() => go({ name: 'home' })}
      />
    );
  }
  if (route.name === 'settings') {
```

- [x] **Step 7 : Lancer tous les tests, le typage et le build**

Run : `npx vitest run` puis `npx tsc -b` puis `npm run build`
Expected : PASS (dont 13 tests d'écrans en ligne, 3 routes et 1 test d'adresses de plus, libellé et bouton « En ligne »), aucune erreur de typage, build réussi.

- [x] **Step 8 : Vérifier dans le navigateur**

Lancer le serveur de développement (`jeux-dev`), ouvrir `http://localhost:5173/#/echecs`, toucher « En ligne », choisir un pseudo, créer une partie : le code s'affiche. Ouvrir un second onglet sur `#/rejoindre/<code>` avec un autre pseudo : les deux onglets partagent la même session anonyme (même stockage), donc l'arrivée mène simplement à la partie de l'onglet 1 — c'est attendu ; le vrai test à deux joueurs est la Tâche 7. Vérifier l'absence d'erreur dans la console.

- [x] **Step 9 : Commit**

```bash
git add src tests vite.config.ts
git commit -m "feat: écrans du jeu en ligne (créer, rejoindre, inviter, jouer, nulle, revanche)"
```

---

### Task 7 : Deux téléphones de bout en bout contre le vrai serveur

**Files:**
- Create: `playwright.online.config.ts`, `tests/e2e-online/online.spec.ts`
- Modify: `package.json` (script `e2e:online`), `tsconfig.node.json` (inclure la configuration)

**Interfaces:**
- Consumes: les libellés des écrans (Tâche 6), `play` de `tests/e2e/helpers.ts`, le projet Supabase et `.env.local` (Tâche 4).
- Produces : `npm run e2e:online`.

Chaque téléphone est un contexte Playwright séparé (stockage séparé : deux joueurs anonymes différents). La coupure réseau utilise `context.setOffline`.

- [x] **Step 1 : Écrire la configuration et le scénario**

**Fichier : `playwright.online.config.ts`**
```ts
import { defineConfig, devices } from '@playwright/test';

/** Deux téléphones contre le vrai projet Supabase (clés lues dans `.env.local` au build) : à lancer à la demande. */
export default defineConfig({
  testDir: 'tests/e2e-online',
  timeout: 180_000,
  expect: { timeout: 20_000 },
  workers: 1,
  reporter: 'list',
  use: { ...devices['Pixel 7'], baseURL: 'http://localhost:4174', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4174 --strictPort',
    url: 'http://localhost:4174',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
```

Dans `package.json`, ajouter après la ligne `"e2e": "playwright test",` :
```json
    "e2e:online": "playwright test --config playwright.online.config.ts",
```
Dans `tsconfig.node.json`, ajouter `"playwright.online.config.ts"` à la liste `include`.

**Fichier : `tests/e2e-online/online.spec.ts`**
```ts
import { devices, expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { play } from '../e2e/helpers';

interface Phone {
  readonly page: Page;
  readonly context: BrowserContext;
}

async function phone(browser: Browser): Promise<Phone> {
  const context = await browser.newContext({ ...devices['Pixel 7'], baseURL: 'http://localhost:4174' });
  return { context, page: await context.newPage() };
}

async function choosePseudo(page: Page, pseudo: string, button: string): Promise<void> {
  await page.getByLabel('Ton pseudo').fill(pseudo);
  await page.getByRole('button', { name: button }).click();
}

test('deux amis jouent une partie complète, coupure réseau comprise', async ({ browser }) => {
  const alice = await phone(browser);
  const bob = await phone(browser);

  // Alice crée une partie avec les Blancs et récupère le code.
  await alice.page.goto('/#/echecs/en-ligne');
  await choosePseudo(alice.page, 'Alice', 'Continuer');
  await alice.page.getByRole('button', { name: 'Blancs' }).click();
  await alice.page.getByRole('button', { name: 'Créer la partie' }).click();
  await expect(alice.page.getByRole('status')).toHaveText('En attente de ton ami…');
  const code = ((await alice.page.locator('.invite-code').textContent()) ?? '').trim();
  expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);

  // Bob ouvre le lien d'invitation ; Alice passe directement dans la partie.
  await bob.page.goto(`/#/rejoindre/${code}`);
  await choosePseudo(bob.page, 'Bob', 'Rejoindre la partie');
  await expect(bob.page.getByRole('status')).toHaveText(/^C'est à Alice de jouer/);
  await expect(alice.page.getByRole('status')).toHaveText('À toi de jouer');
  await expect(alice.page.getByRole('img', { name: 'Bob est en ligne' })).toBeVisible();
  await expect(bob.page.getByRole('img', { name: 'Alice est en ligne' })).toBeVisible();

  // Les coups arrivent en direct.
  await play(alice.page, 'e2', 'e4');
  await expect(bob.page.locator('[data-piece="e4"]')).toHaveAttribute('aria-label', 'Pion blanc');
  await play(bob.page, 'e7', 'e5');
  await expect(alice.page.getByRole('status')).toHaveText('À toi de jouer');

  // Coupure réseau de Bob : le coup d'Alice l'attend à son retour.
  await bob.context.setOffline(true);
  await expect(bob.page.getByRole('status')).toHaveText('Connexion perdue, reconnexion…');
  await play(alice.page, 'g1', 'f3');
  await bob.context.setOffline(false);
  await expect(bob.page.locator('[data-piece="f3"]')).toHaveAttribute('aria-label', 'Cavalier blanc');
  await expect(bob.page.getByRole('status')).toHaveText('À toi de jouer');

  // Nulle refusée, puis proposée par Bob et acceptée par Alice.
  await play(bob.page, 'b8', 'c6');
  await expect(alice.page.getByRole('status')).toHaveText('À toi de jouer');
  await alice.page.getByRole('button', { name: 'Proposer la nulle' }).click();
  await bob.page.getByRole('button', { name: 'Refuser' }).click();
  await expect(alice.page.getByText(/Nulle proposée/)).toBeHidden();
  await bob.page.getByRole('button', { name: 'Proposer la nulle' }).click();
  await alice.page.getByRole('button', { name: 'Accepter' }).click();
  await expect(alice.page.getByRole('dialog', { name: 'Partie nulle' })).toBeVisible();
  await expect(bob.page.getByRole('dialog', { name: 'Partie nulle' })).toBeVisible();

  // Revanche : couleurs inversées, les deux arrivent sur la même partie.
  await alice.page.getByRole('button', { name: 'Revanche' }).click();
  await expect(alice.page.getByRole('status')).toHaveText(/^C'est à Bob de jouer/);
  await expect(bob.page.getByText('Alice lance une revanche !')).toBeVisible();
  await bob.page.getByRole('button', { name: 'Jouer la revanche' }).click();
  await expect(bob.page.getByRole('status')).toHaveText('À toi de jouer');
  await play(bob.page, 'd2', 'd4');
  await expect(alice.page.locator('[data-piece="d4"]')).toHaveAttribute('aria-label', 'Pion blanc');
  await expect(alice.page.getByRole('status')).toHaveText('À toi de jouer');

  await alice.context.close();
  await bob.context.close();
});
```

- [x] **Step 2 : Lancer le scénario**

Run : `npm run e2e:online`
Expected : 1 test PASS. En cas d'échec, lire la trace (`npx playwright show-trace test-results/…/trace.zip`) et corriger le code de l'app, pas le scénario (sauf libellé erroné dans le scénario).

- [x] **Step 3 : Vérifier que les scénarios hors ligne restent verts**

Run : `npm run e2e`
Expected : 10 tests PASS.

- [x] **Step 4 : Commit**

```bash
git add playwright.online.config.ts tests/e2e-online package.json tsconfig.node.json
git commit -m "test: deux téléphones en ligne de bout en bout (invitation, direct, coupure, nulle, revanche)"
```

---

### Task 8 : Mise en ligne sur GitHub Pages

**Files:**
- Create: `.github/workflows/pages.yml`
- Modify: `vite.config.ts` (base de publication, manifeste)

**Interfaces:**
- Consumes: tout ce qui précède ; variables du dépôt `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Produces : l'app en ligne à `https://jeaneveillard.github.io/Jeux-KZO/` ; CI (typage, tests, build) sur chaque Pull Request.

- [x] **Step 1 : Base de publication configurable**

Dans `vite.config.ts` :
- remplacer `export default defineConfig({` par :
```ts
/** `/Jeux-KZO/` pour GitHub Pages (variable BASE_PATH), `/` en local et pour les tests. */
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
```
- supprimer la ligne `        start_url: '/',` du manifeste (le module PWA prend alors la base comme adresse de départ et comme portée).

- [x] **Step 2 : Vérifier le build publié sous `/Jeux-KZO/`**

Run (Bash ; sous Git Bash pour Windows, préfixer `MSYS_NO_PATHCONV=1` pour que `/Jeux-KZO/` ne soit pas converti en chemin disque) : `BASE_PATH=/Jeux-KZO/ npm run build && grep -o '"start_url":"[^"]*"' dist/manifest.webmanifest && grep -o 'href="/Jeux-KZO/[^"]*"' dist/index.html | head -3`
Expected : `"start_url":"/Jeux-KZO/"`, et les liens de `index.html` commencent par `/Jeux-KZO/`.

Puis servir ce build : `BASE_PATH=/Jeux-KZO/ npx vite preview --port 4175 --strictPort` (en arrière-plan) et ouvrir `http://localhost:4175/Jeux-KZO/` dans le navigateur intégré : l'accueil s'affiche, une partie contre l'ordinateur au niveau Moyen répond à `e2e4` (Stockfish trouvé sous la base), la console ne montre pas d'erreur 404. Arrêter le serveur, puis `npm run build` pour remettre un build standard.

- [x] **Step 3 : Écrire le flux GitHub Actions**

**Fichier : `.github/workflows/pages.yml`**
```yaml
name: Tests et mise en ligne

on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: pages-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npx tsc -b
      - run: npm run test:coverage
      - run: npm run build
        env:
          BASE_PATH: /Jeux-KZO/
          VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ vars.VITE_SUPABASE_PUBLISHABLE_KEY }}
      - if: github.event_name != 'pull_request'
        uses: actions/upload-pages-artifact@v5
        with:
          path: dist

  deploy:
    if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

- [x] **Step 4 : Tests complets, puis commit**

Run : `npx tsc -b` puis `npm run test:coverage` puis `npm run build`
Expected : PASS, couverture ≥ 80 %, build réussi.

```bash
git add vite.config.ts .github
git commit -m "ci: tests sur chaque Pull Request et mise en ligne sur GitHub Pages"
```

- [ ] **Step 5 : Pousser et ouvrir la Pull Request**

```bash
git push -u origin etape3-en-ligne
gh pr create --base main --head etape3-en-ligne --title "Étape 3 : jeu en ligne entre amis" --body-file <résumé rédigé : fonctions, tests, plan de test>
```
Attendre le résultat du flux sur la Pull Request (`gh pr checks`) : le job `build` doit être vert (le job `deploy` est ignoré sur une Pull Request).

- [ ] **Step 6 : Rendre le dépôt public et activer GitHub Pages** (actions sur le compte de l'utilisateur : **demander confirmation d'abord**)

Avant de demander : rechercher des secrets dans tout l'historique :
```bash
git log -p --all | grep -nE "sb_secret_|service_role|SUPABASE_SERVICE|eyJhbGciOi|ghp_|github_pat_" | head
```
Expected : aucune ligne.

Après confirmation :
```bash
gh repo edit Jeaneveillard/Jeux-KZO --visibility public --accept-visibility-change-consequences
gh api -X POST repos/Jeaneveillard/Jeux-KZO/pages -f build_type=workflow
gh variable set VITE_SUPABASE_URL --repo Jeaneveillard/Jeux-KZO --body "<URL du projet>"
gh variable set VITE_SUPABASE_PUBLISHABLE_KEY --repo Jeaneveillard/Jeux-KZO --body "<clé publishable>"
```

- [ ] **Step 7 : Fusionner et vérifier le site en ligne**

```bash
gh pr merge --squash --delete-branch
```
Attendre la fin du flux sur `main` (`gh run watch`), puis ouvrir `https://jeaneveillard.github.io/Jeux-KZO/` dans le navigateur intégré : accueil, partie contre l'ordinateur (Stockfish), écran « En ligne » (création d'une partie : un code s'affiche), aucune erreur dans la console. Remettre `main` à jour localement (`git checkout main && git pull`).

---

## Couverture de la conception

| Section de la conception | Tâche |
|---|---|
| §2 Hébergement GitHub Pages, dépôt public | 8 |
| §2 Serveur Supabase « jeux-kzo », 0 $ | 4 |
| §3 Bouton « En ligne », pseudo au premier passage | 1 (réglages), 6 |
| §3 Écran « En ligne » : créer (couleur), code, partager, annuler | 6 |
| §3 Rejoindre avec un code, lien `#/rejoindre/…` | 1 (codes), 6 |
| §3 Mes parties en ligne, triées | 2 (`listEntries`), 6 |
| §3 Écran de partie : plateau, pseudos, présence, état, nulle, abandon, menu | 5, 6 |
| §3 Nulle proposée, jouer vaut refus, double proposition | 4 (serveur), 6 |
| §3 Revanche unique, couleurs inversées | 4, 6 |
| §3 « Nulle d'un commun accord » | 1 |
| §4.1 Connexion anonyme | 3, 4 (réglage) |
| §4.2–4.4 Table, RLS, fonctions, erreurs, entrées validées | 4 |
| §4.5 Temps réel, présence sur canal privé | 3 (`watch`), 4 (règles) |
| §4.6 Nettoyage 7 jours | 4 |
| §4.7 Migrations versionnées | 4 |
| §5.1 `src/online/` chargé à la demande, validation des lignes, `useOnlineGame` | 2, 3, 5 |
| §5.2 Plateau commun extrait de `PlayScreen` | 5 |
| §5.3 Adresses | 6 |
| §5.4 Résultat envoyé avec le coup final | 2 (`resultAfter`), 5 |
| §5.5 Erreurs (hors ligne, conflit, coup illégal, panne, codes) | 2, 5, 6 |
| §6 Base `/Jeux-KZO/`, CI, variables, confirmation, lien GPL | 1 (lien), 8 |
| §7 Tests unitaires, `test:online`, `e2e:online`, e2e hors ligne verts | 1–7 |

Écarts assumés par rapport au texte de la conception : les phrases d'état sont neutres (« C'est à Bob de jouer (hors ligne pour l'instant) » plutôt que « Au tour de Marie » / « elle verra ton coup »), conformément à la règle de formulation neutre ; la liste dit « En attente de ton ami » ; la présence et les changements de la partie passent par un seul canal privé `partie:<id>`.

## Écarts constatés à l'exécution

- **Migration (Tâche 4)** : deux erreurs PL/pgSQL corrigées avant application. Une variable `resultat` homonyme d'une colonne a été renommée `fin`. Un `case when … then` dans une condition `if … then` a été mis entre parenthèses, sinon le `then` du `case` coupe la condition.
- **Réglages Supabase** : les deux interrupteurs du tableau de bord ne comptent qu'après « Save changes ». La connexion anonyme a été vérifiée côté serveur (`/auth/v1/settings`). Le blocage des canaux publics n'était pas encore enregistré à la fin de la Tâche 7. L'app n'utilise que des canaux privés, ce qui ne change donc rien à son fonctionnement.
- **Relecture de sécurité de la base** : seconde migration `20260926010000_limites.sql`.
  - Table interne `essais_code`, pour un maximum de 20 codes inconnus par joueur et par tranche de 10 minutes (erreur `trop_d_essais`).
  - `rejoindre_partie` renvoie désormais une liste (`setof`) : aucune ligne pour un code inconnu, afin que l'essai reste compté sans exception. `OnlineApi.joinGame` traduit une liste vide en `code_inconnu`.
  - Verrou consultatif par joueur dans `creer_partie`, pour que deux créations simultanées ne dépassent pas le plafond de 20.
  - Nettoyage quotidien des essais.
  - Écartés : collision de codes (négligeable), `replica identity full` (l'app n'écoute pas les suppressions).
- **Relecture du code** :
  - Le coup en attente mémorise le nombre de coups confirmés à l'envoi. Une notification arrivée avant la réponse du serveur ne le compte plus deux fois, ce qui affichait à tort « Coup invalide reçu ».
  - `newerGame` garde la version la plus récente d'une partie quand une relecture lente arrive en retard.
  - Délai maximal de 15 s par requête (`indisponible`).
  - « Revanche » et « Annuler la partie » passent par `busy` ; boutons désactivés pendant la requête (prop `busy` d'`EndDialog` et de `WaitingRoom`).
- **Temps réel (Tâche 7)** : un premier passage du scénario à deux téléphones a échoué, l'arrivée de Bob n'étant pas vue par Alice. La partie est maintenant aussi relue au message système « Subscribed to PostgreSQL », qui signale le début effectif de l'écoute de la table, un peu après l'abonnement au canal. Le scénario passe ensuite 3 fois sur 3.
- **Tests de hook** : les états « coup en attente retiré » et « message » sont regroupés dans une seule mise à jour, ce qui supprime un test intermittent.
- **Build `/Jeux-KZO/`** :
  - Sous Git Bash, `MSYS_NO_PATHCONV=1` est nécessaire pour que la base ne soit pas convertie en chemin disque (sans effet sur la CI Linux).
  - Le navigateur intégré de l'app de bureau refuse d'enregistrer un service worker. La vérification a été faite avec Chromium (Playwright) : service worker installé sous `/Jeux-KZO/`, app fonctionnelle hors ligne.
- **Chargement à la demande** : le morceau séparé `client-*.js` (Supabase) n'apparaît au build qu'une fois les écrans branchés (Tâche 6), et non dès la Tâche 3.

