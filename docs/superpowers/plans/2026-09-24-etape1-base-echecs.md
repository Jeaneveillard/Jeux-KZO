# Étape 1 — Base de l'app + Échecs : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer une PWA installable (Android + iPhone) où l'on apprend les échecs (17 leçons), où l'on joue contre Stockfish à 3 niveaux (aide au niveau Faible) ou à 2 sur le même téléphone, hors ligne.

**Architecture:** Vite + Preact + TypeScript. Les règles des échecs passent par `chess.js`, encapsulé dans un adaptateur qui expose l'interface commune `GameAdapter` (positions immuables). Stockfish 19 « lite single-thread » tourne dans un Web Worker, piloté par un client UCI testable (transport injectable). Le plateau SVG, la saisie des coups, le moteur de leçons et la session de partie sont génériques pour être réutilisés par les dames (étape 2).

**Tech Stack:** Vite 8, Preact 10, TypeScript 6, chess.js 1.4, stockfish 19 (npm, GPL-3.0), vite-plugin-pwa 1.3, Vitest 5 + @testing-library/preact + jsdom, Playwright 1.63.

**Spec :** `docs/superpowers/specs/2026-09-24-jeux-echecs-dames-design.md`

## Global Constraints

- Interface **en français uniquement** ; le joueur est tutoyé (« ton roi », « à toi de jouer »).
- Licence du projet : **GPL-3.0-or-later** (imposée par Stockfish).
- Node 24 / npm. Versions : `vite ^8.3.0`, `preact ^10.29.8`, `typescript ~6.0.2`, `chess.js 1.4.0`, `stockfish 19.0.0`, `vitest ^5.0.1`, `@playwright/test ^1.63.0`, `vite-plugin-pwa ^1.3.0`.
- Stockfish : fichiers `stockfish-19-lite-single.js` + `.wasm` servis depuis `public/stockfish/` (copiés depuis `node_modules` par `scripts/copy-stockfish.mjs`, dossier ignoré par git).
- Niveaux IA (spec §5.1) : Faible = `go depth 5`, MultiPV 4, meilleur coup ~50 %, un des 3 suivants ~40 %, coup aléatoire ne perdant pas la dame ~10 % ; Moyen = `UCI_LimitStrength true`, `UCI_Elo 1600`, ~1 s ; Expert = pleine puissance, `go movetime 3000`. Délai minimal d'affichage ~600 ms en Faible et Moyen.
- Aide (indice, alerte gaffe, annulation) **uniquement** au niveau Faible contre l'ordinateur. Seuil de gaffe : **200 centipions** ou mat possible pour l'adversaire. Indice : profondeur 12. Vérification de gaffe : profondeur 10.
- Délai d'abandon de l'IA : temps prévu + 5 s, puis relance du worker et nouvel essai à profondeur réduite ; après 2 échecs, message d'erreur.
- Les positions exposées hors d'un module sont **immuables** (toute fonction `play` renvoie un nouvel objet).
- `tsconfig` impose `erasableSyntaxOnly` : **pas de propriétés de paramètres de constructeur** (`constructor(private x)`), pas d'`enum`. `verbatimModuleSyntax` : les imports de types utilisent `import type` / `type`.
- Pas de `console.log` : utiliser `logWarning` (`src/app/log.ts`), actif seulement en développement.
- Couverture Vitest ≥ 80 % (lignes, fonctions, branches, instructions) sur le code logique (`src/core`, `src/board`, `src/chess`, `src/lessons`, `src/app/*.ts`, `src/app/game/session.ts`, `record.ts`, `saved.ts`).
- Fichiers courts : 400 lignes maximum par fichier source.
- Commits au format conventionnel (`feat:`, `test:`, `chore:`…), sans `Co-Authored-By`.

## Carte des fichiers

```
Jeux/
  package.json, tsconfig*.json, vite.config.ts, index.html, LICENSE
  vitest.strength.config.ts, playwright.config.ts, pwa-assets.config.ts
  scripts/
    copy-stockfish.mjs      copie Stockfish vers public/stockfish (postinstall)
    extract-pieces.mjs      extrait les 12 pièces SVG « cburnett » de chessground
    make-icon.mjs           fabrique public/icon.svg à partir du cavalier blanc
  public/
    stockfish/              (généré, ignoré par git)
    icon.svg + icônes PNG   (Tâche 14)
  src/
    main.tsx
    styles/global.css       tous les styles (thème clair/sombre, plateau, modales)
    core/
      types.ts              Color, Level, GameStatus, GameAdapter, Engine, Evaluation
      guards.ts             isRecord, isOneOf
    board/
      geometry.ts           BoardGeometry, chessGeometry, pointToCell
      Board.tsx             plateau SVG générique (toucher, glisser, surlignages, flèches, étoiles)
      move-input.ts         logique pure « toucher une pièce puis une case »
    chess/
      types.ts              ChessMove, ChessPos, ChessPiece, PieceType
      adapter.ts            règles via chess.js + chessAdapter + chessMoveCodec
      names.ts              noms français des pièces (le/la, ton/ta)
      pieces.ts             images SVG + libellés des pièces
      pieces/*.svg          12 pièces (générées par extract-pieces)
      view.ts               pièces pour le plateau, pièces capturées
      explain.ts            texte de fin de partie
      lesson-rules.ts       LessonRules pour les échecs
      engine/
        uci.ts              analyse des lignes UCI, conversion en Evaluation
        transport.ts        UciTransport + transport Web Worker
        errors.ts           EngineLoadError, EngineTimeoutError, EngineAbortError, EngineUnavailableError
        stockfish-client.ts client UCI (file d'attente, délais, abandon)
        levels.ts           réglages Faible / Moyen / Expert
        faible.ts           choix du coup au niveau Faible
        chess-engine.ts     ChessEngine implémente Engine<ChessPos, ChessMove>
        index.ts            getChessEngine() (singleton navigateur)
      help/
        hint.ts             raison et texte d'un indice
        blunder.ts          détection et explication d'une gaffe
      lessons/
        pieces.ts           leçons 1 à 7
        rules.ts            leçons 8 à 14
        strategy.ts         leçons 15 à 17
        index.ts            CHESS_LESSONS
    lessons/
      types.ts              Lesson, Exercise, LessonRules
      runner.ts             déroulé pur d'un exercice
    app/
      App.tsx               aiguillage des écrans
      log.ts                logWarning
      storage.ts            stockage local sûr
      settings.ts           réglages (son)
      progress.ts           progression des leçons
      router.ts             routes (analyse / sérialisation du hash)
      navigation.ts         useRoute, navigate, replaceHash
      sound.ts              petits sons WebAudio
      labels.ts             libellés des niveaux, titre de l'écran de partie
      menu.ts               choix de couleur (resolveColor), messages du menu
      game/
        session.ts          session de partie générique (pure)
        record.ts           sauvegarde / restauration d'une session
        saved.ts            chargement de la partie sauvegardée des échecs
        useChessGame.ts     hook : tour de l'IA, indice, gaffe, annulation, sauvegarde
      components/
        PromotionPicker.tsx, ConfirmDialog.tsx, EndDialog.tsx, CapturedRow.tsx
      screens/
        HomeScreen.tsx, ChessMenuScreen.tsx, SettingsScreen.tsx,
        PlayScreen.tsx, ChessGameRoutes.tsx (nouvelle partie / reprise),
        LessonListScreen.tsx, LessonScreen.tsx, useLessonExercise.ts
  tests/
    unit/                   Vitest (jsdom)
    e2e/                    Playwright (format mobile)
    strength/               matchs et mats (Node, lents, à la demande)
```

---

### Task 1 : Squelette du projet (Vite + Preact + TS + Vitest + Stockfish copié)

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `LICENSE`
- Create: `scripts/copy-stockfish.mjs`
- Create: `src/main.tsx`, `src/app/App.tsx`, `src/app/log.ts`, `src/styles/global.css`
- Create: `tests/unit/setup.ts`, `tests/unit/app/App.test.tsx`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: rien.
- Produces: scripts npm `dev`, `build`, `preview`, `test`, `test:coverage`, `test:strength`, `e2e`, `pieces`, `icons` ; `logWarning(message: string, error?: unknown): void` ; toutes les classes CSS utilisées par la suite.

- [ ] **Step 1 : Créer `package.json`**

```json
{
  "name": "jeux-echecs-dames",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "license": "GPL-3.0-or-later",
  "scripts": {
    "postinstall": "node scripts/copy-stockfish.mjs",
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:strength": "vitest run --config vitest.strength.config.ts",
    "e2e": "playwright test",
    "pieces": "node scripts/extract-pieces.mjs",
    "icons": "node scripts/make-icon.mjs && pwa-assets-generator"
  }
}
```

- [ ] **Step 2 : Créer `scripts/copy-stockfish.mjs`**

```js
// Copie la version « lite single-thread » de Stockfish dans public/stockfish/
// pour qu'elle soit servie telle quelle au Web Worker (et mise en cache hors ligne).
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'node_modules', 'stockfish', 'bin');
const target = join(root, 'public', 'stockfish');
const files = ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm'];

if (!existsSync(source)) {
  console.warn('[copy-stockfish] node_modules/stockfish absent : copie ignorée.');
  process.exit(0);
}

mkdirSync(target, { recursive: true });
for (const file of files) {
  copyFileSync(join(source, file), join(target, file));
}
console.info(`[copy-stockfish] ${files.length} fichiers copiés dans public/stockfish/`);
```

- [ ] **Step 3 : Installer les dépendances**

Run :
```bash
npm install preact@^10.29.8 && npm install --save-exact chess.js@1.4.0
npm install -D vite@^8.3.0 @preact/preset-vite@^2.10.6 typescript@~6.0.2 @types/node@^24.13.3 vitest@^5.0.1 @vitest/coverage-v8@^5.0.1 jsdom@^30.1.1 @testing-library/preact@^3.2.4 @playwright/test@^1.63.0 stockfish@19.0.0 @lichess-org/chessground@10.2.0 vite-plugin-pwa@^1.3.0 @vite-pwa/assets-generator@^1.0.4
node scripts/copy-stockfish.mjs
```
Expected : la dernière commande affiche `[copy-stockfish] 2 fichiers copiés dans public/stockfish/`. (Le paquet `stockfish` pèse ~200 Mo dans `node_modules` ; seuls ~1,8 Mo sont copiés.)

- [ ] **Step 4 : Créer les fichiers TypeScript**

`tsconfig.json` :
```json
{
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }]
}
```

`tsconfig.app.json` :
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "module": "esnext",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "skipLibCheck": true,
    "paths": {
      "react": ["./node_modules/preact/compat/"],
      "react-dom": ["./node_modules/preact/compat/"]
    },
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "tests/unit"]
}
```

`tsconfig.node.json` :
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023"],
    "types": ["node"],
    "skipLibCheck": true,
    "module": "nodenext",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts", "vitest.strength.config.ts", "playwright.config.ts", "pwa-assets.config.ts"]
}
```

- [ ] **Step 5 : Créer `vite.config.ts`**

```ts
import preact from '@preact/preset-vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [preact({ prefreshEnabled: !process.env.VITEST })],
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/unit/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/app/App.tsx',
        'src/app/navigation.ts',
        'src/app/sound.ts',
        'src/app/screens/**',
        'src/app/components/**',
        'src/app/game/useChessGame.ts',
        'src/chess/engine/transport.ts',
        'src/chess/engine/index.ts',
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
```

- [ ] **Step 6 : Créer `index.html`**

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#1f4e3d" />
    <meta name="description" content="Apprends et joue aux échecs et aux dames contre l'ordinateur." />
    <title>Échecs &amp; Dames</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7 : Créer `src/app/log.ts`**

```ts
// Journalisation des erreurs non bloquantes, visible seulement en développement.
export function logWarning(message: string, error?: unknown): void {
  if (import.meta.env.DEV) {
    console.warn(message, error);
  }
}
```

- [ ] **Step 8 : Créer `src/styles/global.css`** (tous les styles de l'app, utilisés par les tâches suivantes)

```css
:root {
  color-scheme: light dark;
  --bg: #f4f1ea;
  --surface: #ffffff;
  --text: #1d1d1b;
  --muted: #5f5b52;
  --primary: #1f4e3d;
  --primary-text: #ffffff;
  --accent: #c8a64b;
  --danger: #b3261e;
  --success: #2e7d32;
  --border: #d9d3c5;
  --shadow: 0 2px 8px rgb(0 0 0 / 0.08);
  --radius: 14px;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.45;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #161a18;
    --surface: #222826;
    --text: #ecebe6;
    --muted: #a9a79f;
    --primary: #3f8f6f;
    --border: #38403c;
    --shadow: 0 2px 8px rgb(0 0 0 / 0.4);
  }
}

* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--text); -webkit-tap-highlight-color: transparent; }
body { min-height: 100dvh; }
#app { max-width: 540px; margin: 0 auto; padding: env(safe-area-inset-top) 16px calc(16px + env(safe-area-inset-bottom)); }
h1 { font-size: 1.6rem; margin: 16px 0 8px; }
h2 { font-size: 1.25rem; margin: 12px 0 8px; }
p { margin: 6px 0; }

.screen { display: flex; flex-direction: column; gap: 12px; padding-bottom: 24px; }
.topbar { display: flex; align-items: center; gap: 8px; min-height: 48px; }
.topbar h1 { flex: 1; font-size: 1.25rem; margin: 0; }
.back { background: none; border: none; color: var(--text); font-size: 1.5rem; min-width: 44px; min-height: 44px; cursor: pointer; }
.muted { color: var(--muted); }

.btn { display: block; width: 100%; min-height: 52px; padding: 12px 16px; border-radius: var(--radius); border: 1px solid var(--border); background: var(--surface); color: var(--text); font-size: 1.05rem; font-weight: 600; text-align: left; box-shadow: var(--shadow); cursor: pointer; }
.btn:disabled { opacity: 0.5; cursor: default; }
.btn .sub { display: block; font-weight: 400; font-size: 0.9rem; color: var(--muted); }
.btn-primary { background: var(--primary); color: var(--primary-text); border-color: var(--primary); text-align: center; }
.btn-primary .sub { color: rgb(255 255 255 / 0.85); }
.btn-small { display: inline-block; width: auto; min-height: 44px; padding: 8px 14px; font-size: 0.95rem; text-align: center; }
.btn-danger { color: var(--danger); }

.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 10px; }
.choices { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.choice { min-height: 48px; border-radius: 10px; border: 2px solid var(--border); background: var(--surface); color: var(--text); font-weight: 600; font-size: 1rem; cursor: pointer; }
.choice[aria-pressed='true'] { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 15%, var(--surface)); }
.toggle { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.toggle input { width: 24px; height: 24px; }

.status-line { min-height: 1.5em; font-weight: 600; text-align: center; margin: 0; }
.feedback { border-radius: 10px; padding: 10px 12px; font-weight: 600; margin: 0; }
.feedback-success { background: color-mix(in srgb, var(--success) 18%, var(--surface)); color: var(--success); }
.feedback-error { background: color-mix(in srgb, var(--danger) 15%, var(--surface)); color: var(--danger); }
.feedback-info { background: color-mix(in srgb, var(--accent) 22%, var(--surface)); }
.banner { border-radius: 10px; padding: 10px 12px; background: color-mix(in srgb, var(--danger) 15%, var(--surface)); display: flex; flex-direction: column; gap: 8px; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.captured { display: flex; flex-wrap: wrap; gap: 2px; min-height: 24px; align-items: center; }
.captured img { width: 22px; height: 22px; }

.board-wrap { width: 100%; max-width: 480px; margin: 0 auto; touch-action: none; user-select: none; -webkit-user-select: none; }
.board { display: block; width: 100%; height: auto; border-radius: 6px; box-shadow: var(--shadow); }
.sq-light { fill: #f0d9b5; }
.sq-dark { fill: #b58863; }
.overlay, .board image { pointer-events: none; }
.hl-last { fill: rgb(155 199 0 / 0.41); }
.hl-selected { fill: rgb(20 85 30 / 0.5); }
.target-dot { fill: rgb(20 85 30 / 0.5); }
.target-ring { fill: none; stroke: rgb(20 85 30 / 0.5); stroke-width: 8; }
.check-stop-0 { stop-color: rgb(255 0 0); stop-opacity: 1; }
.check-stop-1 { stop-color: rgb(169 0 0); stop-opacity: 0; }
.star { fill: #e0a800; font-size: 64px; text-anchor: middle; dominant-baseline: central; }
.arrow { stroke: rgb(21 120 27 / 0.85); stroke-width: 14; stroke-linecap: round; }
.arrow-head { fill: rgb(21 120 27 / 0.85); }
.coord { font-size: 18px; font-weight: 700; }
.coord-on-light { fill: #b58863; }
.coord-on-dark { fill: #f0d9b5; }
.piece-move { animation: piece-slide 180ms ease-out; }
@keyframes piece-slide { from { transform: translate(var(--dx), var(--dy)); } }

.modal-backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / 0.45); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 10; }
.modal { background: var(--surface); color: var(--text); border-radius: var(--radius); padding: 20px; max-width: 420px; width: 100%; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 10px 30px rgb(0 0 0 / 0.3); }
.modal h2 { margin: 0; }
.promotion { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.promotion button { background: var(--bg); border: 2px solid var(--border); border-radius: 10px; padding: 6px; cursor: pointer; }
.promotion img { width: 100%; height: auto; display: block; }

.lesson-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.lesson-done { color: var(--success); font-weight: 700; margin-left: 6px; }
.intro p { font-size: 1.05rem; }
```

- [ ] **Step 9 : Écrire le test qui échoue**

`tests/unit/setup.ts` :
```ts
import { cleanup } from '@testing-library/preact';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.location.hash = '';
});
```

`tests/unit/app/App.test.tsx` :
```tsx
import { render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../../../src/app/App';

describe('App', () => {
  it("affiche le titre de l'application", () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Échecs & Dames' })).toBeTruthy();
  });
});
```

- [ ] **Step 10 : Lancer le test pour vérifier qu'il échoue**

Run : `npx vitest run tests/unit/app/App.test.tsx`
Expected : FAIL — `Failed to resolve import "../../../src/app/App"`.

- [ ] **Step 11 : Implémentation minimale**

`src/app/App.tsx` (remplacé à la Tâche 10) :
```tsx
export function App() {
  return (
    <main class="screen">
      <h1>Échecs &amp; Dames</h1>
    </main>
  );
}
```

`src/main.tsx` :
```tsx
import { render } from 'preact';
import { App } from './app/App';
import './styles/global.css';

const root = document.getElementById('app');
if (!root) {
  throw new Error('Élément #app introuvable dans index.html');
}
render(<App />, root);
```

- [ ] **Step 12 : Vérifier test, typage et build**

Run : `npx vitest run tests/unit/app/App.test.tsx`
Expected : PASS (1 test).
Run : `npm run build`
Expected : build réussi, dossier `dist/` créé, aucune erreur TypeScript.

- [ ] **Step 13 : Licence et `.gitignore`**

```bash
cp node_modules/stockfish/Copying.txt LICENSE
```
Ajouter à la fin de `.gitignore` :
```
public/stockfish/
```

- [ ] **Step 14 : Commit**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html LICENSE .gitignore scripts/copy-stockfish.mjs src tests
git commit -m "chore: squelette Vite + Preact + TypeScript + Vitest"
```

---
### Task 2 : Types communs + adaptateur des échecs

**Files:**
- Create: `src/core/types.ts`, `src/core/guards.ts`
- Create: `src/chess/types.ts`, `src/chess/adapter.ts`
- Test: `tests/unit/core/guards.test.ts`, `tests/unit/chess/adapter.test.ts`

**Interfaces:**
- Consumes: `chess.js` (`Chess`, `validateFen`).
- Produces :
  - `core/types.ts` : `Color`, `Level`, `LEVELS_ORDER`, `WinReason`, `DrawReason`, `GameStatus`, `ONGOING`, `GameAdapter<Pos, Move>`, `Evaluation`, `Engine<Pos, Move>`, `opposite(c)`.
  - `core/guards.ts` : `isRecord(v)`, `isOneOf(v, values)`.
  - `chess/types.ts` : `PromotionPiece`, `PieceType`, `ChessMove`, `ChessPos`, `ChessPiece`, `MoveInfo`.
  - `chess/adapter.ts` : `START_FEN`, `parseChess(fen, options?)`, `positionKey(fen)`, `toUci(m)`, `fromUci(s)`, `legalMoves(pos)`, `play(pos, m)`, `turnOf(pos)`, `status(pos)`, `listPieces(pos)`, `pieceOn(pos, sq)`, `checkedKingSquare(pos)`, `setTurn(pos, color)`, `isAttacked(pos, sq, by)`, `attackersOf(pos, sq, by)`, `moveInfo(pos, m)`, `chessAdapter`, `chessMoveCodec`.

- [ ] **Step 1 : Écrire les tests qui échouent**

`tests/unit/core/guards.test.ts` :
```ts
import { describe, expect, it } from 'vitest';
import { isOneOf, isRecord } from '../../../src/core/guards';
import { opposite } from '../../../src/core/types';

describe('guards', () => {
  it('reconnaît un objet simple', () => {
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord([1])).toBe(false);
    expect(isRecord('x')).toBe(false);
  });

  it('vérifie une valeur dans une liste', () => {
    expect(isOneOf('b', ['a', 'b'] as const)).toBe(true);
    expect(isOneOf('z', ['a', 'b'] as const)).toBe(false);
    expect(isOneOf(3, ['a'] as const)).toBe(false);
  });

  it('donne la couleur opposée', () => {
    expect(opposite('white')).toBe('black');
    expect(opposite('black')).toBe('white');
  });
});
```

`tests/unit/chess/adapter.test.ts` :
```ts
import { describe, expect, it } from 'vitest';
import {
  START_FEN, attackersOf, chessAdapter, chessMoveCodec, checkedKingSquare, fromUci, isAttacked, legalMoves,
  listPieces, moveInfo, parseChess, pieceOn, play, positionKey, setTurn, status, toUci, turnOf,
} from '../../../src/chess/adapter';
import type { ChessPos } from '../../../src/chess/types';

const playAll = (pos: ChessPos, moves: string[]): ChessPos => moves.reduce((p, m) => play(p, fromUci(m)), pos);

describe('adaptateur des échecs', () => {
  it('part de la position initiale avec 20 coups pour les Blancs', () => {
    const pos = chessAdapter.initial();
    expect(pos.fen).toBe(START_FEN);
    expect(chessAdapter.turn(pos)).toBe('white');
    expect(legalMoves(pos)).toHaveLength(20);
    expect(status(pos)).toEqual({ kind: 'ongoing' });
  });

  it('joue un coup sans modifier la position de départ', () => {
    const start = chessAdapter.initial();
    const after = play(start, { from: 'e2', to: 'e4' });
    expect(start.fen).toBe(START_FEN);
    expect(start.keys).toHaveLength(1);
    expect(after.keys).toHaveLength(2);
    expect(turnOf(after)).toBe('black');
    expect(pieceOn(after, 'e4')).toEqual({ square: 'e4', color: 'white', type: 'p' });
    expect(pieceOn(after, 'e2')).toBeNull();
  });

  it('refuse un coup illégal', () => {
    expect(() => play(chessAdapter.initial(), { from: 'e2', to: 'e5' })).toThrow('Coup illégal : e2e5');
  });

  it('détecte le mat le plus rapide (mat du lion)', () => {
    const pos = playAll(chessAdapter.initial(), ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
    expect(status(pos)).toEqual({ kind: 'win', winner: 'black', reason: 'checkmate' });
    expect(checkedKingSquare(pos)).toBe('e1');
  });

  it('détecte le pat', () => {
    expect(status(parseChess('k7/8/1Q6/8/8/8/8/7K b - - 0 1'))).toEqual({ kind: 'draw', reason: 'stalemate' });
  });

  it('détecte le matériel insuffisant', () => {
    expect(status(parseChess('8/8/8/8/8/8/8/k6K w - - 0 1'))).toEqual({ kind: 'draw', reason: 'insufficient-material' });
  });

  it('détecte la répétition de la position trois fois', () => {
    const pos = playAll(chessAdapter.initial(), ['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1', 'f6g8']);
    expect(status(pos)).toEqual({ kind: 'draw', reason: 'repetition' });
  });

  it('détecte la règle des 50 coups', () => {
    expect(status(parseChess('4k3/8/8/8/8/8/8/4K2R w - - 100 80'))).toEqual({ kind: 'draw', reason: 'fifty-moves' });
  });

  it('refuse une position invalide, et une position sans roi sauf option', () => {
    expect(() => parseChess('pas une position')).toThrow(/Position invalide/);
    expect(() => parseChess('8/8/8/8/3R4/8/8/8 w - - 0 1')).toThrow(/Position invalide/);
    const lesson = parseChess('8/8/8/8/3R4/8/8/8 w - - 0 1', { allowMissingKings: true });
    expect(legalMoves(lesson)).toHaveLength(14);
  });

  it('convertit les coups en notation UCI et inversement', () => {
    expect(toUci({ from: 'e7', to: 'e8', promotion: 'q' })).toBe('e7e8q');
    expect(fromUci('e7e8n')).toEqual({ from: 'e7', to: 'e8', promotion: 'n' });
    expect(fromUci('g1f3')).toEqual({ from: 'g1', to: 'f3' });
    expect(() => fromUci('z9')).toThrow('Coup UCI invalide : z9');
    expect(chessMoveCodec.decode(chessMoveCodec.encode({ from: 'a2', to: 'a4' }))).toEqual({ from: 'a2', to: 'a4' });
  });

  it('liste les coups de promotion séparément', () => {
    const pos = parseChess('8/4P3/8/8/8/2k5/8/4K3 w - - 0 1');
    const promotions = legalMoves(pos).filter((m) => m.from === 'e7').map(toUci).sort();
    expect(promotions).toEqual(['e7e8b', 'e7e8n', 'e7e8q', 'e7e8r']);
  });

  it('liste les pièces et donne la clé de position', () => {
    expect(listPieces(chessAdapter.initial())).toHaveLength(32);
    expect(positionKey(START_FEN)).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -');
    expect(checkedKingSquare(chessAdapter.initial())).toBeNull();
  });

  it('change le trait pour les exercices sans adversaire', () => {
    const pos = play(parseChess('8/8/8/8/3R4/8/8/8 w - - 0 1', { allowMissingKings: true }), { from: 'd4', to: 'd8' });
    expect(turnOf(pos)).toBe('black');
    expect(turnOf(setTurn(pos, 'white'))).toBe('white');
  });

  it('indique les attaques sur une case', () => {
    const pos = parseChess('4k3/8/8/3p4/8/1P1Q4/8/4K3 w - - 0 1');
    expect(isAttacked(pos, 'c4', 'black')).toBe(true);
    expect(attackersOf(pos, 'c4', 'black')).toEqual(['d5']);
    expect(attackersOf(pos, 'c4', 'white').sort()).toEqual(['b3', 'd3']);
  });

  it('décrit un coup : pièce, prise, échec', () => {
    const pos = parseChess('r3k3/8/8/8/8/8/1p6/Q3K3 w - - 0 1');
    expect(moveInfo(pos, { from: 'a1', to: 'a8' })).toEqual({ piece: 'q', captured: 'r', san: 'Qxa8+', givesCheck: true });
    expect(moveInfo(chessAdapter.initial(), { from: 'e2', to: 'e4' })).toEqual({ piece: 'p', captured: undefined, san: 'e4', givesCheck: false });
    expect(() => moveInfo(chessAdapter.initial(), { from: 'e2', to: 'e5' })).toThrow('Coup illégal');
  });

  it('sérialise et relit une position', () => {
    const pos = play(chessAdapter.initial(), { from: 'e2', to: 'e4' });
    expect(chessAdapter.parse(chessAdapter.serialize(pos)).fen).toBe(pos.fen);
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run tests/unit/core tests/unit/chess/adapter.test.ts`
Expected : FAIL — modules `src/core/guards`, `src/core/types`, `src/chess/adapter` introuvables.

- [ ] **Step 3 : Écrire `src/core/types.ts`**

```ts
export type Color = 'white' | 'black';
export type Level = 'faible' | 'moyen' | 'expert';
export const LEVELS_ORDER: readonly Level[] = ['faible', 'moyen', 'expert'];

export type WinReason = 'checkmate' | 'resign' | 'no-moves';
export type DrawReason = 'stalemate' | 'repetition' | 'fifty-moves' | 'insufficient-material';

export type GameStatus =
  | { readonly kind: 'ongoing' }
  | { readonly kind: 'win'; readonly winner: Color; readonly reason: WinReason }
  | { readonly kind: 'draw'; readonly reason: DrawReason };

export const ONGOING: GameStatus = { kind: 'ongoing' };

/** Règles d'un jeu. Les positions sont immuables : `play` renvoie toujours un nouvel objet. */
export interface GameAdapter<Pos, Move> {
  readonly id: 'chess' | 'draughts';
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
 * `mateIn` > 0 : le camp au trait mate en n coups ; < 0 : il est maté en n coups.
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

- [ ] **Step 4 : Écrire `src/core/guards.ts`**

```ts
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}
```

- [ ] **Step 5 : Écrire `src/chess/types.ts`**

```ts
import type { Color } from '../core/types';

export type PromotionPiece = 'q' | 'r' | 'b' | 'n';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface ChessMove {
  readonly from: string;
  readonly to: string;
  readonly promotion?: PromotionPiece;
}

/** Position immuable : FEN + clés des positions déjà vues (pour la répétition). */
export interface ChessPos {
  readonly fen: string;
  readonly keys: readonly string[];
}

export interface ChessPiece {
  readonly square: string;
  readonly color: Color;
  readonly type: PieceType;
}

export interface MoveInfo {
  readonly piece: PieceType;
  readonly captured: PieceType | undefined;
  readonly san: string;
  readonly givesCheck: boolean;
}
```

- [ ] **Step 6 : Écrire `src/chess/adapter.ts`**

```ts
import { Chess, validateFen, type Square } from 'chess.js';
import { opposite, type Color, type GameAdapter, type GameStatus } from '../core/types';
import type { ChessMove, ChessPiece, ChessPos, MoveInfo, PromotionPiece } from './types';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export interface ParseOptions {
  /** Autorise les positions sans roi (exercices des leçons). */
  readonly allowMissingKings?: boolean;
}

const UCI_PATTERN = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/;

// chess.js est mutable : on crée un objet neuf pour chaque opération.
function load(fen: string): Chess {
  return new Chess(fen, { skipValidation: true });
}

function colorOf(code: 'w' | 'b'): Color {
  return code === 'w' ? 'white' : 'black';
}

function codeOf(color: Color): 'w' | 'b' {
  return color === 'white' ? 'w' : 'b';
}

/** Les 4 premiers champs du FEN identifient une position pour la répétition. */
export function positionKey(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ');
}

export function parseChess(fen: string, options: ParseOptions = {}): ChessPos {
  const check = validateFen(fen);
  const onlyKingProblem = !check.ok && /king/i.test(check.error ?? '');
  if (!check.ok && !(options.allowMissingKings === true && onlyKingProblem)) {
    throw new Error(`Position invalide : ${check.error ?? 'inconnue'}`);
  }
  const normalized = load(fen).fen();
  return { fen: normalized, keys: [positionKey(normalized)] };
}

export function toUci(move: ChessMove): string {
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}

export function fromUci(uci: string): ChessMove {
  const match = UCI_PATTERN.exec(uci);
  if (!match) {
    throw new Error(`Coup UCI invalide : ${uci}`);
  }
  const [, from, to, promotion] = match;
  return promotion ? { from, to, promotion: promotion as PromotionPiece } : { from, to };
}

export function legalMoves(pos: ChessPos): ChessMove[] {
  return load(pos.fen).moves({ verbose: true }).map((move) => fromUci(move.lan));
}

export function play(pos: ChessPos, move: ChessMove): ChessPos {
  const board = load(pos.fen);
  try {
    board.move({ from: move.from, to: move.to, promotion: move.promotion });
  } catch {
    throw new Error(`Coup illégal : ${toUci(move)}`);
  }
  const fen = board.fen();
  return { fen, keys: [...pos.keys, positionKey(fen)] };
}

export function turnOf(pos: ChessPos): Color {
  return pos.fen.split(' ')[1] === 'b' ? 'black' : 'white';
}

export function status(pos: ChessPos): GameStatus {
  const board = load(pos.fen);
  const toMove = colorOf(board.turn());
  if (board.isCheckmate()) return { kind: 'win', winner: opposite(toMove), reason: 'checkmate' };
  if (board.isStalemate()) return { kind: 'draw', reason: 'stalemate' };
  if (board.isInsufficientMaterial()) return { kind: 'draw', reason: 'insufficient-material' };
  const current = pos.keys[pos.keys.length - 1];
  if (pos.keys.filter((key) => key === current).length >= 3) return { kind: 'draw', reason: 'repetition' };
  if (board.isDrawByFiftyMoves()) return { kind: 'draw', reason: 'fifty-moves' };
  return { kind: 'ongoing' };
}

export function listPieces(pos: ChessPos): ChessPiece[] {
  return load(pos.fen)
    .board()
    .flat()
    .flatMap((cell) => (cell ? [{ square: cell.square, color: colorOf(cell.color), type: cell.type }] : []));
}

export function pieceOn(pos: ChessPos, square: string): ChessPiece | null {
  const piece = load(pos.fen).get(square as Square);
  return piece ? { square, color: colorOf(piece.color), type: piece.type } : null;
}

export function checkedKingSquare(pos: ChessPos): string | null {
  const board = load(pos.fen);
  if (!board.inCheck()) return null;
  const [king] = board.findPiece({ type: 'k', color: board.turn() });
  return king ?? null;
}

/** Donne le trait à `color` (exercices où le joueur enchaîne plusieurs coups). */
export function setTurn(pos: ChessPos, color: Color): ChessPos {
  const fields = pos.fen.split(' ');
  const fen = [fields[0], codeOf(color), fields[2], '-', ...fields.slice(4)].join(' ');
  return { fen, keys: [positionKey(fen)] };
}

export function isAttacked(pos: ChessPos, square: string, by: Color): boolean {
  return load(pos.fen).isAttacked(square as Square, codeOf(by));
}

export function attackersOf(pos: ChessPos, square: string, by: Color): string[] {
  return load(pos.fen).attackers(square as Square, codeOf(by));
}

export function moveInfo(pos: ChessPos, move: ChessMove): MoveInfo {
  const board = load(pos.fen);
  try {
    const played = board.move({ from: move.from, to: move.to, promotion: move.promotion });
    return { piece: played.piece, captured: played.captured, san: played.san, givesCheck: board.inCheck() };
  } catch {
    throw new Error(`Coup illégal : ${toUci(move)}`);
  }
}

export const chessAdapter: GameAdapter<ChessPos, ChessMove> = {
  id: 'chess',
  initial: () => parseChess(START_FEN),
  parse: (text) => parseChess(text),
  serialize: (pos) => pos.fen,
  turn: turnOf,
  legalMoves,
  play,
  status,
};

export const chessMoveCodec = { encode: toUci, decode: fromUci } as const;
```

- [ ] **Step 7 : Lancer les tests**

Run : `npx vitest run tests/unit/core tests/unit/chess/adapter.test.ts`
Expected : PASS (3 + 16 tests).

- [ ] **Step 8 : Commit**

```bash
git add src/core src/chess/types.ts src/chess/adapter.ts tests/unit/core tests/unit/chess/adapter.test.ts
git commit -m "feat: types communs et adaptateur des règles d'échecs"
```

---

### Task 3 : Pièces SVG, noms français et plateau générique

**Files:**
- Create: `scripts/extract-pieces.mjs`, `src/chess/pieces/*.svg` (générés), `src/chess/pieces/LICENCE.md`
- Create: `src/chess/names.ts`, `src/chess/pieces.ts`
- Create: `src/board/geometry.ts`, `src/board/Board.tsx`
- Test: `tests/unit/chess/names.test.ts`, `tests/unit/board/geometry.test.ts`, `tests/unit/board/Board.test.tsx`

**Interfaces:**
- Consumes: `Color` (`src/core/types.ts`), `PieceType` (`src/chess/types.ts`).
- Produces :
  - `names.ts` : `PIECE_VALUES`, `pieceName(type)`, `isFeminine(type)`, `withArticle(type)` (« la tour »), `withPossessive(type)` (« ta dame »), `pieceLabel(color, type)` (« Cavalier blanc »), `sideName(color)` (« les Blancs »).
  - `pieces.ts` : `pieceImage(color, type): string` (URL de l'image).
  - `geometry.ts` : `Cell`, `BoardGeometry`, `chessGeometry(orientation)`, `pointToCell(x, y, rect, size)`.
  - `Board.tsx` : `Board`, `BoardPiece`, `BoardArrow`, `BoardProps` (voir le code). Chaque case est un `<rect data-square="e4">`, chaque pièce une `<image data-piece="e4" aria-label="Pion blanc">`.

- [ ] **Step 1 : Extraire les 12 pièces « cburnett »**

Les pièces de lichess (Colin M.L. Burnett, licence GPLv2+, compatible GPL-3.0) sont embarquées en base64 dans `@lichess-org/chessground`. Créer `scripts/extract-pieces.mjs` :

```js
// Extrait les 12 pièces SVG « cburnett » du CSS de chessground vers src/chess/pieces/.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cssPath = join(root, 'node_modules', '@lichess-org', 'chessground', 'assets', 'chessground.cburnett.css');
const outDir = join(root, 'src', 'chess', 'pieces');
const ROLES = { pawn: 'P', knight: 'N', bishop: 'B', rook: 'R', queen: 'Q', king: 'K' };
const RULE = /piece\.(\w+)\.(white|black)\s*\{\s*background-image:\s*url\('data:image\/svg\+xml;base64,([^']+)'\)/g;

const css = readFileSync(cssPath, 'utf8');
mkdirSync(outDir, { recursive: true });
let count = 0;
for (const [, role, color, base64] of css.matchAll(RULE)) {
  const name = `${color === 'white' ? 'w' : 'b'}${ROLES[role]}.svg`;
  writeFileSync(join(outDir, name), Buffer.from(base64, 'base64').toString('utf8'));
  count += 1;
}
if (count !== 12) {
  throw new Error(`12 pièces attendues, ${count} trouvées dans ${cssPath}`);
}
console.info('[extract-pieces] 12 pièces écrites dans src/chess/pieces/');
```

Run : `npm run pieces`
Expected : `[extract-pieces] 12 pièces écrites dans src/chess/pieces/` et 12 fichiers `wP.svg … bK.svg`.

Créer `src/chess/pieces/LICENCE.md` :
```md
Pièces « cburnett » par Colin M.L. Burnett, extraites de @lichess-org/chessground.
Licence : GPLv2 ou ultérieure (https://github.com/lichess-org/lila/blob/master/COPYING.md).
```

- [ ] **Step 2 : Écrire les tests qui échouent**

`tests/unit/chess/names.test.ts` :
```ts
import { describe, expect, it } from 'vitest';
import { PIECE_VALUES, isFeminine, pieceLabel, pieceName, sideName, withArticle, withPossessive } from '../../../src/chess/names';
import { pieceImage } from '../../../src/chess/pieces';

describe('noms des pièces', () => {
  it('accorde articles et possessifs', () => {
    expect(pieceName('n')).toBe('cavalier');
    expect(isFeminine('q')).toBe(true);
    expect(withArticle('r')).toBe('la tour');
    expect(withArticle('p')).toBe('le pion');
    expect(withPossessive('q')).toBe('ta dame');
    expect(withPossessive('b')).toBe('ton fou');
  });

  it('donne un libellé accessible accordé en genre', () => {
    expect(pieceLabel('white', 'n')).toBe('Cavalier blanc');
    expect(pieceLabel('black', 'q')).toBe('Dame noire');
    expect(pieceLabel('white', 'r')).toBe('Tour blanche');
  });

  it('nomme les camps et connaît la valeur des pièces', () => {
    expect(sideName('white')).toBe('les Blancs');
    expect(sideName('black')).toBe('les Noirs');
    expect(PIECE_VALUES.q).toBe(9);
    expect(PIECE_VALUES.p).toBe(1);
  });

  it("fournit l'image de chaque pièce", () => {
    expect(pieceImage('white', 'n')).toContain('wN');
    expect(pieceImage('black', 'k')).toContain('bK');
  });
});
```

`tests/unit/board/geometry.test.ts` :
```ts
import { describe, expect, it } from 'vitest';
import { chessGeometry, pointToCell } from '../../../src/board/geometry';

describe('géométrie du plateau', () => {
  it('place a8 en haut à gauche vu des Blancs', () => {
    const g = chessGeometry('white');
    expect(g.squareAt({ row: 0, col: 0 })).toBe('a8');
    expect(g.squareAt({ row: 7, col: 7 })).toBe('h1');
    expect(g.cellOf('e2')).toEqual({ row: 6, col: 4 });
    expect(g.isDark({ row: 7, col: 0 })).toBe(true);
    expect(g.isDark({ row: 0, col: 0 })).toBe(false);
    expect(g.edgeLabels?.bottom(0)).toBe('a');
    expect(g.edgeLabels?.left(0)).toBe('8');
  });

  it('retourne le plateau vu des Noirs', () => {
    const g = chessGeometry('black');
    expect(g.squareAt({ row: 0, col: 0 })).toBe('h1');
    expect(g.cellOf('e2')).toEqual({ row: 1, col: 3 });
    expect(g.edgeLabels?.bottom(0)).toBe('h');
    expect(g.edgeLabels?.left(0)).toBe('1');
  });

  it('refuse les cases hors plateau', () => {
    const g = chessGeometry('white');
    expect(g.squareAt({ row: 8, col: 0 })).toBeNull();
    expect(() => g.cellOf('z9')).toThrow('Case inconnue : z9');
  });

  it('convertit un point écran en case', () => {
    const rect = { left: 10, top: 20, width: 800, height: 800 };
    expect(pointToCell(10, 20, rect, 8)).toEqual({ row: 0, col: 0 });
    expect(pointToCell(809, 819, rect, 8)).toEqual({ row: 7, col: 7 });
    expect(pointToCell(5, 20, rect, 8)).toBeNull();
    expect(pointToCell(50, 50, { left: 0, top: 0, width: 0, height: 0 }, 8)).toBeNull();
  });
});
```

`tests/unit/board/Board.test.tsx` :
```tsx
import { act, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { Board, type BoardPiece } from '../../../src/board/Board';
import { chessGeometry } from '../../../src/board/geometry';

const white = chessGeometry('white');
const pawn: BoardPiece = { square: 'e2', image: 'wP.svg', label: 'Pion blanc' };
const knight: BoardPiece = { square: 'd3', image: 'wN.svg', label: 'Cavalier blanc' };

// Événement de pointeur avec coordonnées (compatible jsdom).
function pointer(target: Element, type: string, x = 0, y = 0): void {
  act(() => {
    target.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
  });
}

describe('Board', () => {
  it('dessine 64 cases, a8 en haut à gauche pour les Blancs', () => {
    const { container } = render(<Board geometry={white} pieces={[]} />);
    const squares = container.querySelectorAll('rect[data-square]');
    expect(squares).toHaveLength(64);
    expect(squares[0].getAttribute('data-square')).toBe('a8');
  });

  it('commence par h1 quand le plateau est vu des Noirs', () => {
    const { container } = render(<Board geometry={chessGeometry('black')} pieces={[]} />);
    expect(container.querySelector('rect[data-square]')?.getAttribute('data-square')).toBe('h1');
  });

  it('affiche les pièces avec un libellé accessible', () => {
    render(<Board geometry={white} pieces={[pawn]} />);
    expect(screen.getByLabelText('Pion blanc').getAttribute('data-piece')).toBe('e2');
  });

  it('signale le toucher d’une case', () => {
    const onTap = vi.fn();
    const { container } = render(<Board geometry={white} pieces={[]} onSquareTap={onTap} />);
    const square = container.querySelector('[data-square="e4"]') as Element;
    pointer(square, 'pointerdown');
    pointer(square, 'pointerup');
    expect(onTap).toHaveBeenCalledWith('e4');
  });

  it('dessine points, anneaux, étoiles, flèche et surlignages', () => {
    const { container } = render(
      <Board
        geometry={white}
        pieces={[pawn, knight]}
        targets={['e3', 'd3']}
        stars={['a1', 'b2']}
        arrows={[{ from: 'e2', to: 'e4' }]}
        highlights={['e7', 'e5']}
        selected="e2"
        check="e1"
        animate={{ from: 'e2', to: 'd3' }}
      />,
    );
    expect(container.querySelectorAll('.target-dot')).toHaveLength(1);
    expect(container.querySelectorAll('.target-ring')).toHaveLength(1);
    expect(container.querySelectorAll('.star')).toHaveLength(2);
    expect(container.querySelectorAll('line.arrow')).toHaveLength(1);
    expect(container.querySelectorAll('polygon.arrow-head')).toHaveLength(1);
    expect(container.querySelectorAll('.hl-last')).toHaveLength(2);
    expect(container.querySelectorAll('.hl-selected')).toHaveLength(1);
    expect(container.querySelectorAll('.check')).toHaveLength(1);
    expect(container.querySelector('[data-piece="d3"]')?.getAttribute('class')).toBe('piece-move');
  });

  it('déplace une pièce par glisser-déposer', () => {
    const onDrop = vi.fn();
    const onTap = vi.fn();
    const { container } = render(
      <Board geometry={white} pieces={[pawn]} onDrop={onDrop} onSquareTap={onTap} canDrag={(sq) => sq === 'e2'} />,
    );
    const svg = container.querySelector('svg') as SVGSVGElement;
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 800, right: 800, bottom: 800, x: 0, y: 0, toJSON: () => ({}) });
    pointer(svg, 'pointerdown', 450, 650);
    pointer(svg, 'pointermove', 450, 450);
    pointer(svg, 'pointerup', 450, 450);
    expect(onDrop).toHaveBeenCalledWith('e2', 'e4');
    expect(onTap).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run tests/unit/chess/names.test.ts tests/unit/board`
Expected : FAIL — modules `names`, `pieces`, `geometry`, `Board` introuvables.

- [ ] **Step 4 : Écrire `src/chess/names.ts`**

```ts
import type { Color } from '../core/types';
import type { PieceType } from './types';

const NAMES: Readonly<Record<PieceType, string>> = { p: 'pion', n: 'cavalier', b: 'fou', r: 'tour', q: 'dame', k: 'roi' };
const FEMININE: ReadonlySet<PieceType> = new Set<PieceType>(['r', 'q']);

export const PIECE_VALUES: Readonly<Record<PieceType, number>> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export function pieceName(type: PieceType): string {
  return NAMES[type];
}

export function isFeminine(type: PieceType): boolean {
  return FEMININE.has(type);
}

export function withArticle(type: PieceType): string {
  return `${isFeminine(type) ? 'la' : 'le'} ${NAMES[type]}`;
}

export function withPossessive(type: PieceType): string {
  return `${isFeminine(type) ? 'ta' : 'ton'} ${NAMES[type]}`;
}

export function pieceLabel(color: Color, type: PieceType): string {
  const name = NAMES[type];
  const feminine = isFeminine(type);
  const adjective = color === 'white' ? (feminine ? 'blanche' : 'blanc') : feminine ? 'noire' : 'noir';
  return `${name[0].toUpperCase()}${name.slice(1)} ${adjective}`;
}

export function sideName(color: Color): string {
  return color === 'white' ? 'les Blancs' : 'les Noirs';
}
```

- [ ] **Step 5 : Écrire `src/chess/pieces.ts`**

```ts
import bB from './pieces/bB.svg';
import bK from './pieces/bK.svg';
import bN from './pieces/bN.svg';
import bP from './pieces/bP.svg';
import bQ from './pieces/bQ.svg';
import bR from './pieces/bR.svg';
import wB from './pieces/wB.svg';
import wK from './pieces/wK.svg';
import wN from './pieces/wN.svg';
import wP from './pieces/wP.svg';
import wQ from './pieces/wQ.svg';
import wR from './pieces/wR.svg';
import type { Color } from '../core/types';
import type { PieceType } from './types';

const IMAGES: Readonly<Record<string, string>> = { wP, wN, wB, wR, wQ, wK, bP, bN, bB, bR, bQ, bK };

export function pieceImage(color: Color, type: PieceType): string {
  return IMAGES[`${color === 'white' ? 'w' : 'b'}${type.toUpperCase()}`];
}
```

- [ ] **Step 6 : Écrire `src/board/geometry.ts`**

```ts
import type { Color } from '../core/types';

export interface Cell {
  readonly row: number;
  readonly col: number;
}

/** Correspondance entre cases logiques (« e4 », « 32 ») et cellules affichées (ligne 0 = haut). */
export interface BoardGeometry {
  readonly size: number;
  squareAt(cell: Cell): string | null;
  cellOf(square: string): Cell;
  isDark(cell: Cell): boolean;
  readonly edgeLabels?: {
    bottom(col: number): string;
    left(row: number): string;
  };
}

const FILES = 'abcdefgh';

export function chessGeometry(orientation: Color): BoardGeometry {
  const flipped = orientation === 'black';
  return {
    size: 8,
    squareAt: ({ row, col }) => {
      if (row < 0 || row > 7 || col < 0 || col > 7) return null;
      const file = flipped ? 7 - col : col;
      const rank = flipped ? row + 1 : 8 - row;
      return `${FILES[file]}${rank}`;
    },
    cellOf: (square) => {
      const file = FILES.indexOf(square[0] ?? '');
      const rank = Number(square.slice(1));
      if (square.length !== 2 || file < 0 || !(rank >= 1 && rank <= 8)) {
        throw new Error(`Case inconnue : ${square}`);
      }
      return flipped ? { row: rank - 1, col: 7 - file } : { row: 8 - rank, col: file };
    },
    isDark: ({ row, col }) => (row + col) % 2 === 1,
    edgeLabels: {
      bottom: (col) => FILES[flipped ? 7 - col : col],
      left: (row) => String(flipped ? row + 1 : 8 - row),
    },
  };
}

export interface RectLike {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Cellule sous un point écran, ou null si le point est hors du plateau. */
export function pointToCell(x: number, y: number, rect: RectLike, size: number): Cell | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  const col = Math.floor(((x - rect.left) / rect.width) * size);
  const row = Math.floor(((y - rect.top) / rect.height) * size);
  if (row < 0 || row >= size || col < 0 || col >= size) return null;
  return { row, col };
}
```

- [ ] **Step 7 : Écrire `src/board/Board.tsx`**

```tsx
import { useRef, useState } from 'preact/hooks';
import { pointToCell, type BoardGeometry, type Cell } from './geometry';

export interface BoardPiece {
  readonly square: string;
  readonly image: string;
  readonly label: string;
}

export interface BoardArrow {
  readonly from: string;
  readonly to: string;
}

export interface BoardProps {
  readonly geometry: BoardGeometry;
  readonly pieces: readonly BoardPiece[];
  readonly selected?: string | null;
  readonly targets?: readonly string[];
  readonly highlights?: readonly string[];
  readonly check?: string | null;
  readonly stars?: readonly string[];
  readonly arrows?: readonly BoardArrow[];
  readonly animate?: BoardArrow | null;
  readonly onSquareTap?: (square: string) => void;
  readonly onDrop?: (from: string, to: string) => void;
  readonly canDrag?: (square: string) => boolean;
}

interface DragState {
  readonly from: string;
  readonly startX: number;
  readonly startY: number;
  readonly x: number;
  readonly y: number;
  readonly moved: boolean;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

const CELL = 100;
const DRAG_THRESHOLD_PX = 6;
const ARROW_HEAD = 34;

function allCells(size: number): Cell[] {
  return Array.from({ length: size * size }, (_, index) => ({ row: Math.floor(index / size), col: index % size }));
}

function arrowShape(from: Point, to: Point) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const baseX = to.x - ux * ARROW_HEAD;
  const baseY = to.y - uy * ARROW_HEAD;
  const half = ARROW_HEAD * 0.6;
  const points = `${to.x},${to.y} ${baseX - uy * half},${baseY + ux * half} ${baseX + uy * half},${baseY - ux * half}`;
  return { x1: from.x, y1: from.y, x2: baseX, y2: baseY, points };
}

export function Board(props: BoardProps) {
  const { geometry, pieces } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const extent = geometry.size * CELL;
  const occupied = new Set(pieces.map((piece) => piece.square));

  const origin = (square: string): Point => {
    const cell = geometry.cellOf(square);
    return { x: cell.col * CELL, y: cell.row * CELL };
  };
  const center = (square: string): Point => {
    const o = origin(square);
    return { x: o.x + CELL / 2, y: o.y + CELL / 2 };
  };

  const squareFromEvent = (event: PointerEvent): string | null => {
    const svg = svgRef.current;
    const cell = svg ? pointToCell(event.clientX, event.clientY, svg.getBoundingClientRect(), geometry.size) : null;
    if (cell) return geometry.squareAt(cell);
    const target = event.target instanceof Element ? event.target.closest('[data-square]') : null;
    return target?.getAttribute('data-square') ?? null;
  };

  const onPointerDown = (event: PointerEvent) => {
    const square = squareFromEvent(event);
    if (!square || !props.canDrag?.(square)) return;
    // Capture du pointeur : le glisser continue même si le doigt sort du plateau.
    if (typeof event.pointerId === 'number') svgRef.current?.setPointerCapture?.(event.pointerId);
    setDrag({ from: square, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moved: false });
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!drag) return;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    setDrag({ ...drag, x: event.clientX, y: event.clientY, moved: drag.moved || distance > DRAG_THRESHOLD_PX });
  };

  const onPointerUp = (event: PointerEvent) => {
    const square = squareFromEvent(event);
    const current = drag;
    setDrag(null);
    if (current?.moved) {
      if (square && square !== current.from) props.onDrop?.(current.from, square);
      return;
    }
    if (square) props.onSquareTap?.(square);
  };

  const dragPoint = ((): Point | null => {
    const svg = svgRef.current;
    if (!drag?.moved || !svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0) return null;
    return {
      x: ((drag.x - rect.left) / rect.width) * extent - CELL / 2,
      y: ((drag.y - rect.top) / rect.height) * extent - CELL / 2,
    };
  })();

  return (
    <svg
      ref={svgRef}
      class="board"
      viewBox={`0 0 ${extent} ${extent}`}
      role="img"
      aria-label="Plateau de jeu"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDrag(null)}
    >
      <defs>
        <radialGradient id="check-gradient">
          <stop offset="0%" class="check-stop-0" />
          <stop offset="100%" class="check-stop-1" />
        </radialGradient>
      </defs>
      {allCells(geometry.size).map((cell) => (
        <rect
          key={`${cell.row}-${cell.col}`}
          x={cell.col * CELL}
          y={cell.row * CELL}
          width={CELL}
          height={CELL}
          class={geometry.isDark(cell) ? 'sq-dark' : 'sq-light'}
          data-square={geometry.squareAt(cell) ?? undefined}
        />
      ))}
      <g class="overlay">
        {geometry.edgeLabels &&
          Array.from({ length: geometry.size }, (_, index) => (
            <g key={`label-${index}`}>
              <text
                x={index * CELL + CELL - 16}
                y={extent - 6}
                class={`coord ${geometry.isDark({ row: geometry.size - 1, col: index }) ? 'coord-on-dark' : 'coord-on-light'}`}
              >
                {geometry.edgeLabels?.bottom(index)}
              </text>
              <text
                x={4}
                y={index * CELL + 20}
                class={`coord ${geometry.isDark({ row: index, col: 0 }) ? 'coord-on-dark' : 'coord-on-light'}`}
              >
                {geometry.edgeLabels?.left(index)}
              </text>
            </g>
          ))}
        {(props.highlights ?? []).map((square) => (
          <rect key={`hl-${square}`} {...origin(square)} width={CELL} height={CELL} class="hl-last" />
        ))}
        {props.selected && <rect {...origin(props.selected)} width={CELL} height={CELL} class="hl-selected" />}
        {props.check && <rect {...origin(props.check)} width={CELL} height={CELL} class="check" fill="url(#check-gradient)" />}
        {(props.stars ?? []).map((square) => {
          const c = center(square);
          return (
            <text key={`star-${square}`} x={c.x} y={c.y} class="star">
              ★
            </text>
          );
        })}
      </g>
      {pieces.map((piece) => {
        const o = origin(piece.square);
        const animation = props.animate && props.animate.to === piece.square ? props.animate : null;
        const dragged = drag?.moved === true && drag.from === piece.square;
        const from = animation ? origin(animation.from) : null;
        return (
          <image
            key={animation ? `${piece.square}-from-${animation.from}` : piece.square}
            href={piece.image}
            x={o.x}
            y={o.y}
            width={CELL}
            height={CELL}
            class={from ? 'piece-move' : undefined}
            style={from ? `--dx:${from.x - o.x}px;--dy:${from.y - o.y}px` : undefined}
            opacity={dragged ? 0.35 : 1}
            aria-label={piece.label}
            data-piece={piece.square}
          />
        );
      })}
      <g class="overlay">
        {(props.targets ?? []).map((square) => {
          const c = center(square);
          return occupied.has(square) ? (
            <circle key={`t-${square}`} cx={c.x} cy={c.y} r={46} class="target-ring" />
          ) : (
            <circle key={`t-${square}`} cx={c.x} cy={c.y} r={15} class="target-dot" />
          );
        })}
        {(props.arrows ?? []).map((arrow) => {
          const shape = arrowShape(center(arrow.from), center(arrow.to));
          return (
            <g key={`arrow-${arrow.from}-${arrow.to}`}>
              <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} class="arrow" />
              <polygon points={shape.points} class="arrow-head" />
            </g>
          );
        })}
        {dragPoint && drag && (
          <image
            href={pieces.find((piece) => piece.square === drag.from)?.image}
            x={dragPoint.x}
            y={dragPoint.y}
            width={CELL}
            height={CELL}
          />
        )}
      </g>
    </svg>
  );
}
```

Les images et les calques `.overlay` ne reçoivent pas les pointeurs (règles `.board image` et `.overlay` de `global.css`) : le toucher atteint toujours la case `<rect>`.

- [ ] **Step 8 : Lancer les tests**

Run : `npx vitest run tests/unit/chess/names.test.ts tests/unit/board`
Expected : PASS (4 + 4 + 6 tests).
Run : `npx tsc -b`
Expected : aucune erreur.

- [ ] **Step 9 : Commit**

```bash
git add scripts/extract-pieces.mjs src/chess/pieces src/chess/names.ts src/chess/pieces.ts src/board tests/unit/chess/names.test.ts tests/unit/board
git commit -m "feat: pièces SVG, noms français et plateau SVG générique"
```

---

### Task 4 : Saisie des coups, vue du plateau d'échecs et choix de promotion

**Files:**
- Create: `src/board/move-input.ts`, `src/chess/view.ts`, `src/app/components/PromotionPicker.tsx`
- Test: `tests/unit/board/move-input.test.ts`, `tests/unit/chess/view.test.ts`, `tests/unit/app/PromotionPicker.test.tsx`

**Interfaces:**
- Consumes: `ChessPos`, `ChessMove`, `PieceType` ; `listPieces`, `parseChess`, `play`, `legalMoves`, `chessAdapter` (Tâche 2) ; `BoardPiece` (Tâche 3) ; `pieceImage`, `pieceLabel` (Tâche 3).
- Produces :
  - `move-input.ts` : `MoveShape { from; to }`, `InputState { selected: string | null }`, `EMPTY_INPUT`, `InputResult<M> { state; move: M | null; choices: readonly M[] | null }`, `targetsOf(selected, legal): string[]`, `tapSquare(state, square, legal): InputResult<M>`, `dropPiece(from, to, legal): InputResult<M>`. Générique : sert aussi aux dames.
  - `view.ts` : `chessBoardPieces(pos): BoardPiece[]`, `capturedPieces(pos): Record<Color, readonly PieceType[]>`.
  - `PromotionPicker` : props `{ color: Color; choices: readonly ChessMove[]; onPick(move); onCancel() }`.

- [ ] **Step 1 : Écrire les tests qui échouent**

`tests/unit/board/move-input.test.ts` :
```ts
import { describe, expect, it } from 'vitest';
import { EMPTY_INPUT, dropPiece, tapSquare, targetsOf } from '../../../src/board/move-input';
import { chessAdapter, legalMoves, parseChess } from '../../../src/chess/adapter';

const start = legalMoves(chessAdapter.initial());

describe('saisie des coups', () => {
  it('sélectionne une pièce qui peut bouger et liste ses cases', () => {
    const result = tapSquare(EMPTY_INPUT, 'g1', start);
    expect(result.state.selected).toBe('g1');
    expect(result.move).toBeNull();
    expect(targetsOf('g1', start).sort()).toEqual(['f3', 'h3']);
    expect(targetsOf(null, start)).toEqual([]);
  });

  it('ignore une case sans pièce jouable', () => {
    expect(tapSquare(EMPTY_INPUT, 'e4', start).state.selected).toBeNull();
    expect(tapSquare(EMPTY_INPUT, 'e7', start).state.selected).toBeNull();
  });

  it('joue le coup quand on touche une case d’arrivée', () => {
    const result = tapSquare({ selected: 'e2' }, 'e4', start);
    expect(result.move).toEqual({ from: 'e2', to: 'e4' });
    expect(result.state).toEqual(EMPTY_INPUT);
  });

  it('désélectionne en touchant la même pièce', () => {
    expect(tapSquare({ selected: 'e2' }, 'e2', start).state).toEqual(EMPTY_INPUT);
  });

  it('change de pièce sélectionnée', () => {
    expect(tapSquare({ selected: 'e2' }, 'd2', start).state.selected).toBe('d2');
  });

  it('propose un choix quand plusieurs coups vont sur la même case (promotion)', () => {
    const promo = legalMoves(parseChess('8/4P3/8/8/8/2k5/8/4K3 w - - 0 1'));
    const result = tapSquare({ selected: 'e7' }, 'e8', promo);
    expect(result.move).toBeNull();
    expect(result.choices).toHaveLength(4);
    expect(result.state.selected).toBe('e7');
  });

  it('accepte un glisser-déposer', () => {
    expect(dropPiece('g1', 'f3', start).move).toEqual({ from: 'g1', to: 'f3' });
    expect(dropPiece('g1', 'g3', start).move).toBeNull();
  });
});
```

`tests/unit/chess/view.test.ts` :
```ts
import { describe, expect, it } from 'vitest';
import { chessAdapter, fromUci, play } from '../../../src/chess/adapter';
import { capturedPieces, chessBoardPieces } from '../../../src/chess/view';

describe('vue des échecs', () => {
  it('donne 32 pièces avec image et libellé', () => {
    const pieces = chessBoardPieces(chessAdapter.initial());
    expect(pieces).toHaveLength(32);
    expect(pieces.find((p) => p.square === 'g1')).toMatchObject({ label: 'Cavalier blanc' });
    expect(pieces.find((p) => p.square === 'g1')?.image).toContain('wN');
  });

  it('liste les pièces capturées de chaque camp', () => {
    expect(capturedPieces(chessAdapter.initial())).toEqual({ white: [], black: [] });
    const pos = ['e2e4', 'd7d5', 'e4d5', 'd8d5'].reduce((p, m) => play(p, fromUci(m)), chessAdapter.initial());
    expect(capturedPieces(pos)).toEqual({ white: ['p'], black: ['p'] });
  });
});
```

`tests/unit/app/PromotionPicker.test.tsx` :
```tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { PromotionPicker } from '../../../src/app/components/PromotionPicker';
import type { ChessMove } from '../../../src/chess/types';

const choices: ChessMove[] = ['n', 'b', 'r', 'q'].map((p) => ({ from: 'e7', to: 'e8', promotion: p as ChessMove['promotion'] }));

describe('PromotionPicker', () => {
  it('propose dame, tour, fou, cavalier dans cet ordre', () => {
    render(<PromotionPicker color="white" choices={choices} onPick={vi.fn()} onCancel={vi.fn()} />);
    const labels = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent);
    expect(labels).toEqual(['Dame blanche', 'Tour blanche', 'Fou blanc', 'Cavalier blanc', 'Annuler']);
  });

  it('renvoie le coup choisi ou l’annulation', () => {
    const onPick = vi.fn();
    const onCancel = vi.fn();
    render(<PromotionPicker color="white" choices={choices} onPick={onPick} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dame blanche' }));
    expect(onPick).toHaveBeenCalledWith({ from: 'e7', to: 'e8', promotion: 'q' });
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run tests/unit/board/move-input.test.ts tests/unit/chess/view.test.ts tests/unit/app/PromotionPicker.test.tsx`
Expected : FAIL — modules introuvables.

- [ ] **Step 3 : Écrire `src/board/move-input.ts`**

```ts
export interface MoveShape {
  readonly from: string;
  readonly to: string;
}

export interface InputState {
  readonly selected: string | null;
}

export const EMPTY_INPUT: InputState = { selected: null };

export interface InputResult<M extends MoveShape> {
  readonly state: InputState;
  readonly move: M | null;
  /** Plusieurs coups possibles pour le même trajet (promotion) : il faut choisir. */
  readonly choices: readonly M[] | null;
}

export function targetsOf<M extends MoveShape>(selected: string | null, legal: readonly M[]): string[] {
  if (!selected) return [];
  return [...new Set(legal.filter((move) => move.from === selected).map((move) => move.to))];
}

export function tapSquare<M extends MoveShape>(state: InputState, square: string, legal: readonly M[]): InputResult<M> {
  if (state.selected) {
    const candidates = legal.filter((move) => move.from === state.selected && move.to === square);
    if (candidates.length === 1) return { state: EMPTY_INPUT, move: candidates[0], choices: null };
    if (candidates.length > 1) return { state, move: null, choices: candidates };
    if (square === state.selected) return { state: EMPTY_INPUT, move: null, choices: null };
  }
  const movable = legal.some((move) => move.from === square);
  return { state: movable ? { selected: square } : EMPTY_INPUT, move: null, choices: null };
}

export function dropPiece<M extends MoveShape>(from: string, to: string, legal: readonly M[]): InputResult<M> {
  const result = tapSquare({ selected: from }, to, legal);
  return result.move || result.choices ? result : { state: EMPTY_INPUT, move: null, choices: null };
}
```

- [ ] **Step 4 : Écrire `src/chess/view.ts`**

```ts
import type { BoardPiece } from '../board/Board';
import type { Color } from '../core/types';
import { listPieces } from './adapter';
import { pieceLabel } from './names';
import { pieceImage } from './pieces';
import type { ChessPos, PieceType } from './types';

const START_COUNT: Readonly<Record<PieceType, number>> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
const STRONGEST_FIRST: readonly PieceType[] = ['q', 'r', 'b', 'n', 'p'];

export function chessBoardPieces(pos: ChessPos): BoardPiece[] {
  return listPieces(pos).map((piece) => ({
    square: piece.square,
    image: pieceImage(piece.color, piece.type),
    label: pieceLabel(piece.color, piece.type),
  }));
}

/** Pièces perdues par chaque camp par rapport à la position de départ, de la plus forte à la plus faible. */
export function capturedPieces(pos: ChessPos): Readonly<Record<Color, readonly PieceType[]>> {
  const pieces = listPieces(pos);
  const lost = (color: Color): PieceType[] =>
    STRONGEST_FIRST.flatMap((type) => {
      const onBoard = pieces.filter((piece) => piece.color === color && piece.type === type).length;
      return Array.from({ length: Math.max(0, START_COUNT[type] - onBoard) }, () => type);
    });
  return { white: lost('white'), black: lost('black') };
}
```

- [ ] **Step 5 : Écrire `src/app/components/PromotionPicker.tsx`**

```tsx
import type { Color } from '../../core/types';
import { pieceLabel } from '../../chess/names';
import { pieceImage } from '../../chess/pieces';
import type { ChessMove, PromotionPiece } from '../../chess/types';

interface PromotionPickerProps {
  readonly color: Color;
  readonly choices: readonly ChessMove[];
  readonly onPick: (move: ChessMove) => void;
  readonly onCancel: () => void;
}

const ORDER: readonly PromotionPiece[] = ['q', 'r', 'b', 'n'];

export function PromotionPicker({ color, choices, onPick, onCancel }: PromotionPickerProps) {
  const options = ORDER.flatMap((piece) => {
    const move = choices.find((choice) => choice.promotion === piece);
    return move ? [{ piece, move }] : [];
  });
  return (
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="promotion-title">
      <div class="modal">
        <h2 id="promotion-title">Promotion : choisis ta pièce</h2>
        <div class="promotion">
          {options.map(({ piece, move }) => (
            <button type="button" key={piece} aria-label={pieceLabel(color, piece)} onClick={() => onPick(move)}>
              <img src={pieceImage(color, piece)} alt="" />
            </button>
          ))}
        </div>
        <button type="button" class="btn btn-small" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6 : Lancer les tests**

Run : `npx vitest run tests/unit/board/move-input.test.ts tests/unit/chess/view.test.ts tests/unit/app/PromotionPicker.test.tsx`
Expected : PASS (7 + 2 + 2 tests).

- [ ] **Step 7 : Commit**

```bash
git add src/board/move-input.ts src/chess/view.ts src/app/components/PromotionPicker.tsx tests/unit/board/move-input.test.ts tests/unit/chess/view.test.ts tests/unit/app/PromotionPicker.test.tsx
git commit -m "feat: saisie des coups au toucher, vue du plateau et choix de promotion"
```

---

### Task 5 : Client UCI pour Stockfish (protocole, file d'attente, délais, annulation)

**Files:**
- Create: `src/chess/engine/uci.ts`, `src/chess/engine/errors.ts`, `src/chess/engine/transport.ts`, `src/chess/engine/stockfish-client.ts`
- Test: `tests/unit/chess/engine/uci.test.ts`, `tests/unit/chess/engine/stockfish-client.test.ts`, `tests/unit/chess/engine/fake-transport.ts`

**Interfaces:**
- Consumes: `Evaluation` (`src/core/types.ts`).
- Produces :
  - `uci.ts` : `UciInfo { depth; multipv; scoreCp?; mate?; pv: readonly string[] }`, `parseInfo(line): UciInfo | null`, `parseBestMove(line): { move: string | null } | null`, `MATE_SCORE = 100_000`, `evaluationOf(info?): Evaluation`.
  - `errors.ts` : `EngineLoadError`, `EngineTimeoutError`, `EngineAbortError`, `EngineUnavailableError`, `isAbortError(e)`, `engineErrorMessage(e): string`.
  - `transport.ts` : `UciTransport { send(cmd); onLine(listener); onError(listener); terminate() }`, `createWorkerTransport(url): UciTransport`.
  - `stockfish-client.ts` : `UciOptionValue`, `SearchRequest { fen; go; options; timeoutMs }`, `SearchResult { bestMove: string | null; lines: readonly UciInfo[] }` (lignes triées par `multipv`), `class StockfishClient { constructor(createTransport, initTimeoutMs?); search(request, signal?): Promise<SearchResult>; restart(): void }`.
- Test helper `tests/unit/chess/engine/fake-transport.ts` : `FakeTransport`, `standardResponder(goLines)` — réutilisés à la Tâche 6.

- [ ] **Step 1 : Écrire le faux moteur de test**

`tests/unit/chess/engine/fake-transport.ts` :
```ts
import type { UciTransport } from '../../../../src/chess/engine/transport';

export type Responder = (command: string) => readonly string[];

/** Faux Stockfish : répond aux commandes de façon asynchrone avec des lignes prévues. */
export class FakeTransport implements UciTransport {
  readonly sent: string[] = [];
  terminated = false;
  private respond: Responder;
  private lineListener: (line: string) => void = () => undefined;
  private errorListener: (error: Error) => void = () => undefined;

  constructor(respond: Responder) {
    this.respond = respond;
  }

  send(command: string): void {
    this.sent.push(command);
    const lines = this.respond(command);
    void Promise.resolve().then(() => lines.forEach((line) => this.lineListener(line)));
  }

  onLine(listener: (line: string) => void): void {
    this.lineListener = listener;
  }

  onError(listener: (error: Error) => void): void {
    this.errorListener = listener;
  }

  terminate(): void {
    this.terminated = true;
  }

  emitError(error: Error): void {
    this.errorListener(error);
  }
}

/** Répond « uciok » / « readyok », puis `goLines(commande)` à chaque « go ». */
export function standardResponder(goLines: (command: string) => readonly string[]): Responder {
  return (command) => {
    if (command === 'uci') return ['id name Faux', 'uciok'];
    if (command === 'isready') return ['readyok'];
    if (command.startsWith('go')) return goLines(command);
    return [];
  };
}
```

- [ ] **Step 2 : Écrire les tests qui échouent**

`tests/unit/chess/engine/uci.test.ts` :
```ts
import { describe, expect, it } from 'vitest';
import { MATE_SCORE, evaluationOf, parseBestMove, parseInfo } from '../../../../src/chess/engine/uci';

describe('protocole UCI', () => {
  it('lit une ligne info avec score en centipions', () => {
    const info = parseInfo('info depth 12 seldepth 17 multipv 1 score cp -34 nodes 23297 nps 394864 hashfull 10 time 59 pv e7e5 g1f3 b8c6');
    expect(info).toEqual({ depth: 12, multipv: 1, scoreCp: -34, mate: undefined, pv: ['e7e5', 'g1f3', 'b8c6'] });
  });

  it('lit un score de mat et le numéro de variante', () => {
    expect(parseInfo('info depth 20 multipv 2 score mate -3 pv a2a3')).toMatchObject({ multipv: 2, mate: -3, pv: ['a2a3'] });
  });

  it('ignore les lignes sans variante', () => {
    expect(parseInfo('info depth 1 currmove e2e4 currmovenumber 1')).toBeNull();
    expect(parseInfo('info string NNUE evaluation using nn.nnue')).toBeNull();
    expect(parseInfo('readyok')).toBeNull();
  });

  it('lit le meilleur coup', () => {
    expect(parseBestMove('bestmove e2e4 ponder e7e5')).toEqual({ move: 'e2e4' });
    expect(parseBestMove('bestmove (none)')).toEqual({ move: null });
    expect(parseBestMove('info depth 1')).toBeNull();
  });

  it('convertit une ligne en évaluation', () => {
    expect(evaluationOf({ depth: 5, multipv: 1, scoreCp: 42, pv: ['e2e4'] })).toEqual({ scoreCp: 42 });
    expect(evaluationOf({ depth: 5, multipv: 1, mate: 2, pv: ['e2e4'] })).toEqual({ scoreCp: MATE_SCORE - 2, mateIn: 2 });
    expect(evaluationOf({ depth: 5, multipv: 1, mate: -1, pv: ['e2e4'] })).toEqual({ scoreCp: -(MATE_SCORE - 1), mateIn: -1 });
    expect(evaluationOf(undefined)).toEqual({ scoreCp: 0 });
  });
});
```

`tests/unit/chess/engine/stockfish-client.test.ts` :
```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  EngineAbortError, EngineLoadError, EngineTimeoutError, engineErrorMessage, isAbortError,
} from '../../../../src/chess/engine/errors';
import { StockfishClient, type SearchRequest } from '../../../../src/chess/engine/stockfish-client';
import { FakeTransport, standardResponder } from './fake-transport';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const request = (go: string, extra: Partial<SearchRequest> = {}): SearchRequest => ({
  fen: START, go, options: {}, timeoutMs: 1000, ...extra,
});

afterEach(() => {
  vi.useRealTimers();
});

describe('StockfishClient', () => {
  it('démarre le moteur puis renvoie le meilleur coup et les variantes triées', async () => {
    const fake = new FakeTransport(standardResponder(() => [
      'info depth 5 multipv 2 score cp 10 pv d2d4 d7d5',
      'info depth 5 multipv 1 score cp 30 pv e2e4 e7e5',
      'bestmove e2e4 ponder e7e5',
    ]));
    const client = new StockfishClient(() => fake);
    const result = await client.search(request('go depth 5', { options: { MultiPV: 2, UCI_LimitStrength: false } }));
    expect(result.bestMove).toBe('e2e4');
    expect(result.lines.map((line) => line.pv[0])).toEqual(['e2e4', 'd2d4']);
    expect(fake.sent).toEqual([
      'uci', 'isready',
      'setoption name MultiPV value 2', 'setoption name UCI_LimitStrength value false',
      `position fen ${START}`, 'go depth 5',
    ]);
  });

  it('ne démarre le moteur qu’une seule fois', async () => {
    const factory = vi.fn(() => new FakeTransport(standardResponder(() => ['bestmove e2e4'])));
    const client = new StockfishClient(factory);
    await client.search(request('go depth 1'));
    await client.search(request('go depth 1'));
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('traite les recherches une par une', async () => {
    const fake = new FakeTransport(standardResponder((go) => [go === 'go depth 1' ? 'bestmove a2a3' : 'bestmove h2h3']));
    const client = new StockfishClient(() => fake);
    const results = await Promise.all([client.search(request('go depth 1')), client.search(request('go depth 2'))]);
    expect(results.map((r) => r.bestMove)).toEqual(['a2a3', 'h2h3']);
  });

  it('abandonne une recherche trop longue et relance le moteur ensuite', async () => {
    vi.useFakeTimers();
    let silent = true;
    const transports: FakeTransport[] = [];
    const client = new StockfishClient(() => {
      const fake = new FakeTransport(standardResponder(() => (silent ? [] : ['bestmove e2e4'])));
      transports.push(fake);
      return fake;
    });
    const pending = expect(client.search(request('go movetime 3000'))).rejects.toBeInstanceOf(EngineTimeoutError);
    await vi.advanceTimersByTimeAsync(1000);
    await pending;
    expect(transports[0].terminated).toBe(true);
    silent = false;
    expect((await client.search(request('go depth 1'))).bestMove).toBe('e2e4');
    expect(transports).toHaveLength(2);
  });

  it('signale un moteur qui ne démarre pas, puis réessaie', async () => {
    vi.useFakeTimers();
    let broken = true;
    const client = new StockfishClient(
      () => new FakeTransport(broken ? () => [] : standardResponder(() => ['bestmove e2e4'])),
      500,
    );
    const pending = expect(client.search(request('go depth 1'))).rejects.toBeInstanceOf(EngineLoadError);
    await vi.advanceTimersByTimeAsync(500);
    await pending;
    broken = false;
    expect((await client.search(request('go depth 1'))).bestMove).toBe('e2e4');
  });

  it('transforme une erreur du worker au démarrage en EngineLoadError', async () => {
    const client = new StockfishClient(() => {
      throw new Error('Worker indisponible');
    });
    await expect(client.search(request('go depth 1'))).rejects.toBeInstanceOf(EngineLoadError);
  });

  it('rejette une erreur du worker pendant une recherche', async () => {
    const fake = new FakeTransport(standardResponder(() => []));
    const client = new StockfishClient(() => fake);
    const pending = client.search(request('go depth 1'));
    await vi.waitFor(() => expect(fake.sent).toContain('go depth 1'));
    fake.emitError(new Error('plantage'));
    await expect(pending).rejects.toThrow('plantage');
    expect(fake.terminated).toBe(true);
  });

  it('annule une recherche en cours avec « stop »', async () => {
    const fake = new FakeTransport((command) => {
      if (command === 'uci') return ['uciok'];
      if (command === 'isready') return ['readyok'];
      if (command === 'stop') return ['bestmove e2e4'];
      return [];
    });
    const client = new StockfishClient(() => fake);
    const controller = new AbortController();
    const pending = client.search(request('go movetime 3000'), controller.signal);
    await vi.waitFor(() => expect(fake.sent).toContain('go movetime 3000'));
    controller.abort();
    await expect(pending).rejects.toBeInstanceOf(EngineAbortError);
    expect(fake.sent).toContain('stop');
  });

  it('refuse une recherche déjà annulée sans rien envoyer', async () => {
    const fake = new FakeTransport(standardResponder(() => ['bestmove e2e4']));
    const client = new StockfishClient(() => fake);
    const controller = new AbortController();
    controller.abort();
    await expect(client.search(request('go depth 1'), controller.signal)).rejects.toBeInstanceOf(EngineAbortError);
    expect(fake.sent).toEqual([]);
  });

  it('fournit des messages d’erreur lisibles', () => {
    expect(engineErrorMessage(new EngineLoadError())).toBe("L'ordinateur n'a pas pu démarrer.");
    expect(engineErrorMessage('bizarre')).toBe("L'ordinateur a rencontré un problème.");
    expect(isAbortError(new EngineAbortError())).toBe(true);
    expect(isAbortError(new Error('x'))).toBe(false);
  });
});
```

- [ ] **Step 3 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run tests/unit/chess/engine`
Expected : FAIL — modules `uci`, `errors`, `stockfish-client`, `transport` introuvables.

- [ ] **Step 4 : Écrire `src/chess/engine/uci.ts`**

```ts
import type { Evaluation } from '../../core/types';

export interface UciInfo {
  readonly depth: number;
  readonly multipv: number;
  readonly scoreCp?: number;
  readonly mate?: number;
  readonly pv: readonly string[];
}

export const MATE_SCORE = 100_000;

/** Lit une ligne « info … pv … » ; renvoie null si elle ne contient pas de variante. */
export function parseInfo(line: string): UciInfo | null {
  if (!line.startsWith('info ')) return null;
  const tokens = line.split(/\s+/);
  let depth = 0;
  let multipv = 1;
  let scoreCp: number | undefined;
  let mate: number | undefined;
  let pv: string[] = [];
  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === 'depth') {
      depth = Number(tokens[i + 1]);
      i += 1;
    } else if (token === 'multipv') {
      multipv = Number(tokens[i + 1]);
      i += 1;
    } else if (token === 'score') {
      const value = Number(tokens[i + 2]);
      if (tokens[i + 1] === 'cp') scoreCp = value;
      if (tokens[i + 1] === 'mate') mate = value;
      i += 2;
    } else if (token === 'pv') {
      pv = tokens.slice(i + 1);
      break;
    }
  }
  if (depth === 0 || pv.length === 0) return null;
  return { depth, multipv, scoreCp, mate, pv };
}

export function parseBestMove(line: string): { readonly move: string | null } | null {
  if (!line.startsWith('bestmove')) return null;
  const move = line.split(/\s+/)[1];
  return { move: !move || move === '(none)' ? null : move };
}

export function evaluationOf(info: UciInfo | undefined): Evaluation {
  if (!info) return { scoreCp: 0 };
  if (info.mate !== undefined) {
    return { scoreCp: Math.sign(info.mate) * (MATE_SCORE - Math.abs(info.mate)), mateIn: info.mate };
  }
  return { scoreCp: info.scoreCp ?? 0 };
}
```

- [ ] **Step 5 : Écrire `src/chess/engine/errors.ts`**

```ts
export class EngineLoadError extends Error {
  constructor(cause?: unknown) {
    super("L'ordinateur n'a pas pu démarrer.", { cause });
    this.name = 'EngineLoadError';
  }
}

export class EngineTimeoutError extends Error {
  constructor() {
    super("L'ordinateur a mis trop de temps à répondre.");
    this.name = 'EngineTimeoutError';
  }
}

export class EngineAbortError extends Error {
  constructor() {
    super('Recherche annulée.');
    this.name = 'AbortError';
  }
}

export class EngineUnavailableError extends Error {
  constructor() {
    super("L'ordinateur ne répond plus. Touche « Réessayer » ou reprends la partie plus tard.");
    this.name = 'EngineUnavailableError';
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof EngineAbortError;
}

export function engineErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "L'ordinateur a rencontré un problème.";
}
```

- [ ] **Step 6 : Écrire `src/chess/engine/transport.ts`**

```ts
/** Canal texte vers un moteur UCI (Web Worker dans le navigateur, module WASM dans Node). */
export interface UciTransport {
  send(command: string): void;
  onLine(listener: (line: string) => void): void;
  onError(listener: (error: Error) => void): void;
  terminate(): void;
}

export function createWorkerTransport(url: string): UciTransport {
  const worker = new Worker(url);
  let lineListener: (line: string) => void = () => undefined;
  let errorListener: (error: Error) => void = () => undefined;
  worker.onmessage = (event: MessageEvent) => {
    for (const line of String(event.data).split('\n')) {
      const trimmed = line.trim();
      if (trimmed) lineListener(trimmed);
    }
  };
  worker.onerror = (event: ErrorEvent) => {
    event.preventDefault();
    errorListener(new Error(event.message || 'Erreur du moteur'));
  };
  return {
    send: (command) => worker.postMessage(command),
    onLine: (listener) => {
      lineListener = listener;
    },
    onError: (listener) => {
      errorListener = listener;
    },
    terminate: () => worker.terminate(),
  };
}
```

- [ ] **Step 7 : Écrire `src/chess/engine/stockfish-client.ts`**

```ts
import { EngineAbortError, EngineLoadError, EngineTimeoutError } from './errors';
import type { UciTransport } from './transport';
import { parseBestMove, parseInfo, type UciInfo } from './uci';

export type UciOptionValue = string | number | boolean;

export interface SearchRequest {
  readonly fen: string;
  readonly go: string;
  readonly options: Readonly<Record<string, UciOptionValue>>;
  readonly timeoutMs: number;
}

export interface SearchResult {
  readonly bestMove: string | null;
  /** Dernière ligne reçue pour chaque variante, triées par numéro (1 = la meilleure). */
  readonly lines: readonly UciInfo[];
}

interface Exchange {
  readonly command: string;
  readonly timeoutMs: number;
  readonly isDone: (line: string) => boolean;
  readonly onLine?: (line: string) => void;
  readonly timeoutError: () => Error;
}

export const DEFAULT_INIT_TIMEOUT_MS = 15_000;

/** Client UCI : une recherche à la fois, délai maximal, annulation, relance après panne. */
export class StockfishClient {
  private readonly createTransport: () => UciTransport;
  private readonly initTimeoutMs: number;
  private transport: UciTransport | null = null;
  private ready: Promise<UciTransport> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private lineListener: ((line: string) => void) | null = null;
  private errorListener: ((error: Error) => void) | null = null;

  constructor(createTransport: () => UciTransport, initTimeoutMs = DEFAULT_INIT_TIMEOUT_MS) {
    this.createTransport = createTransport;
    this.initTimeoutMs = initTimeoutMs;
  }

  search(request: SearchRequest, signal?: AbortSignal): Promise<SearchResult> {
    const run = this.queue.then(() => this.runSearch(request, signal));
    // La file continue après un échec ; l'erreur elle-même est rendue à l'appelant via `run`.
    this.queue = run.catch(() => undefined);
    return run;
  }

  /** Arrête le moteur ; il sera relancé à la prochaine recherche. */
  restart(): void {
    this.transport?.terminate();
    this.transport = null;
    this.ready = null;
    this.lineListener = null;
    this.errorListener = null;
  }

  private ensureReady(): Promise<UciTransport> {
    if (!this.ready) {
      this.ready = this.boot().catch((error: unknown) => {
        this.restart();
        throw error instanceof EngineLoadError ? error : new EngineLoadError(error);
      });
    }
    return this.ready;
  }

  private async boot(): Promise<UciTransport> {
    const transport = this.createTransport();
    this.transport = transport;
    transport.onLine((line) => this.lineListener?.(line));
    transport.onError((error) => this.errorListener?.(error));
    const loadTimeout = () => new EngineLoadError(new EngineTimeoutError());
    await this.exchange(transport, { command: 'uci', timeoutMs: this.initTimeoutMs, isDone: (l) => l === 'uciok', timeoutError: loadTimeout });
    await this.exchange(transport, { command: 'isready', timeoutMs: this.initTimeoutMs, isDone: (l) => l === 'readyok', timeoutError: loadTimeout });
    return transport;
  }

  private exchange(transport: UciTransport, exchange: Exchange): Promise<void> {
    return new Promise((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timer);
        this.lineListener = null;
        this.errorListener = null;
        if (error) reject(error);
        else resolve();
      };
      const timer = setTimeout(() => finish(exchange.timeoutError()), exchange.timeoutMs);
      this.lineListener = (line) => {
        exchange.onLine?.(line);
        if (exchange.isDone(line)) finish();
      };
      this.errorListener = (error) => finish(error);
      transport.send(exchange.command);
    });
  }

  private async runSearch(request: SearchRequest, signal?: AbortSignal): Promise<SearchResult> {
    if (signal?.aborted) throw new EngineAbortError();
    const transport = await this.ensureReady();
    for (const [name, value] of Object.entries(request.options)) {
      transport.send(`setoption name ${name} value ${String(value)}`);
    }
    transport.send(`position fen ${request.fen}`);
    const latest = new Map<number, UciInfo>();
    let bestMove: string | null = null;
    const stop = () => transport.send('stop');
    signal?.addEventListener('abort', stop);
    try {
      await this.exchange(transport, {
        command: request.go,
        timeoutMs: request.timeoutMs,
        timeoutError: () => new EngineTimeoutError(),
        onLine: (line) => {
          const info = parseInfo(line);
          if (info) latest.set(info.multipv, info);
        },
        isDone: (line) => {
          const best = parseBestMove(line);
          if (best) bestMove = best.move;
          return best !== null;
        },
      });
    } catch (error) {
      this.restart();
      throw error;
    } finally {
      signal?.removeEventListener('abort', stop);
    }
    if (signal?.aborted) throw new EngineAbortError();
    const lines = [...latest.entries()].sort(([a], [b]) => a - b).map(([, info]) => info);
    return { bestMove, lines };
  }
}
```

- [ ] **Step 8 : Lancer les tests**

Run : `npx vitest run tests/unit/chess/engine`
Expected : PASS (5 + 10 tests).

- [ ] **Step 9 : Commit**

```bash
git add src/chess/engine tests/unit/chess/engine
git commit -m "feat: client UCI pour Stockfish avec délais, annulation et relance"
```

---

### Task 6 : Niveaux de l'IA et moteur d'échecs (ChessEngine)

**Files:**
- Create: `src/chess/engine/levels.ts`, `src/chess/engine/faible.ts`, `src/chess/engine/chess-engine.ts`, `src/chess/engine/index.ts`
- Test: `tests/unit/chess/engine/levels.test.ts`, `tests/unit/chess/engine/faible.test.ts`, `tests/unit/chess/engine/chess-engine.test.ts`

**Interfaces:**
- Consumes: `StockfishClient`, `SearchRequest`, `SearchResult`, `UciOptionValue` (Tâche 5) ; `UciInfo`, `evaluationOf` (Tâche 5) ; erreurs (Tâche 5) ; `legalMoves`, `play`, `listPieces`, `turnOf`, `toUci`, `fromUci` (Tâche 2) ; `FakeTransport`, `standardResponder` (tests, Tâche 5).
- Produces :
  - `levels.ts` : `LevelConfig { go; fallbackGo; options; minDelayMs; timeoutMs }`, `LEVELS: Record<Level, LevelConfig>`, `ANALYSIS_OPTIONS`, `ANALYSIS_TIMEOUT_MS`, `HINT_DEPTH = 12`, `BLUNDER_DEPTH = 10`.
  - `faible.ts` : `FAIBLE_RANDOM_RATE = 0.1`, `FAIBLE_BEST_RATE = 0.5`, `movesKeepingQueen(pos): string[]`, `pickFaibleMove(lines, safePool, rng): string | null`.
  - `chess-engine.ts` : `ChessEngineOptions { rng?; sleep?; now?; levels? }`, `class ChessEngine implements Engine<ChessPos, ChessMove>` avec `bestMove(pos, level, signal)` et `analyse(pos, depth)`.
  - `index.ts` : `STOCKFISH_URL`, `getChessEngine(): ChessEngine`.

- [ ] **Step 1 : Écrire les tests qui échouent**

`tests/unit/chess/engine/levels.test.ts` :
```ts
import { describe, expect, it } from 'vitest';
import { ANALYSIS_OPTIONS, BLUNDER_DEPTH, HINT_DEPTH, LEVELS } from '../../../../src/chess/engine/levels';

describe('niveaux de l’IA', () => {
  it('Faible : recherche courte avec 4 variantes', () => {
    expect(LEVELS.faible.go).toBe('go depth 5');
    expect(LEVELS.faible.options).toMatchObject({ MultiPV: 4, UCI_LimitStrength: false });
    expect(LEVELS.faible.minDelayMs).toBe(600);
  });

  it('Moyen : force limitée à 1600 Elo, environ 1 seconde', () => {
    expect(LEVELS.moyen.go).toBe('go movetime 1000');
    expect(LEVELS.moyen.options).toMatchObject({ MultiPV: 1, UCI_LimitStrength: true, UCI_Elo: 1600 });
    expect(LEVELS.moyen.minDelayMs).toBe(600);
  });

  it('Expert : pleine puissance, 3 secondes', () => {
    expect(LEVELS.expert.go).toBe('go movetime 3000');
    expect(LEVELS.expert.options).toMatchObject({ MultiPV: 1, UCI_LimitStrength: false, 'Skill Level': 20 });
    expect(LEVELS.expert.timeoutMs).toBe(8000);
  });

  it('analyse à pleine puissance pour l’aide', () => {
    expect(ANALYSIS_OPTIONS).toMatchObject({ MultiPV: 1, UCI_LimitStrength: false });
    expect(HINT_DEPTH).toBe(12);
    expect(BLUNDER_DEPTH).toBe(10);
  });
});
```

`tests/unit/chess/engine/faible.test.ts` :
```ts
import { describe, expect, it } from 'vitest';
import { parseChess } from '../../../../src/chess/adapter';
import { movesKeepingQueen, pickFaibleMove } from '../../../../src/chess/engine/faible';
import type { UciInfo } from '../../../../src/chess/engine/uci';

const line = (move: string, multipv: number): UciInfo => ({ depth: 5, multipv, scoreCp: 0, pv: [move] });
const lines = [line('e2e4', 1), line('d2d4', 2), line('g1f3', 3), line('c2c4', 4)];
const sequence = (...values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length];
};

describe('niveau Faible', () => {
  it('joue parfois un coup au hasard parmi les coups sûrs', () => {
    expect(pickFaibleMove(lines, ['a2a3', 'h2h3'], sequence(0.05, 0.5))).toBe('h2h3');
  });

  it('joue le meilleur coup environ une fois sur deux', () => {
    expect(pickFaibleMove(lines, ['a2a3'], sequence(0.3))).toBe('e2e4');
  });

  it('joue sinon une des variantes suivantes', () => {
    expect(pickFaibleMove(lines, ['a2a3'], sequence(0.8, 0))).toBe('d2d4');
    expect(pickFaibleMove(lines, ['a2a3'], sequence(0.8, 0.99))).toBe('c2c4');
  });

  it('se rabat sur le meilleur coup sans coup sûr ni variante', () => {
    expect(pickFaibleMove(lines, [], sequence(0.05))).toBe('e2e4');
    expect(pickFaibleMove([line('e2e4', 1)], [], sequence(0.9))).toBe('e2e4');
    expect(pickFaibleMove([], [], sequence(0.9))).toBeNull();
  });

  it('écarte les coups qui laissent prendre la dame', () => {
    const safe = movesKeepingQueen(parseChess('4k3/8/8/3p4/8/3Q4/8/4K3 w - - 0 1'));
    expect(safe).not.toContain('d3c4');
    expect(safe).not.toContain('d3e4');
    expect(safe).toContain('d3d4');
    expect(safe).toContain('d3d5');
    expect(safe).toContain('e1f2');
  });
});
```

`tests/unit/chess/engine/chess-engine.test.ts` :
```ts
import { describe, expect, it, vi } from 'vitest';
import { chessAdapter } from '../../../../src/chess/adapter';
import { ChessEngine } from '../../../../src/chess/engine/chess-engine';
import { EngineAbortError, EngineUnavailableError } from '../../../../src/chess/engine/errors';
import { LEVELS } from '../../../../src/chess/engine/levels';
import { StockfishClient } from '../../../../src/chess/engine/stockfish-client';
import { FakeTransport, standardResponder, type Responder } from './fake-transport';

const start = chessAdapter.initial();
const noSleep = async () => undefined;

function setup(respond: Responder, extra: ConstructorParameters<typeof ChessEngine>[1] = {}) {
  const transports: FakeTransport[] = [];
  const client = new StockfishClient(() => {
    const fake = new FakeTransport(respond);
    transports.push(fake);
    return fake;
  });
  const engine = new ChessEngine(client, { sleep: noSleep, ...extra });
  return { engine, transports };
}

const signal = () => new AbortController().signal;

describe('ChessEngine', () => {
  it('Expert joue le meilleur coup de Stockfish à pleine puissance', async () => {
    const { engine, transports } = setup(standardResponder(() => ['bestmove g1f3']));
    expect(await engine.bestMove(start, 'expert', signal())).toEqual({ from: 'g1', to: 'f3' });
    expect(transports[0].sent).toContain('go movetime 3000');
    expect(transports[0].sent).toContain('setoption name UCI_LimitStrength value false');
  });

  it('Moyen limite la force à 1600 Elo', async () => {
    const { engine, transports } = setup(standardResponder(() => ['bestmove e2e4']));
    await engine.bestMove(start, 'moyen', signal());
    expect(transports[0].sent).toEqual(expect.arrayContaining([
      'setoption name UCI_LimitStrength value true', 'setoption name UCI_Elo value 1600', 'go movetime 1000',
    ]));
  });

  it('Faible choisit parmi les 4 variantes', async () => {
    const { engine } = setup(
      standardResponder(() => [
        'info depth 5 multipv 1 score cp 30 pv e2e4',
        'info depth 5 multipv 2 score cp 20 pv d2d4',
        'info depth 5 multipv 3 score cp 10 pv g1f3',
        'info depth 5 multipv 4 score cp 0 pv c2c4',
        'bestmove e2e4',
      ]),
      { rng: vi.fn().mockReturnValueOnce(0.8).mockReturnValueOnce(0.99) },
    );
    expect(await engine.bestMove(start, 'faible', signal())).toEqual({ from: 'c2', to: 'c4' });
  });

  it('attend le délai minimal pour garder un rythme naturel', async () => {
    const sleep = vi.fn(async () => undefined);
    const { engine } = setup(standardResponder(() => ['bestmove e2e4']), { sleep, now: () => 1000 });
    await engine.bestMove(start, 'moyen', signal());
    expect(sleep).toHaveBeenCalledWith(600);
  });

  it('refuse de rendre un coup si la partie a été quittée pendant l’attente', async () => {
    const controller = new AbortController();
    const sleep = vi.fn(async () => controller.abort());
    const { engine } = setup(standardResponder(() => ['bestmove e2e4']), { sleep, now: () => 0 });
    await expect(engine.bestMove(start, 'moyen', controller.signal)).rejects.toBeInstanceOf(EngineAbortError);
  });

  it('réessaie à profondeur réduite après un délai dépassé', async () => {
    const levels = { ...LEVELS, expert: { ...LEVELS.expert, timeoutMs: 50 } };
    const { engine, transports } = setup(standardResponder((go) => (go.startsWith('go movetime') ? [] : ['bestmove d2d4'])), { levels });
    expect(await engine.bestMove(start, 'expert', signal())).toEqual({ from: 'd2', to: 'd4' });
    expect(transports).toHaveLength(2);
    expect(transports[1].sent).toContain(LEVELS.expert.fallbackGo);
  });

  it('signale un moteur indisponible après deux échecs', async () => {
    const levels = { ...LEVELS, expert: { ...LEVELS.expert, timeoutMs: 20 } };
    const { engine } = setup(standardResponder(() => []), { levels });
    await expect(engine.bestMove(start, 'expert', signal())).rejects.toBeInstanceOf(EngineUnavailableError);
  });

  it('signale l’absence de coup', async () => {
    const { engine } = setup(standardResponder(() => ['bestmove (none)']));
    await expect(engine.bestMove(start, 'expert', signal())).rejects.toThrow("L'ordinateur n'a trouvé aucun coup.");
  });

  it('analyse une position pour l’aide', async () => {
    const { engine, transports } = setup(standardResponder(() => ['info depth 12 multipv 1 score cp 55 pv e2e4 e7e5', 'bestmove e2e4']));
    expect(await engine.analyse(start, 12)).toEqual({ best: { from: 'e2', to: 'e4' }, scoreCp: 55 });
    expect(transports[0].sent).toContain('go depth 12');
    expect(transports[0].sent).toContain('setoption name MultiPV value 1');
  });

  it('refuse d’analyser une position terminée', async () => {
    const { engine } = setup(standardResponder(() => ['bestmove (none)']));
    await expect(engine.analyse(start, 10)).rejects.toThrow('Aucun coup à analyser');
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run tests/unit/chess/engine/levels.test.ts tests/unit/chess/engine/faible.test.ts tests/unit/chess/engine/chess-engine.test.ts`
Expected : FAIL — modules `levels`, `faible`, `chess-engine` introuvables.

- [ ] **Step 3 : Écrire `src/chess/engine/levels.ts`**

```ts
import type { Level } from '../../core/types';
import type { UciOptionValue } from './stockfish-client';

export interface LevelConfig {
  readonly go: string;
  /** Commande utilisée pour le second essai après un délai dépassé. */
  readonly fallbackGo: string;
  readonly options: Readonly<Record<string, UciOptionValue>>;
  /** Délai minimal avant d'afficher le coup, pour un rythme naturel. */
  readonly minDelayMs: number;
  /** Temps prévu + 5 s. */
  readonly timeoutMs: number;
}

const FULL_STRENGTH = { UCI_LimitStrength: false, 'Skill Level': 20 } as const;

export const LEVELS: Readonly<Record<Level, LevelConfig>> = {
  faible: {
    go: 'go depth 5',
    fallbackGo: 'go depth 3',
    options: { ...FULL_STRENGTH, MultiPV: 4 },
    minDelayMs: 600,
    timeoutMs: 6_000,
  },
  moyen: {
    go: 'go movetime 1000',
    fallbackGo: 'go depth 6',
    options: { MultiPV: 1, UCI_LimitStrength: true, UCI_Elo: 1600 },
    minDelayMs: 600,
    timeoutMs: 6_000,
  },
  expert: {
    go: 'go movetime 3000',
    fallbackGo: 'go depth 12',
    options: { ...FULL_STRENGTH, MultiPV: 1 },
    minDelayMs: 0,
    timeoutMs: 8_000,
  },
};

export const ANALYSIS_OPTIONS: Readonly<Record<string, UciOptionValue>> = { ...FULL_STRENGTH, MultiPV: 1 };
export const ANALYSIS_TIMEOUT_MS = 10_000;
export const HINT_DEPTH = 12;
export const BLUNDER_DEPTH = 10;
```

- [ ] **Step 4 : Écrire `src/chess/engine/faible.ts`**

```ts
import { legalMoves, listPieces, play, toUci, turnOf } from '../adapter';
import type { ChessPos } from '../types';
import type { UciInfo } from './uci';

export const FAIBLE_RANDOM_RATE = 0.1;
export const FAIBLE_BEST_RATE = 0.5;

/** Coups légaux (UCI) après lesquels l'adversaire ne peut pas prendre notre dame tout de suite. */
export function movesKeepingQueen(pos: ChessPos): string[] {
  const me = turnOf(pos);
  return legalMoves(pos)
    .filter((move) => {
      const after = play(pos, move);
      const queens = new Set(listPieces(after).filter((p) => p.color === me && p.type === 'q').map((p) => p.square));
      return !legalMoves(after).some((reply) => queens.has(reply.to));
    })
    .map(toUci);
}

/**
 * ~10 % : coup au hasard parmi `safePool` ; ~50 % : meilleur coup ; sinon une des variantes suivantes.
 * `lines` est triée (variante 1 = la meilleure).
 */
export function pickFaibleMove(lines: readonly UciInfo[], safePool: readonly string[], rng: () => number): string | null {
  const candidates = lines.flatMap((line) => (line.pv[0] ? [line.pv[0]] : []));
  const roll = rng();
  if (roll < FAIBLE_RANDOM_RATE && safePool.length > 0) {
    return safePool[Math.floor(rng() * safePool.length)];
  }
  if (candidates.length === 0) return null;
  if (roll < FAIBLE_RANDOM_RATE + FAIBLE_BEST_RATE || candidates.length === 1) return candidates[0];
  return candidates[1 + Math.floor(rng() * (candidates.length - 1))];
}
```

- [ ] **Step 5 : Écrire `src/chess/engine/chess-engine.ts`**

```ts
import type { Engine, Evaluation, Level } from '../../core/types';
import { fromUci } from '../adapter';
import type { ChessMove, ChessPos } from '../types';
import { EngineAbortError, EngineTimeoutError, EngineUnavailableError } from './errors';
import { movesKeepingQueen, pickFaibleMove } from './faible';
import { ANALYSIS_OPTIONS, ANALYSIS_TIMEOUT_MS, LEVELS, type LevelConfig } from './levels';
import type { SearchRequest, SearchResult, StockfishClient } from './stockfish-client';
import { evaluationOf } from './uci';

export interface ChessEngineOptions {
  readonly rng?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly now?: () => number;
  readonly levels?: Readonly<Record<Level, LevelConfig>>;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class ChessEngine implements Engine<ChessPos, ChessMove> {
  private readonly client: StockfishClient;
  private readonly rng: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  private readonly levels: Readonly<Record<Level, LevelConfig>>;

  constructor(client: StockfishClient, options: ChessEngineOptions = {}) {
    this.client = client;
    this.rng = options.rng ?? Math.random;
    this.sleep = options.sleep ?? wait;
    this.now = options.now ?? Date.now;
    this.levels = options.levels ?? LEVELS;
  }

  async bestMove(pos: ChessPos, level: Level, signal: AbortSignal): Promise<ChessMove> {
    const config = this.levels[level];
    const started = this.now();
    const result = await this.searchWithRetry(
      { fen: pos.fen, go: config.go, options: config.options, timeoutMs: config.timeoutMs },
      config.fallbackGo,
      signal,
    );
    const uci = level === 'faible' ? (pickFaibleMove(result.lines, movesKeepingQueen(pos), this.rng) ?? result.bestMove) : result.bestMove;
    if (!uci) throw new Error("L'ordinateur n'a trouvé aucun coup.");
    const remaining = config.minDelayMs - (this.now() - started);
    if (remaining > 0) await this.sleep(remaining);
    if (signal.aborted) throw new EngineAbortError();
    return fromUci(uci);
  }

  async analyse(pos: ChessPos, depth: number): Promise<{ readonly best: ChessMove } & Evaluation> {
    const result = await this.searchWithRetry(
      { fen: pos.fen, go: `go depth ${depth}`, options: ANALYSIS_OPTIONS, timeoutMs: ANALYSIS_TIMEOUT_MS },
      `go depth ${Math.max(1, Math.floor(depth / 2))}`,
    );
    if (!result.bestMove) throw new Error('Aucun coup à analyser : la partie est terminée.');
    return { best: fromUci(result.bestMove), ...evaluationOf(result.lines[0]) };
  }

  private async searchWithRetry(request: SearchRequest, fallbackGo: string, signal?: AbortSignal): Promise<SearchResult> {
    try {
      return await this.client.search(request, signal);
    } catch (error) {
      if (!(error instanceof EngineTimeoutError)) throw error;
    }
    try {
      return await this.client.search({ ...request, go: fallbackGo }, signal);
    } catch (error) {
      throw error instanceof EngineTimeoutError ? new EngineUnavailableError() : error;
    }
  }
}
```

- [ ] **Step 6 : Écrire `src/chess/engine/index.ts`**

```ts
import { ChessEngine } from './chess-engine';
import { StockfishClient } from './stockfish-client';
import { createWorkerTransport } from './transport';

export const STOCKFISH_URL = `${import.meta.env.BASE_URL}stockfish/stockfish-19-lite-single.js`;

let engine: ChessEngine | null = null;

/** Moteur partagé par toute l'app ; Stockfish n'est chargé qu'à la première demande. */
export function getChessEngine(): ChessEngine {
  if (!engine) {
    engine = new ChessEngine(new StockfishClient(() => createWorkerTransport(STOCKFISH_URL)));
  }
  return engine;
}
```

- [ ] **Step 7 : Lancer les tests**

Run : `npx vitest run tests/unit/chess/engine`
Expected : PASS (tous les tests du dossier, dont 4 + 5 + 10 nouveaux).

- [ ] **Step 8 : Commit**

```bash
git add src/chess/engine tests/unit/chess/engine
git commit -m "feat: niveaux Faible/Moyen/Expert et moteur d'échecs Stockfish"
```

---

### Task 7 : Aide du niveau Faible — indice et alerte de gaffe

**Files:**
- Create: `src/chess/help/hint.ts`, `src/chess/help/blunder.ts`
- Test: `tests/unit/chess/help/hint.test.ts`, `tests/unit/chess/help/blunder.test.ts`

**Interfaces:**
- Consumes: `moveInfo`, `play`, `status`, `turnOf`, `isAttacked`, `attackersOf`, `listPieces`, `pieceOn`, `parseChess` (Tâche 2) ; `withArticle`, `withPossessive`, `isFeminine`, `PIECE_VALUES` (Tâche 3) ; `Evaluation`, `opposite` (Tâche 2).
- Produces :
  - `hint.ts` : `HintReason = 'mate' | 'promotion' | 'capture' | 'check' | 'escape' | 'best'`, `hintReason(pos, move)`, `hintText(pos, move): string`.
  - `blunder.ts` : `BLUNDER_THRESHOLD_CP = 200`, `BlunderVerdict = { blunder: false } | { blunder: true; message: string }`, `detectBlunder(pos, move, before, afterForOpponent): BlunderVerdict`. `before` = évaluation de `pos` pour le joueur ; `afterForOpponent` = évaluation de la position après le coup, du point de vue de l'adversaire (c'est ce que renvoie `Engine.analyse`).

- [ ] **Step 1 : Écrire les tests qui échouent**

`tests/unit/chess/help/hint.test.ts` :
```ts
import { describe, expect, it } from 'vitest';
import { chessAdapter, parseChess } from '../../../../src/chess/adapter';
import { hintReason, hintText } from '../../../../src/chess/help/hint';

describe('indice', () => {
  it('annonce un mat', () => {
    const pos = parseChess('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
    expect(hintReason(pos, { from: 'a1', to: 'a8' })).toBe('mate');
    expect(hintText(pos, { from: 'a1', to: 'a8' })).toBe('Ce coup fait échec et mat !');
  });

  it('annonce une promotion', () => {
    const pos = parseChess('8/4P3/8/8/8/2k5/8/4K3 w - - 0 1');
    expect(hintText(pos, { from: 'e7', to: 'e8', promotion: 'q' })).toBe('Ton pion arrive au bout : il se transforme en dame.');
  });

  it('annonce une prise en nommant la pièce', () => {
    const pos = parseChess('r3k3/8/8/8/8/8/1p6/Q3K3 w - - 0 1');
    expect(hintReason(pos, { from: 'a1', to: 'a8' })).toBe('capture');
    expect(hintText(pos, { from: 'a1', to: 'a8' })).toBe('Ce coup prend la tour adverse.');
  });

  it('annonce un échec', () => {
    const pos = parseChess('rnbqkbnr/ppppp1pp/8/5p2/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
    expect(hintText(pos, { from: 'd1', to: 'h5' })).toBe('Ce coup met le roi adverse en échec.');
  });

  it('annonce une pièce mise à l’abri', () => {
    const pos = parseChess('4k3/8/8/8/3p4/2N5/8/4K3 w - - 0 1');
    expect(hintReason(pos, { from: 'c3', to: 'b5' })).toBe('escape');
    expect(hintText(pos, { from: 'c3', to: 'b5' })).toBe("Ce coup met ton cavalier à l'abri.");
  });

  it('sinon, dit simplement que c’est le meilleur coup', () => {
    expect(hintText(chessAdapter.initial(), { from: 'e2', to: 'e4' })).toBe("C'est le meilleur coup selon l'ordinateur.");
  });
});
```

`tests/unit/chess/help/blunder.test.ts` :
```ts
import { describe, expect, it } from 'vitest';
import { chessAdapter, parseChess } from '../../../../src/chess/adapter';
import { detectBlunder } from '../../../../src/chess/help/blunder';

describe('alerte de gaffe', () => {
  it('explique une dame laissée en prise gratuitement', () => {
    const pos = parseChess('4k3/8/8/3p4/8/3Q4/8/4K3 w - - 0 1');
    const verdict = detectBlunder(pos, { from: 'd3', to: 'c4' }, { scoreCp: 900 }, { scoreCp: 100 });
    expect(verdict).toEqual({
      blunder: true,
      message: 'Attention : après ce coup, ta dame en c4 peut être prise gratuitement par le pion en d5.',
    });
  });

  it('explique une pièce défendue mais attaquée par une pièce moins chère', () => {
    const pos = parseChess('4k3/8/8/3p4/8/1P6/8/2R1K3 w - - 0 1');
    const verdict = detectBlunder(pos, { from: 'c1', to: 'c4' }, { scoreCp: 500 }, { scoreCp: -100 });
    expect(verdict).toEqual({
      blunder: true,
      message: 'Attention : après ce coup, ta tour en c4 peut être prise par le pion en d5.',
    });
  });

  it('ne dit rien pour une petite perte', () => {
    const verdict = detectBlunder(chessAdapter.initial(), { from: 'a2', to: 'a3' }, { scoreCp: 20 }, { scoreCp: 30 });
    expect(verdict).toEqual({ blunder: false });
  });

  it('prévient d’un mat possible pour l’ordinateur', () => {
    const verdict = detectBlunder(chessAdapter.initial(), { from: 'f2', to: 'f3' }, { scoreCp: 20 }, { scoreCp: 99_998, mateIn: 2 });
    expect(verdict).toEqual({ blunder: true, message: "Attention : après ce coup, l'ordinateur peut faire échec et mat en 2 coups." });
  });

  it('prévient quand on laisse passer un mat', () => {
    const verdict = detectBlunder(chessAdapter.initial(), { from: 'a2', to: 'a3' }, { scoreCp: 99_999, mateIn: 1 }, { scoreCp: -300 });
    expect(verdict).toEqual({ blunder: true, message: 'Attention : tu pouvais faire échec et mat, et ce coup laisse passer l’occasion.' });
  });

  it('donne une explication générale quand aucune pièce n’est en prise', () => {
    const verdict = detectBlunder(chessAdapter.initial(), { from: 'e2', to: 'e4' }, { scoreCp: 0 }, { scoreCp: 480 });
    expect(verdict).toEqual({
      blunder: true,
      message: "Attention : l'ordinateur voit que ce coup te fait perdre l'équivalent d'environ 5 pions.",
    });
  });

  it('ne prévient pas quand la partie est déjà perdue', () => {
    const verdict = detectBlunder(chessAdapter.initial(), { from: 'a2', to: 'a3' }, { scoreCp: -99_997, mateIn: -3 }, { scoreCp: 99_998, mateIn: 2 });
    expect(verdict).toEqual({ blunder: false });
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run tests/unit/chess/help`
Expected : FAIL — modules `hint` et `blunder` introuvables.

- [ ] **Step 3 : Écrire `src/chess/help/hint.ts`**

```ts
import { opposite } from '../../core/types';
import { isAttacked, moveInfo, play, status, turnOf } from '../adapter';
import { withArticle, withPossessive } from '../names';
import type { ChessMove, ChessPos } from '../types';

export type HintReason = 'mate' | 'promotion' | 'capture' | 'check' | 'escape' | 'best';

export function hintReason(pos: ChessPos, move: ChessMove): HintReason {
  const info = moveInfo(pos, move);
  const after = play(pos, move);
  const them = opposite(turnOf(pos));
  if (status(after).kind === 'win') return 'mate';
  if (move.promotion) return 'promotion';
  if (info.captured) return 'capture';
  if (info.givesCheck) return 'check';
  if (isAttacked(pos, move.from, them) && !isAttacked(after, move.to, them)) return 'escape';
  return 'best';
}

export function hintText(pos: ChessPos, move: ChessMove): string {
  const info = moveInfo(pos, move);
  switch (hintReason(pos, move)) {
    case 'mate':
      return 'Ce coup fait échec et mat !';
    case 'promotion':
      return 'Ton pion arrive au bout : il se transforme en dame.';
    case 'capture':
      return `Ce coup prend ${withArticle(info.captured ?? 'p')} adverse.`;
    case 'check':
      return 'Ce coup met le roi adverse en échec.';
    case 'escape':
      return `Ce coup met ${withPossessive(info.piece)} à l'abri.`;
    case 'best':
      return "C'est le meilleur coup selon l'ordinateur.";
  }
}
```

- [ ] **Step 4 : Écrire `src/chess/help/blunder.ts`**

```ts
import { opposite, type Color, type Evaluation } from '../../core/types';
import { attackersOf, listPieces, pieceOn, play, turnOf } from '../adapter';
import { PIECE_VALUES, isFeminine, withArticle, withPossessive } from '../names';
import type { ChessMove, ChessPos, PieceType } from '../types';

export const BLUNDER_THRESHOLD_CP = 200;

export type BlunderVerdict = { readonly blunder: false } | { readonly blunder: true; readonly message: string };

interface Attacker {
  readonly square: string;
  readonly type: PieceType;
}

interface Hanging {
  readonly square: string;
  readonly type: PieceType;
  readonly attacker: Attacker;
  readonly defended: boolean;
}

const NO_BLUNDER: BlunderVerdict = { blunder: false };

function attackers(pos: ChessPos, square: string, by: Color): Attacker[] {
  return attackersOf(pos, square, by).flatMap((from) => {
    const piece = pieceOn(pos, from);
    return piece ? [{ square: from, type: piece.type }] : [];
  });
}

/** Pièce du joueur (hors roi) qui peut être prise avec perte ; la plus précieuse s'il y en a plusieurs. */
function findHangingPiece(after: ChessPos, me: Color): Hanging | null {
  const them = opposite(me);
  const hanging = listPieces(after).flatMap((piece): Hanging[] => {
    if (piece.color !== me || piece.type === 'k') return [];
    const threats = attackers(after, piece.square, them);
    if (threats.length === 0) return [];
    const cheapest = threats.reduce((a, b) => (PIECE_VALUES[b.type] < PIECE_VALUES[a.type] ? b : a));
    const defended = attackersOf(after, piece.square, me).length > 0;
    const losing = !defended || PIECE_VALUES[cheapest.type] < PIECE_VALUES[piece.type];
    return losing ? [{ square: piece.square, type: piece.type, attacker: cheapest, defended }] : [];
  });
  return hanging.reduce<Hanging | null>(
    (worst, candidate) => (!worst || PIECE_VALUES[candidate.type] > PIECE_VALUES[worst.type] ? candidate : worst),
    null,
  );
}

function hangingMessage(piece: Hanging): string {
  const taken = isFeminine(piece.type) ? 'prise' : 'pris';
  const freely = piece.defended ? '' : 'gratuitement ';
  return `Attention : après ce coup, ${withPossessive(piece.type)} en ${piece.square} peut être ${taken} ${freely}par ${withArticle(piece.attacker.type)} en ${piece.attacker.square}.`;
}

export function detectBlunder(pos: ChessPos, move: ChessMove, before: Evaluation, afterForOpponent: Evaluation): BlunderVerdict {
  const alreadyLost = before.mateIn !== undefined && before.mateIn < 0;
  if (alreadyLost) return NO_BLUNDER;

  const opponentMates = afterForOpponent.mateIn !== undefined && afterForOpponent.mateIn > 0;
  if (opponentMates) {
    const n = afterForOpponent.mateIn ?? 1;
    return { blunder: true, message: `Attention : après ce coup, l'ordinateur peut faire échec et mat en ${n} coup${n > 1 ? 's' : ''}.` };
  }

  const hadMate = before.mateIn !== undefined && before.mateIn > 0;
  const stillMates = afterForOpponent.mateIn !== undefined && afterForOpponent.mateIn < 0;
  if (hadMate && !stillMates) {
    return { blunder: true, message: 'Attention : tu pouvais faire échec et mat, et ce coup laisse passer l’occasion.' };
  }

  const loss = before.scoreCp + afterForOpponent.scoreCp;
  if (loss < BLUNDER_THRESHOLD_CP) return NO_BLUNDER;

  const hanging = findHangingPiece(play(pos, move), turnOf(pos));
  if (hanging) return { blunder: true, message: hangingMessage(hanging) };
  return {
    blunder: true,
    message: `Attention : l'ordinateur voit que ce coup te fait perdre l'équivalent d'environ ${Math.round(loss / 100)} pions.`,
  };
}
```

Rappel : `afterForOpponent.scoreCp` est du point de vue de l'adversaire ; la note du joueur après le coup vaut donc `-afterForOpponent.scoreCp`, et la perte `before.scoreCp - (-afterForOpponent.scoreCp)`.

- [ ] **Step 5 : Lancer les tests**

Run : `npx vitest run tests/unit/chess/help`
Expected : PASS (6 + 7 tests).

- [ ] **Step 6 : Commit**

```bash
git add src/chess/help tests/unit/chess/help
git commit -m "feat: indice et alerte de gaffe pour le niveau Faible"
```

---

### Task 8 : Stockage local sûr, réglages et progression des leçons

**Files:**
- Create: `src/app/storage.ts`, `src/app/settings.ts`, `src/app/progress.ts`
- Test: `tests/unit/app/storage.test.ts`, `tests/unit/app/settings-progress.test.ts`

**Interfaces:**
- Consumes: `isRecord` (Tâche 2), `logWarning` (Tâche 1).
- Produces :
  - `storage.ts` : `KeyValueBackend`, `AppStorage { available; read<T>(key, validate); write(key, value); remove(key) }`, `STORAGE_KEYS = { settings: 'jeux.reglages', chessProgress: 'jeux.echecs.progression', chessSavedGame: 'jeux.echecs.partie' }`, `detectBackend(): KeyValueBackend | null`, `createStorage(backend): AppStorage`.
  - `settings.ts` : `Settings { sound: boolean }`, `DEFAULT_SETTINGS`, `validateSettings(v)`.
  - `progress.ts` : `LessonProgress { completed: readonly string[] }`, `EMPTY_PROGRESS`, `validateProgress(v)`, `markCompleted(p, id)`, `isCompleted(p, id)`.

- [ ] **Step 1 : Écrire les tests qui échouent**

`tests/unit/app/storage.test.ts` :
```ts
import { describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS, createStorage, detectBackend, type KeyValueBackend } from '../../../src/app/storage';

function memoryBackend(): KeyValueBackend {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

const brokenBackend: KeyValueBackend = {
  getItem: () => {
    throw new Error('refusé');
  },
  setItem: () => {
    throw new Error('plein');
  },
  removeItem: () => {
    throw new Error('refusé');
  },
};

const asNumber = (value: unknown) => (typeof value === 'number' ? value : null);

describe('stockage local', () => {
  it('écrit, relit et efface une valeur', () => {
    const storage = createStorage(memoryBackend());
    storage.write('cle', 42);
    expect(storage.read('cle', asNumber)).toBe(42);
    storage.remove('cle');
    expect(storage.read('cle', asNumber)).toBeNull();
    expect(storage.available).toBe(true);
  });

  it('rejette une valeur invalide ou illisible', () => {
    const backend = memoryBackend();
    backend.setItem('texte', '"bonjour"');
    backend.setItem('casse', '{pas du json');
    const storage = createStorage(backend);
    expect(storage.read('texte', asNumber)).toBeNull();
    expect(storage.read('casse', asNumber)).toBeNull();
  });

  it('ne plante jamais si le stockage refuse', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const storage = createStorage(brokenBackend);
    expect(() => storage.write('cle', 1)).not.toThrow();
    expect(storage.read('cle', asNumber)).toBeNull();
    expect(() => storage.remove('cle')).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('fonctionne sans stockage (navigation privée)', () => {
    const storage = createStorage(null);
    expect(storage.available).toBe(false);
    storage.write('cle', 1);
    expect(storage.read('cle', asNumber)).toBeNull();
    storage.remove('cle');
  });

  it('détecte le localStorage du navigateur', () => {
    expect(detectBackend()).toBe(window.localStorage);
    expect(STORAGE_KEYS.chessSavedGame).toBe('jeux.echecs.partie');
  });
});
```

`tests/unit/app/settings-progress.test.ts` :
```ts
import { describe, expect, it } from 'vitest';
import { EMPTY_PROGRESS, isCompleted, markCompleted, validateProgress } from '../../../src/app/progress';
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

describe('progression des leçons', () => {
  it('marque une leçon terminée sans doublon ni mutation', () => {
    const once = markCompleted(EMPTY_PROGRESS, 'tour');
    const twice = markCompleted(once, 'tour');
    expect(once).toEqual({ completed: ['tour'] });
    expect(twice).toBe(once);
    expect(EMPTY_PROGRESS.completed).toEqual([]);
    expect(isCompleted(once, 'tour')).toBe(true);
    expect(isCompleted(once, 'fou')).toBe(false);
  });

  it('valide la progression enregistrée', () => {
    expect(validateProgress({ completed: ['tour', 'fou'] })).toEqual({ completed: ['tour', 'fou'] });
    expect(validateProgress({ completed: [1] })).toBeNull();
    expect(validateProgress({ completed: 'tour' })).toBeNull();
    expect(validateProgress(undefined)).toBeNull();
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run tests/unit/app/storage.test.ts tests/unit/app/settings-progress.test.ts`
Expected : FAIL — modules introuvables.

- [ ] **Step 3 : Écrire `src/app/storage.ts`**

```ts
import { logWarning } from './log';

export interface KeyValueBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface AppStorage {
  readonly available: boolean;
  read<T>(key: string, validate: (value: unknown) => T | null): T | null;
  write(key: string, value: unknown): void;
  remove(key: string): void;
}

export const STORAGE_KEYS = {
  settings: 'jeux.reglages',
  chessProgress: 'jeux.echecs.progression',
  chessSavedGame: 'jeux.echecs.partie',
} as const;

/** Renvoie le localStorage s'il accepte d'écrire, sinon null (navigation privée, stockage bloqué). */
export function detectBackend(): KeyValueBackend | null {
  try {
    const probe = '__jeux_test__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch (error) {
    logWarning('[stockage] indisponible', error);
    return null;
  }
}

export function createStorage(backend: KeyValueBackend | null): AppStorage {
  return {
    available: backend !== null,
    read<T>(key: string, validate: (value: unknown) => T | null): T | null {
      if (!backend) return null;
      try {
        const raw = backend.getItem(key);
        return raw === null ? null : validate(JSON.parse(raw));
      } catch (error) {
        logWarning(`[stockage] lecture impossible : ${key}`, error);
        return null;
      }
    },
    write(key: string, value: unknown): void {
      if (!backend) return;
      try {
        backend.setItem(key, JSON.stringify(value));
      } catch (error) {
        logWarning(`[stockage] écriture impossible : ${key}`, error);
      }
    },
    remove(key: string): void {
      if (!backend) return;
      try {
        backend.removeItem(key);
      } catch (error) {
        logWarning(`[stockage] suppression impossible : ${key}`, error);
      }
    },
  };
}
```

- [ ] **Step 4 : Écrire `src/app/settings.ts`**

```ts
import { isRecord } from '../core/guards';

export interface Settings {
  readonly sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = { sound: true };

export function validateSettings(value: unknown): Settings | null {
  if (!isRecord(value) || typeof value.sound !== 'boolean') return null;
  return { sound: value.sound };
}
```

- [ ] **Step 5 : Écrire `src/app/progress.ts`**

```ts
import { isRecord } from '../core/guards';

export interface LessonProgress {
  readonly completed: readonly string[];
}

export const EMPTY_PROGRESS: LessonProgress = { completed: [] };

export function validateProgress(value: unknown): LessonProgress | null {
  if (!isRecord(value) || !Array.isArray(value.completed)) return null;
  const ids: unknown[] = value.completed;
  return ids.every((id): id is string => typeof id === 'string') ? { completed: [...ids] } : null;
}

export function isCompleted(progress: LessonProgress, lessonId: string): boolean {
  return progress.completed.includes(lessonId);
}

export function markCompleted(progress: LessonProgress, lessonId: string): LessonProgress {
  return isCompleted(progress, lessonId) ? progress : { completed: [...progress.completed, lessonId] };
}
```

- [ ] **Step 6 : Lancer les tests**

Run : `npx vitest run tests/unit/app/storage.test.ts tests/unit/app/settings-progress.test.ts`
Expected : PASS (5 + 4 tests).

- [ ] **Step 7 : Commit**

```bash
git add src/app/storage.ts src/app/settings.ts src/app/progress.ts tests/unit/app/storage.test.ts tests/unit/app/settings-progress.test.ts
git commit -m "feat: stockage local sûr, réglages et progression des leçons"
```

---

### Task 9 : Session de partie générique, sauvegarde et reprise

**Files:**
- Create: `src/app/game/session.ts`, `src/app/game/record.ts`, `src/app/game/saved.ts`
- Test: `tests/unit/app/game/session.test.ts`, `tests/unit/app/game/record.test.ts`

**Interfaces:**
- Consumes: `GameAdapter`, `GameStatus`, `Color`, `Level`, `LEVELS_ORDER`, `opposite` (Tâche 2) ; `isRecord`, `isOneOf` (Tâche 2) ; `chessAdapter`, `chessMoveCodec` (Tâche 2) ; `AppStorage`, `STORAGE_KEYS`, `createStorage` (Tâche 8).
- Produces :
  - `session.ts` : `GameMode = 'ai' | 'local'`, `GameSetup { game: 'chess'; mode; level: Level | null; playerColor: Color }`, `Session<Pos, Move> { setup; positions; moves; result }`, `createSession(adapter, setup, start)`, `currentPosition(s)`, `lastMove(s)`, `applyMove(adapter, s, move)`, `resign(s, loser)`, `isHumanTurn(adapter, s)`, `canUndo(adapter, s)`, `undoLastHumanMove(adapter, s)`.
  - `record.ts` : `MoveCodec<Move>`, `GameRecord { setup; start: string; moves: readonly string[] }`, `toRecord(adapter, codec, s)`, `validateSetup(v)`, `validateRecord(v)`, `restoreSession(adapter, codec, record)`.
  - `saved.ts` : `SavedGameResult = { kind: 'none' } | { kind: 'ok'; session } | { kind: 'error'; message }`, `RESUME_ERROR_MESSAGE`, `loadSavedChessGame(storage)`, `hasSavedChessGame(storage)`.

- [ ] **Step 1 : Écrire les tests qui échouent**

`tests/unit/app/game/session.test.ts` :
```ts
import { describe, expect, it } from 'vitest';
import {
  applyMove, canUndo, createSession, currentPosition, isHumanTurn, lastMove, resign, undoLastHumanMove,
  type GameSetup,
} from '../../../../src/app/game/session';
import { chessAdapter, fromUci } from '../../../../src/chess/adapter';

const aiFaible: GameSetup = { game: 'chess', mode: 'ai', level: 'faible', playerColor: 'white' };
const local: GameSetup = { game: 'chess', mode: 'local', level: null, playerColor: 'white' };
const start = () => createSession(chessAdapter, aiFaible, chessAdapter.initial());
const playAll = (setup: GameSetup, moves: string[]) =>
  moves.reduce((s, m) => applyMove(chessAdapter, s, fromUci(m)), createSession(chessAdapter, setup, chessAdapter.initial()));

describe('session de partie', () => {
  it('commence en cours, sans coup', () => {
    const s = start();
    expect(s.result).toEqual({ kind: 'ongoing' });
    expect(lastMove(s)).toBeNull();
    expect(currentPosition(s)).toBe(s.positions[0]);
  });

  it('ajoute un coup sans modifier l’ancienne session', () => {
    const s0 = start();
    const s1 = applyMove(chessAdapter, s0, { from: 'e2', to: 'e4' });
    expect(s0.moves).toHaveLength(0);
    expect(s1.moves).toEqual([{ from: 'e2', to: 'e4' }]);
    expect(s1.positions).toHaveLength(2);
    expect(lastMove(s1)).toEqual({ from: 'e2', to: 'e4' });
  });

  it('détecte la fin de partie et refuse ensuite tout coup', () => {
    const s = playAll(local, ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
    expect(s.result).toEqual({ kind: 'win', winner: 'black', reason: 'checkmate' });
    expect(() => applyMove(chessAdapter, s, { from: 'a2', to: 'a3' })).toThrow('La partie est terminée.');
  });

  it('sait à qui est le tour de jouer', () => {
    const s = start();
    expect(isHumanTurn(chessAdapter, s)).toBe(true);
    expect(isHumanTurn(chessAdapter, applyMove(chessAdapter, s, { from: 'e2', to: 'e4' }))).toBe(false);
    expect(isHumanTurn(chessAdapter, playAll(local, ['e2e4']))).toBe(true);
  });

  it('permet d’abandonner', () => {
    const s = resign(start(), 'white');
    expect(s.result).toEqual({ kind: 'win', winner: 'black', reason: 'resign' });
    expect(resign(s, 'black')).toBe(s);
  });

  it('annule le dernier coup du joueur et la réponse de l’ordinateur', () => {
    const s = playAll(aiFaible, ['e2e4', 'e7e5', 'g1f3', 'b8c6']);
    expect(canUndo(chessAdapter, s)).toBe(true);
    const undone = undoLastHumanMove(chessAdapter, s);
    expect(undone.moves.map((m) => `${m.from}${m.to}`)).toEqual(['e2e4', 'e7e5']);
    expect(undone.positions).toHaveLength(3);
  });

  it('annule seulement le coup du joueur si l’ordinateur n’a pas encore répondu', () => {
    const undone = undoLastHumanMove(chessAdapter, playAll(aiFaible, ['e2e4']));
    expect(undone.moves).toHaveLength(0);
  });

  it('permet d’annuler un coup qui a mené au mat, mais pas un abandon', () => {
    const mated = playAll({ ...aiFaible }, ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
    expect(canUndo(chessAdapter, mated)).toBe(true);
    expect(undoLastHumanMove(chessAdapter, mated).result).toEqual({ kind: 'ongoing' });
    expect(canUndo(chessAdapter, resign(playAll(aiFaible, ['e2e4', 'e7e5']), 'white'))).toBe(false);
  });

  it('refuse l’annulation hors du niveau Faible ou sans coup joué', () => {
    expect(canUndo(chessAdapter, start())).toBe(false);
    expect(canUndo(chessAdapter, playAll({ ...aiFaible, level: 'moyen' }, ['e2e4', 'e7e5']))).toBe(false);
    expect(canUndo(chessAdapter, playAll(local, ['e2e4']))).toBe(false);
    const nothing = start();
    expect(undoLastHumanMove(chessAdapter, nothing)).toBe(nothing);
  });
});
```

`tests/unit/app/game/record.test.ts` :
```ts
import { describe, expect, it } from 'vitest';
import { RESUME_ERROR_MESSAGE, hasSavedChessGame, loadSavedChessGame } from '../../../../src/app/game/saved';
import { restoreSession, toRecord, validateRecord, validateSetup } from '../../../../src/app/game/record';
import { applyMove, createSession, type GameSetup } from '../../../../src/app/game/session';
import { STORAGE_KEYS, createStorage } from '../../../../src/app/storage';
import { START_FEN, chessAdapter, chessMoveCodec } from '../../../../src/chess/adapter';

const setup: GameSetup = { game: 'chess', mode: 'ai', level: 'moyen', playerColor: 'black' };

describe('sauvegarde des parties', () => {
  it('transforme une session en enregistrement et la restaure', () => {
    const s = applyMove(chessAdapter, createSession(chessAdapter, setup, chessAdapter.initial()), { from: 'e2', to: 'e4' });
    const record = toRecord(chessAdapter, chessMoveCodec, s);
    expect(record).toEqual({ setup, start: START_FEN, moves: ['e2e4'] });
    const restored = restoreSession(chessAdapter, chessMoveCodec, record);
    expect(restored.positions[1].fen).toBe(s.positions[1].fen);
    expect(restored.setup).toEqual(setup);
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
    expect(validateSetup({ game: 'chess', mode: 'ai', level: 'maitre', playerColor: 'white' })).toBeNull();
    expect(validateSetup({ game: 'dames', mode: 'ai', level: 'faible', playerColor: 'white' })).toBeNull();
  });

  it('charge la partie sauvegardée des échecs', () => {
    const storage = createStorage(window.localStorage);
    expect(loadSavedChessGame(storage)).toEqual({ kind: 'none' });
    expect(hasSavedChessGame(storage)).toBe(false);
    storage.write(STORAGE_KEYS.chessSavedGame, { setup, start: START_FEN, moves: ['e2e4', 'e7e5'] });
    const loaded = loadSavedChessGame(storage);
    expect(loaded.kind).toBe('ok');
    expect(loaded.kind === 'ok' && loaded.session.moves).toHaveLength(2);
    expect(hasSavedChessGame(storage)).toBe(true);
  });

  it('écarte proprement une sauvegarde abîmée', () => {
    const storage = createStorage(window.localStorage);
    storage.write(STORAGE_KEYS.chessSavedGame, { setup, start: START_FEN, moves: ['e2e5'] });
    expect(loadSavedChessGame(storage)).toEqual({ kind: 'error', message: RESUME_ERROR_MESSAGE });
    expect(window.localStorage.getItem(STORAGE_KEYS.chessSavedGame)).toBeNull();
    window.localStorage.setItem(STORAGE_KEYS.chessSavedGame, '{"setup":42}');
    expect(loadSavedChessGame(storage)).toEqual({ kind: 'error', message: RESUME_ERROR_MESSAGE });
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run tests/unit/app/game`
Expected : FAIL — modules `session`, `record`, `saved` introuvables.

- [ ] **Step 3 : Écrire `src/app/game/session.ts`**

```ts
import { opposite, type Color, type GameAdapter, type GameStatus, type Level } from '../../core/types';

export type GameMode = 'ai' | 'local';

export interface GameSetup {
  readonly game: 'chess';
  readonly mode: GameMode;
  /** null en mode 2 joueurs. */
  readonly level: Level | null;
  /** Couleur du joueur humain contre l'ordinateur (ignorée en mode 2 joueurs). */
  readonly playerColor: Color;
}

/** Partie immuable : positions[0] est la position de départ, positions[i + 1] suit moves[i]. */
export interface Session<Pos, Move> {
  readonly setup: GameSetup;
  readonly positions: readonly Pos[];
  readonly moves: readonly Move[];
  readonly result: GameStatus;
}

export function createSession<Pos, Move>(adapter: GameAdapter<Pos, Move>, setup: GameSetup, start: Pos): Session<Pos, Move> {
  return { setup, positions: [start], moves: [], result: adapter.status(start) };
}

export function currentPosition<Pos, Move>(session: Session<Pos, Move>): Pos {
  return session.positions[session.positions.length - 1];
}

export function lastMove<Pos, Move>(session: Session<Pos, Move>): Move | null {
  return session.moves.length > 0 ? session.moves[session.moves.length - 1] : null;
}

export function applyMove<Pos, Move>(adapter: GameAdapter<Pos, Move>, session: Session<Pos, Move>, move: Move): Session<Pos, Move> {
  if (session.result.kind !== 'ongoing') throw new Error('La partie est terminée.');
  const next = adapter.play(currentPosition(session), move);
  return {
    ...session,
    positions: [...session.positions, next],
    moves: [...session.moves, move],
    result: adapter.status(next),
  };
}

export function resign<Pos, Move>(session: Session<Pos, Move>, loser: Color): Session<Pos, Move> {
  if (session.result.kind !== 'ongoing') return session;
  return { ...session, result: { kind: 'win', winner: opposite(loser), reason: 'resign' } };
}

export function isHumanTurn<Pos, Move>(adapter: GameAdapter<Pos, Move>, session: Session<Pos, Move>): boolean {
  return session.setup.mode === 'local' || adapter.turn(currentPosition(session)) === session.setup.playerColor;
}

function lastHumanMoveIndex<Pos, Move>(adapter: GameAdapter<Pos, Move>, session: Session<Pos, Move>): number {
  for (let index = session.moves.length - 1; index >= 0; index -= 1) {
    if (adapter.turn(session.positions[index]) === session.setup.playerColor) return index;
  }
  return -1;
}

export function canUndo<Pos, Move>(adapter: GameAdapter<Pos, Move>, session: Session<Pos, Move>): boolean {
  const resigned = session.result.kind === 'win' && session.result.reason === 'resign';
  return session.setup.mode === 'ai' && session.setup.level === 'faible' && !resigned && lastHumanMoveIndex(adapter, session) >= 0;
}

/** Revient juste avant le dernier coup du joueur (retire aussi la réponse de l'ordinateur). */
export function undoLastHumanMove<Pos, Move>(adapter: GameAdapter<Pos, Move>, session: Session<Pos, Move>): Session<Pos, Move> {
  const index = lastHumanMoveIndex(adapter, session);
  if (index < 0) return session;
  const positions = session.positions.slice(0, index + 1);
  return { ...session, positions, moves: session.moves.slice(0, index), result: adapter.status(positions[index]) };
}
```

- [ ] **Step 4 : Écrire `src/app/game/record.ts`**

```ts
import { isOneOf, isRecord } from '../../core/guards';
import { LEVELS_ORDER, type GameAdapter } from '../../core/types';
import { applyMove, createSession, type GameSetup, type Session } from './session';

export interface MoveCodec<Move> {
  encode(move: Move): string;
  decode(text: string): Move;
}

export interface GameRecord {
  readonly setup: GameSetup;
  readonly start: string;
  readonly moves: readonly string[];
}

export function toRecord<Pos, Move>(adapter: GameAdapter<Pos, Move>, codec: MoveCodec<Move>, session: Session<Pos, Move>): GameRecord {
  return { setup: session.setup, start: adapter.serialize(session.positions[0]), moves: session.moves.map((m) => codec.encode(m)) };
}

export function validateSetup(value: unknown): GameSetup | null {
  if (!isRecord(value)) return null;
  const { game, mode, level, playerColor } = value;
  if (game !== 'chess' || !isOneOf(mode, ['ai', 'local'] as const) || !isOneOf(playerColor, ['white', 'black'] as const)) return null;
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
export function restoreSession<Pos, Move>(adapter: GameAdapter<Pos, Move>, codec: MoveCodec<Move>, record: GameRecord): Session<Pos, Move> {
  return record.moves.reduce(
    (session, text) => applyMove(adapter, session, codec.decode(text)),
    createSession(adapter, record.setup, adapter.parse(record.start)),
  );
}
```

- [ ] **Step 5 : Écrire `src/app/game/saved.ts`**

```ts
import { chessAdapter, chessMoveCodec } from '../../chess/adapter';
import type { ChessMove, ChessPos } from '../../chess/types';
import { logWarning } from '../log';
import { STORAGE_KEYS, type AppStorage } from '../storage';
import { restoreSession, validateRecord } from './record';
import type { Session } from './session';

export const RESUME_ERROR_MESSAGE = "La partie précédente n'a pas pu être reprise.";

export type SavedGameResult =
  | { readonly kind: 'none' }
  | { readonly kind: 'ok'; readonly session: Session<ChessPos, ChessMove> }
  | { readonly kind: 'error'; readonly message: string };

export function loadSavedChessGame(storage: AppStorage): SavedGameResult {
  const raw = storage.read(STORAGE_KEYS.chessSavedGame, (value) => value);
  if (raw === null) return { kind: 'none' };
  const record = validateRecord(raw);
  try {
    if (!record) throw new Error('Enregistrement invalide');
    return { kind: 'ok', session: restoreSession(chessAdapter, chessMoveCodec, record) };
  } catch (error) {
    logWarning('[reprise] partie sauvegardée rejetée', error);
    storage.remove(STORAGE_KEYS.chessSavedGame);
    return { kind: 'error', message: RESUME_ERROR_MESSAGE };
  }
}

export function hasSavedChessGame(storage: AppStorage): boolean {
  return validateRecord(storage.read(STORAGE_KEYS.chessSavedGame, (value) => value)) !== null;
}
```

- [ ] **Step 6 : Lancer les tests**

Run : `npx vitest run tests/unit/app/game`
Expected : PASS (9 + 5 tests).

- [ ] **Step 7 : Commit**

```bash
git add src/app/game/session.ts src/app/game/record.ts src/app/game/saved.ts tests/unit/app/game
git commit -m "feat: session de partie immuable, sauvegarde et reprise"
```

---

### Task 10 : Écran de partie (IA, aide Faible, 2 joueurs, fin de partie)

**Files:**
- Create: `src/chess/explain.ts`, `src/app/labels.ts`, `src/app/sound.ts`
- Create: `src/app/components/ConfirmDialog.tsx`, `src/app/components/EndDialog.tsx`, `src/app/components/CapturedRow.tsx`
- Create: `src/app/game/useChessGame.ts`, `src/app/screens/PlayScreen.tsx`
- Test: `tests/unit/chess/explain.test.ts`, `tests/unit/app/labels.test.ts`, `tests/unit/app/dialogs.test.tsx`

**Interfaces:**
- Consumes: Tâches 2 à 9 — `chessAdapter`, `legalMoves`, `moveInfo`, `play`, `turnOf`, `checkedKingSquare`, `chessMoveCodec` ; `Board`, `chessGeometry`, `targetsOf`, `tapSquare`, `dropPiece`, `EMPTY_INPUT` ; `chessBoardPieces`, `capturedPieces`, `pieceImage`, `pieceLabel`, `sideName` ; `PromotionPicker` ; `getChessEngine`, `BLUNDER_DEPTH`, `HINT_DEPTH`, `engineErrorMessage`, `isAbortError` ; `hintText`, `detectBlunder` ; session (`applyMove`, `canUndo`, `currentPosition`, `isHumanTurn`, `lastMove`, `resign`, `undoLastHumanMove`) ; `toRecord` ; `AppStorage`, `STORAGE_KEYS` ; `logWarning`.
- Produces :
  - `explain.ts` : `ResultText { title; detail }`, `explainResult(status, viewer: Color | null): ResultText`.
  - `labels.ts` : `LEVEL_LABELS: Record<Level, { name; description }>`, `modeTitle(setup): string`.
  - `sound.ts` : `SoundKind`, `playSound(kind, enabled)`.
  - `ConfirmDialog` `{ title; message; confirmLabel; cancelLabel; onConfirm; onCancel }`, `EndDialog` `{ result; onReplay; onMenu; onClose; onUndo? }`, `CapturedRow` `{ color; pieces }`.
  - `useChessGame(initial, deps): ChessGame` (voir le code), `PlayScreen` `{ initial; storage; sound; notice?; onExit; onNewGame }`.

- [ ] **Step 1 : Écrire les tests qui échouent**

`tests/unit/chess/explain.test.ts` :
```ts
import { describe, expect, it } from 'vitest';
import { explainResult } from '../../../src/chess/explain';

describe('explication du résultat', () => {
  it('explique un mat au perdant et au gagnant', () => {
    const mate = { kind: 'win', winner: 'black', reason: 'checkmate' } as const;
    expect(explainResult(mate, 'white')).toEqual({ title: 'Défaite', detail: "Échec et mat : ton roi est attaqué et ne peut plus s'échapper." });
    expect(explainResult(mate, 'black')).toEqual({ title: 'Victoire !', detail: "Échec et mat ! Le roi adverse est attaqué et ne peut plus s'échapper." });
    expect(explainResult(mate, null)).toEqual({ title: 'Les Noirs gagnent !', detail: "Échec et mat : le roi est attaqué et ne peut plus s'échapper." });
  });

  it('explique un abandon', () => {
    const resign = { kind: 'win', winner: 'white', reason: 'resign' } as const;
    expect(explainResult(resign, 'black').detail).toBe('Tu as abandonné la partie.');
    expect(explainResult(resign, 'white').detail).toBe("L'adversaire a abandonné.");
    expect(explainResult(resign, null).detail).toBe('Les Noirs ont abandonné.');
  });

  it('explique l’absence de coup possible', () => {
    const blocked = { kind: 'win', winner: 'white', reason: 'no-moves' } as const;
    expect(explainResult(blocked, 'black').detail).toBe("Tu n'as plus aucun coup possible.");
    expect(explainResult(blocked, 'white').detail).toBe("L'adversaire n'a plus aucun coup possible.");
    expect(explainResult(blocked, null).detail).toBe("Les Noirs n'ont plus aucun coup possible.");
  });

  it('explique chaque partie nulle', () => {
    expect(explainResult({ kind: 'draw', reason: 'stalemate' }, 'white')).toEqual({
      title: 'Partie nulle',
      detail: "Pat : le joueur qui doit jouer n'a aucun coup possible, mais son roi n'est pas en échec. Personne ne gagne.",
    });
    expect(explainResult({ kind: 'draw', reason: 'repetition' }, null).detail).toBe('La même position est revenue trois fois : personne ne gagne.');
    expect(explainResult({ kind: 'draw', reason: 'fifty-moves' }, null).detail).toBe('50 coups de chaque côté sans prise ni mouvement de pion : personne ne gagne.');
    expect(explainResult({ kind: 'draw', reason: 'insufficient-material' }, null).detail).toBe('Il ne reste pas assez de pièces pour faire échec et mat : personne ne gagne.');
  });

  it('indique une partie en cours', () => {
    expect(explainResult({ kind: 'ongoing' }, null)).toEqual({ title: 'Partie en cours', detail: '' });
  });
});
```

`tests/unit/app/labels.test.ts` :
```ts
import { describe, expect, it } from 'vitest';
import { LEVEL_LABELS, modeTitle } from '../../../src/app/labels';

describe('libellés', () => {
  it('décrit les trois niveaux', () => {
    expect(LEVEL_LABELS.faible.name).toBe('Faible');
    expect(LEVEL_LABELS.faible.description).toContain('aide');
    expect(LEVEL_LABELS.moyen.name).toBe('Moyen');
    expect(LEVEL_LABELS.expert.name).toBe('Expert');
  });

  it('titre l’écran de partie', () => {
    expect(modeTitle({ game: 'chess', mode: 'ai', level: 'expert', playerColor: 'white' })).toBe("Contre l'ordinateur · Expert");
    expect(modeTitle({ game: 'chess', mode: 'local', level: null, playerColor: 'white' })).toBe('2 joueurs');
  });
});
```

`tests/unit/app/dialogs.test.tsx` :
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
    render(<CapturedRow color="black" pieces={['q', 'p']} />);
    expect(screen.getByAltText('Dame noire')).toBeTruthy();
    expect(screen.getByAltText('Pion noir')).toBeTruthy();
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run tests/unit/chess/explain.test.ts tests/unit/app/labels.test.ts tests/unit/app/dialogs.test.tsx`
Expected : FAIL — modules introuvables.

- [ ] **Step 3 : Écrire `src/chess/explain.ts`**

```ts
import { opposite, type Color, type DrawReason, type GameStatus, type WinReason } from '../core/types';
import { sideName } from './names';

export interface ResultText {
  readonly title: string;
  readonly detail: string;
}

const DRAW_DETAILS: Readonly<Record<DrawReason, string>> = {
  stalemate: "Pat : le joueur qui doit jouer n'a aucun coup possible, mais son roi n'est pas en échec. Personne ne gagne.",
  repetition: 'La même position est revenue trois fois : personne ne gagne.',
  'fifty-moves': '50 coups de chaque côté sans prise ni mouvement de pion : personne ne gagne.',
  'insufficient-material': 'Il ne reste pas assez de pièces pour faire échec et mat : personne ne gagne.',
};

function capitalize(text: string): string {
  return `${text[0].toUpperCase()}${text.slice(1)}`;
}

function winDetail(reason: WinReason, viewer: Color | null, winner: Color): string {
  const loserSide = capitalize(sideName(opposite(winner)));
  const viewerWon = viewer === winner;
  switch (reason) {
    case 'checkmate':
      if (viewer === null) return "Échec et mat : le roi est attaqué et ne peut plus s'échapper.";
      return viewerWon
        ? "Échec et mat ! Le roi adverse est attaqué et ne peut plus s'échapper."
        : "Échec et mat : ton roi est attaqué et ne peut plus s'échapper.";
    case 'resign':
      if (viewer === null) return `${loserSide} ont abandonné.`;
      return viewerWon ? "L'adversaire a abandonné." : 'Tu as abandonné la partie.';
    case 'no-moves':
      if (viewer === null) return `${loserSide} n'ont plus aucun coup possible.`;
      return viewerWon ? "L'adversaire n'a plus aucun coup possible." : "Tu n'as plus aucun coup possible.";
  }
}

/** `viewer` : couleur du joueur contre l'ordinateur, ou null en mode 2 joueurs. */
export function explainResult(status: GameStatus, viewer: Color | null): ResultText {
  if (status.kind === 'ongoing') return { title: 'Partie en cours', detail: '' };
  if (status.kind === 'draw') return { title: 'Partie nulle', detail: DRAW_DETAILS[status.reason] };
  const title =
    viewer === null ? `${capitalize(sideName(status.winner))} gagnent !` : viewer === status.winner ? 'Victoire !' : 'Défaite';
  return { title, detail: winDetail(status.reason, viewer, status.winner) };
}
```

- [ ] **Step 4 : Écrire `src/app/labels.ts`**

```ts
import type { Level } from '../core/types';
import type { GameSetup } from './game/session';

export const LEVEL_LABELS: Readonly<Record<Level, { readonly name: string; readonly description: string }>> = {
  faible: { name: 'Faible', description: 'Débutant : aide activée (indices, alertes, annulation)' },
  moyen: { name: 'Moyen', description: 'Bon joueur de club' },
  expert: { name: 'Expert', description: 'Très fort : réfléchit plusieurs secondes' },
};

export function modeTitle(setup: GameSetup): string {
  return setup.mode === 'ai' && setup.level ? `Contre l'ordinateur · ${LEVEL_LABELS[setup.level].name}` : '2 joueurs';
}
```

- [ ] **Step 5 : Écrire `src/app/sound.ts`**

```ts
import { logWarning } from './log';

export type SoundKind = 'move' | 'capture' | 'check' | 'end';

const TONES: Readonly<Record<SoundKind, { readonly frequency: number; readonly duration: number }>> = {
  move: { frequency: 440, duration: 0.06 },
  capture: { frequency: 300, duration: 0.1 },
  check: { frequency: 660, duration: 0.12 },
  end: { frequency: 520, duration: 0.3 },
};

let context: AudioContext | null = null;

/** Petit bip synthétisé : aucun fichier audio à télécharger. */
export function playSound(kind: SoundKind, enabled: boolean): void {
  if (!enabled) return;
  try {
    context ??= new AudioContext();
    const { frequency, duration } = TONES[kind];
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.15, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  } catch (error) {
    logWarning('[son] lecture impossible', error);
  }
}
```

- [ ] **Step 6 : Écrire les composants**

`src/app/components/ConfirmDialog.tsx` :
```tsx
interface ConfirmDialogProps {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  return (
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div class="modal">
        <h2 id="confirm-title">{props.title}</h2>
        <p>{props.message}</p>
        <button type="button" class="btn btn-primary" onClick={props.onCancel}>
          {props.cancelLabel}
        </button>
        <button type="button" class="btn btn-small btn-danger" onClick={props.onConfirm}>
          {props.confirmLabel}
        </button>
      </div>
    </div>
  );
}
```

`src/app/components/EndDialog.tsx` :
```tsx
import type { ResultText } from '../../chess/explain';

interface EndDialogProps {
  readonly result: ResultText;
  readonly onReplay: () => void;
  readonly onMenu: () => void;
  readonly onClose: () => void;
  readonly onUndo?: () => void;
}

export function EndDialog({ result, onReplay, onMenu, onClose, onUndo }: EndDialogProps) {
  return (
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="end-title">
      <div class="modal">
        <h2 id="end-title">{result.title}</h2>
        {result.detail && <p>{result.detail}</p>}
        <button type="button" class="btn btn-primary" onClick={onReplay}>
          Rejouer
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

`src/app/components/CapturedRow.tsx` :
```tsx
import type { Color } from '../../core/types';
import { pieceLabel } from '../../chess/names';
import { pieceImage } from '../../chess/pieces';
import type { PieceType } from '../../chess/types';

interface CapturedRowProps {
  /** Couleur des pièces perdues. */
  readonly color: Color;
  readonly pieces: readonly PieceType[];
}

export function CapturedRow({ color, pieces }: CapturedRowProps) {
  return (
    <div class="captured" aria-label={color === 'white' ? 'Pièces blanches prises' : 'Pièces noires prises'}>
      {pieces.map((type, index) => (
        <img key={`${type}-${index}`} src={pieceImage(color, type)} alt={pieceLabel(color, type)} />
      ))}
    </div>
  );
}
```

- [ ] **Step 7 : Lancer les tests unitaires**

Run : `npx vitest run tests/unit/chess/explain.test.ts tests/unit/app/labels.test.ts tests/unit/app/dialogs.test.tsx`
Expected : PASS (5 + 2 + 4 tests).

- [ ] **Step 8 : Écrire le hook `src/app/game/useChessGame.ts`**

Couvert par les tests de bout en bout (Tâche 16), exclu de la couverture unitaire.

```ts
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { EMPTY_INPUT, dropPiece, tapSquare, type InputResult, type InputState } from '../../board/move-input';
import { chessAdapter, chessMoveCodec, legalMoves, moveInfo, play, turnOf } from '../../chess/adapter';
import { BLUNDER_DEPTH, HINT_DEPTH } from '../../chess/engine/levels';
import { engineErrorMessage } from '../../chess/engine/errors';
import { detectBlunder, type BlunderVerdict } from '../../chess/help/blunder';
import { hintText } from '../../chess/help/hint';
import type { ChessMove, ChessPos } from '../../chess/types';
import type { Engine, Evaluation } from '../../core/types';
import { logWarning } from '../log';
import { playSound } from '../sound';
import { STORAGE_KEYS, type AppStorage } from '../storage';
import { toRecord } from './record';
import { applyMove, canUndo, currentPosition, isHumanTurn, resign, undoLastHumanMove, type Session } from './session';

export type ChessSession = Session<ChessPos, ChessMove>;

export interface Hint {
  readonly move: ChessMove;
  readonly text: string;
}

export interface BlunderPrompt {
  readonly move: ChessMove;
  readonly message: string;
}

export interface ChessGameDeps {
  readonly engine: () => Engine<ChessPos, ChessMove>;
  readonly storage: AppStorage;
  readonly sound: boolean;
}

export interface ChessGame {
  readonly session: ChessSession;
  readonly position: ChessPos;
  readonly legal: readonly ChessMove[];
  readonly input: InputState;
  readonly promotionChoices: readonly ChessMove[] | null;
  readonly thinking: boolean;
  readonly checking: boolean;
  readonly hint: Hint | null;
  readonly blunder: BlunderPrompt | null;
  readonly engineError: string | null;
  readonly humanTurn: boolean;
  readonly undoAvailable: boolean;
  readonly faibleHelp: boolean;
  tap(square: string): void;
  drop(from: string, to: string): void;
  choosePromotion(move: ChessMove): void;
  cancelPromotion(): void;
  requestHint(): void;
  confirmBlunder(): void;
  cancelBlunder(): void;
  undo(): void;
  resignGame(): void;
  retryEngine(): void;
}

export function useChessGame(initial: ChessSession, deps: ChessGameDeps): ChessGame {
  const [session, setSession] = useState(initial);
  const [input, setInput] = useState<InputState>(EMPTY_INPUT);
  const [promotionChoices, setPromotionChoices] = useState<readonly ChessMove[] | null>(null);
  const [thinking, setThinking] = useState(false);
  const [checking, setChecking] = useState(false);
  const [hint, setHint] = useState<Hint | null>(null);
  const [blunder, setBlunder] = useState<BlunderPrompt | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [engineAttempt, setEngineAttempt] = useState(0);
  const beforeEval = useRef<Promise<Evaluation> | null>(null);

  const position = currentPosition(session);
  const ongoing = session.result.kind === 'ongoing';
  const humanTurn = ongoing && isHumanTurn(chessAdapter, session);
  const legal = useMemo(() => (humanTurn ? legalMoves(position) : []), [position, humanTurn]);
  const faibleHelp = session.setup.mode === 'ai' && session.setup.level === 'faible';
  const busy = thinking || checking || blunder !== null;

  const commit = (base: ChessSession, move: ChessMove) => {
    const info = moveInfo(currentPosition(base), move);
    const next = applyMove(chessAdapter, base, move);
    setSession(next);
    setHint(null);
    setInput(EMPTY_INPUT);
    setPromotionChoices(null);
    const kind = next.result.kind !== 'ongoing' ? 'end' : info.givesCheck ? 'check' : info.captured ? 'capture' : 'move';
    playSound(kind, deps.sound);
  };

  // Sauvegarde automatique : partie en cours enregistrée, partie finie effacée.
  useEffect(() => {
    if (session.result.kind === 'ongoing') {
      deps.storage.write(STORAGE_KEYS.chessSavedGame, toRecord(chessAdapter, chessMoveCodec, session));
    } else {
      deps.storage.remove(STORAGE_KEYS.chessSavedGame);
    }
  }, [session]);

  // Tour de l'ordinateur.
  useEffect(() => {
    if (session.setup.mode !== 'ai' || !ongoing || isHumanTurn(chessAdapter, session)) return undefined;
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
    const pending = deps.engine().analyse(position, BLUNDER_DEPTH);
    // Évite un rejet non géré : l'erreur est traitée là où la promesse est attendue (checkForBlunder).
    pending.catch(() => undefined);
    beforeEval.current = pending;
  }, [session]);

  const checkForBlunder = async (base: ChessSession, move: ChessMove): Promise<BlunderVerdict> => {
    const pos = currentPosition(base);
    const before = await (beforeEval.current ?? deps.engine().analyse(pos, BLUNDER_DEPTH));
    const after = play(pos, move);
    if (chessAdapter.status(after).kind !== 'ongoing') return { blunder: false };
    return detectBlunder(pos, move, before, await deps.engine().analyse(after, BLUNDER_DEPTH));
  };

  const submitHumanMove = (move: ChessMove) => {
    setInput(EMPTY_INPUT);
    setPromotionChoices(null);
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

  const handleInput = (result: InputResult<ChessMove>) => {
    setInput(result.state);
    if (result.choices) setPromotionChoices(result.choices);
    else if (result.move) submitHumanMove(result.move);
  };

  const canAct = humanTurn && !busy && promotionChoices === null;

  return {
    session,
    position,
    legal,
    input,
    promotionChoices,
    thinking,
    checking,
    hint,
    blunder,
    engineError,
    humanTurn,
    faibleHelp,
    undoAvailable: canUndo(chessAdapter, session) && !busy,
    tap: (square) => {
      if (canAct) handleInput(tapSquare(input, square, legal));
    },
    drop: (from, to) => {
      if (canAct) handleInput(dropPiece(from, to, legal));
    },
    choosePromotion: (move) => {
      setPromotionChoices(null);
      submitHumanMove(move);
    },
    cancelPromotion: () => {
      setPromotionChoices(null);
      setInput(EMPTY_INPUT);
    },
    requestHint: () => {
      if (!faibleHelp || !canAct) return;
      const pos = position;
      setChecking(true);
      deps
        .engine()
        .analyse(pos, HINT_DEPTH)
        .then((analysis) => setHint({ move: analysis.best, text: hintText(pos, analysis.best) }))
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
      if (!canUndo(chessAdapter, session) || busy) return;
      setSession(undoLastHumanMove(chessAdapter, session));
      setHint(null);
      setInput(EMPTY_INPUT);
    },
    resignGame: () => {
      const loser = session.setup.mode === 'ai' ? session.setup.playerColor : turnOf(position);
      setSession(resign(session, loser));
    },
    retryEngine: () => {
      setEngineError(null);
      setEngineAttempt((attempt) => attempt + 1);
    },
  };
}
```

- [ ] **Step 9 : Écrire `src/app/screens/PlayScreen.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Board } from '../../board/Board';
import { chessGeometry } from '../../board/geometry';
import { targetsOf } from '../../board/move-input';
import { checkedKingSquare, turnOf } from '../../chess/adapter';
import { getChessEngine } from '../../chess/engine';
import { explainResult } from '../../chess/explain';
import { capturedPieces, chessBoardPieces } from '../../chess/view';
import { opposite } from '../../core/types';
import { CapturedRow } from '../components/CapturedRow';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EndDialog } from '../components/EndDialog';
import { PromotionPicker } from '../components/PromotionPicker';
import { lastMove } from '../game/session';
import { useChessGame, type ChessGame, type ChessSession } from '../game/useChessGame';
import { modeTitle } from '../labels';
import type { AppStorage } from '../storage';

interface PlayScreenProps {
  readonly initial: ChessSession;
  readonly storage: AppStorage;
  readonly sound: boolean;
  readonly notice?: string | null;
  readonly onExit: () => void;
  readonly onNewGame: () => void;
}

function statusText(game: ChessGame): string {
  const { session, position } = game;
  const viewer = session.setup.mode === 'ai' ? session.setup.playerColor : null;
  if (session.result.kind !== 'ongoing') return explainResult(session.result, viewer).title;
  if (game.thinking) return "L'ordinateur réfléchit…";
  if (game.checking) return 'Un instant…';
  const inCheck = checkedKingSquare(position) !== null;
  if (session.setup.mode === 'local') {
    return `Au tour des ${turnOf(position) === 'white' ? 'Blancs' : 'Noirs'}${inCheck ? ' : échec !' : ''}`;
  }
  return inCheck ? 'À toi de jouer : ton roi est en échec !' : 'À toi de jouer';
}

export function PlayScreen(props: PlayScreenProps) {
  const game = useChessGame(props.initial, { engine: getChessEngine, storage: props.storage, sound: props.sound });
  const { session, position } = game;
  const [confirmResign, setConfirmResign] = useState(false);
  const [endDismissed, setEndDismissed] = useState(false);
  const bottom = session.setup.mode === 'ai' ? session.setup.playerColor : 'white';
  const geometry = useMemo(() => chessGeometry(bottom), [bottom]);
  const last = lastMove(session);
  const captured = capturedPieces(position);
  const finished = session.result.kind !== 'ongoing';
  const viewer = session.setup.mode === 'ai' ? session.setup.playerColor : null;

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
          pieces={chessBoardPieces(position)}
          selected={game.input.selected}
          targets={targetsOf(game.input.selected, game.legal)}
          highlights={last ? [last.from, last.to] : []}
          check={checkedKingSquare(position)}
          arrows={game.hint ? [game.hint.move] : []}
          animate={last}
          onSquareTap={game.tap}
          onDrop={game.drop}
          canDrag={(square) => game.legal.some((move) => move.from === square)}
        />
      </div>
      <CapturedRow color={opposite(bottom)} pieces={captured[opposite(bottom)]} />
      <p class="status-line" role="status">
        {statusText(game)}
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
          <button type="button" class="btn btn-small btn-danger" onClick={() => setConfirmResign(true)}>
            Abandonner
          </button>
        )}
        <button type="button" class="btn btn-small" onClick={props.onNewGame}>
          Nouvelle partie
        </button>
      </div>
      {game.promotionChoices && (
        <PromotionPicker color={turnOf(position)} choices={game.promotionChoices} onPick={game.choosePromotion} onCancel={game.cancelPromotion} />
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
          result={explainResult(session.result, viewer)}
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

- [ ] **Step 10 : Vérifier le typage et les tests**

Run : `npx tsc -b`
Expected : aucune erreur.
Run : `npx vitest run`
Expected : PASS (tous les tests).

- [ ] **Step 11 : Commit**

```bash
git add src/chess/explain.ts src/app/labels.ts src/app/sound.ts src/app/components src/app/game/useChessGame.ts src/app/screens/PlayScreen.tsx tests/unit/chess/explain.test.ts tests/unit/app/labels.test.ts tests/unit/app/dialogs.test.tsx
git commit -m "feat: écran de partie avec IA, aide du niveau Faible et fin de partie"
```

---

### Task 11 : Moteur de leçons générique + règles des leçons d'échecs

**Files:**
- Create: `src/lessons/types.ts`, `src/lessons/runner.ts`, `src/chess/lesson-rules.ts`
- Test: `tests/unit/lessons/runner.test.ts`

**Interfaces:**
- Consumes: `Color`, `GameStatus`, `Level` (Tâche 2) ; `parseChess`, `legalMoves`, `play`, `setTurn`, `turnOf`, `status`, `toUci`, `fromUci` (Tâche 2).
- Produces :
  - `lessons/types.ts` : `Exercise` (union `reach | collect | find-move | mate-in-1 | play-out`, cf. spec §6.1), `Lesson { id; title; intro; exercises }`, `LessonRules<Pos, Move>` (`parse`, `legalMoves`, `play`, `keepTurn`, `turn`, `status`, `moveId`, `destination`, `isPromotion`).
  - `lessons/runner.ts` : `RunStatus = 'playing' | 'waiting-opponent' | 'success' | 'failed'`, `Feedback { tone: 'success' | 'error' | 'info'; text }`, `ExerciseRun<Pos>`, `SUCCESS_TEXT`, `starsOf(exercise)`, `startExercise(rules, exercise)`, `playPlayerMove(rules, run, move)`, `playOpponentMove(rules, run, move)`.
  - `chess/lesson-rules.ts` : `chessLessonRules: LessonRules<ChessPos, ChessMove>`.

- [ ] **Step 1 : Écrire les tests qui échouent**

`tests/unit/lessons/runner.test.ts` :
```ts
import { describe, expect, it } from 'vitest';
import { fromUci } from '../../../src/chess/adapter';
import { chessLessonRules as rules } from '../../../src/chess/lesson-rules';
import { SUCCESS_TEXT, playOpponentMove, playPlayerMove, startExercise, starsOf } from '../../../src/lessons/runner';
import type { Exercise } from '../../../src/lessons/types';

const move = (uci: string) => fromUci(uci);

describe('déroulé des exercices', () => {
  it('ramasse les étoiles coup après coup en gardant le trait', () => {
    const exercise: Exercise = { kind: 'collect', position: '8/8/8/8/8/8/8/R7 w - - 0 1', instruction: 'Ramasse les étoiles.', stars: ['a5', 'e5'] };
    const run0 = startExercise(rules, exercise);
    expect(run0.player).toBe('white');
    expect(run0.remainingStars).toEqual(['a5', 'e5']);
    const run1 = playPlayerMove(rules, run0, move('a1a5'));
    expect(run1.status).toBe('playing');
    expect(run1.remainingStars).toEqual(['e5']);
    expect(rules.turn(run1.pos)).toBe('white');
    const run2 = playPlayerMove(rules, run1, move('a5e5'));
    expect(run2.status).toBe('success');
    expect(run2.feedback).toEqual({ tone: 'success', text: SUCCESS_TEXT });
    expect(playPlayerMove(rules, run2, move('e5e6'))).toBe(run2);
  });

  it('traite « atteindre une case » comme une seule étoile', () => {
    const exercise: Exercise = { kind: 'reach', position: '8/8/8/8/8/8/8/4R3 w - - 0 1', instruction: 'Va en e8.', target: 'e8' };
    expect(starsOf(exercise)).toEqual(['e8']);
    expect(playPlayerMove(rules, startExercise(rules, exercise), move('e1e8')).status).toBe('success');
  });

  it('valide le bon coup et explique un mauvais coup', () => {
    const exercise: Exercise = {
      kind: 'find-move',
      position: 'r3k3/8/8/8/8/8/1p6/Q3K3 w - - 0 1',
      instruction: 'Prends la pièce qui vaut le plus.',
      solutions: ['a1a8'],
      wrongMoveHints: { a1b2: 'Le pion ne vaut que 1 point.' },
    };
    const run = startExercise(rules, exercise);
    const wrong = playPlayerMove(rules, run, move('a1b2'));
    expect(wrong.status).toBe('playing');
    expect(wrong.pos).toBe(run.start);
    expect(wrong.feedback).toEqual({ tone: 'error', text: 'Le pion ne vaut que 1 point.' });
    expect(playPlayerMove(rules, run, move('a1c1')).feedback?.text).toBe("Ce n'est pas le bon coup. Réessaie !");
    expect(playPlayerMove(rules, run, move('a1a8')).status).toBe('success');
  });

  it('valide un mat en 1 et refuse un coup qui ne mate pas', () => {
    const exercise: Exercise = { kind: 'mate-in-1', position: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', instruction: 'Fais échec et mat.' };
    const run = startExercise(rules, exercise);
    expect(playPlayerMove(rules, run, move('a1a8')).status).toBe('success');
    const miss = playPlayerMove(rules, run, move('a1a7'));
    expect(miss.status).toBe('playing');
    expect(miss.feedback?.tone).toBe('error');
  });

  it('joue une fin de partie contre l’ordinateur jusqu’à la promotion', () => {
    const exercise: Exercise = { kind: 'play-out', position: '8/8/1P6/8/8/8/k7/4K3 w - - 0 1', instruction: 'Fais une dame.', goal: 'promote', level: 'faible' };
    const run0 = startExercise(rules, exercise);
    const run1 = playPlayerMove(rules, run0, move('b6b7'));
    expect(run1.status).toBe('waiting-opponent');
    expect(playPlayerMove(rules, run1, move('e1e2'))).toBe(run1);
    const run2 = playOpponentMove(rules, run1, move('a2b3'));
    expect(run2.status).toBe('playing');
    expect(playOpponentMove(rules, run2, move('b3c4'))).toBe(run2);
    const run3 = playPlayerMove(rules, run2, move('b7b8q'));
    expect(run3.status).toBe('success');
  });

  it('réussit une fin de partie gagnée par mat', () => {
    const exercise: Exercise = { kind: 'play-out', position: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', instruction: 'Gagne.', goal: 'win', level: 'expert' };
    expect(playPlayerMove(rules, startExercise(rules, exercise), move('a1a8')).status).toBe('success');
  });

  it('échoue si la partie devient nulle ou perdue', () => {
    const stalemate: Exercise = { kind: 'play-out', position: 'k7/8/1K6/8/8/8/8/2Q5 w - - 0 1', instruction: 'Gagne.', goal: 'win', level: 'expert' };
    const drawn = playPlayerMove(rules, startExercise(rules, stalemate), move('c1c7'));
    expect(drawn.status).toBe('failed');
    expect(drawn.feedback?.text).toContain('Pat');
    const losing: Exercise = { kind: 'play-out', position: 'r5k1/8/8/8/8/8/5PPP/6K1 b - - 0 1', instruction: 'Défends-toi.', goal: 'win', level: 'expert' };
    const run = { ...startExercise(rules, losing), player: 'white' as const, status: 'waiting-opponent' as const };
    const lost = playOpponentMove(rules, run, move('a8a1'));
    expect(lost.status).toBe('failed');
    expect(lost.feedback?.text).toBe("L'ordinateur a gagné cette fois. Réessaie !");
  });

  it('échoue sur une autre nulle', () => {
    const exercise: Exercise = { kind: 'play-out', position: '8/8/8/8/8/2k5/8/K1b5 w - - 0 1', instruction: 'Gagne.', goal: 'win', level: 'expert' };
    const run = startExercise(rules, exercise);
    const drawn = playPlayerMove(rules, run, move('a1b1'));
    expect(drawn.status).toBe('failed');
    expect(drawn.feedback?.text).toBe("Partie nulle : l'objectif n'est pas atteint. Réessaie !");
  });
});
```

Explication des positions d'échec : `k7/8/1K6/8/8/8/8/2Q5 w` puis `Qc7` est pat ; `r5k1/…/6K1 b` puis `Ta1` est un mat du couloir donné par l'ordinateur ; `8/8/8/8/8/2k5/8/K1b5 w` : roi blanc contre roi + fou noir, après n'importe quel coup → matériel insuffisant.

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run tests/unit/lessons`
Expected : FAIL — modules `lessons/runner`, `lessons/types`, `chess/lesson-rules` introuvables.

- [ ] **Step 3 : Écrire `src/lessons/types.ts`**

```ts
import type { Color, GameStatus, Level } from '../core/types';

export type Exercise =
  | { readonly kind: 'reach'; readonly position: string; readonly instruction: string; readonly target: string }
  | { readonly kind: 'collect'; readonly position: string; readonly instruction: string; readonly stars: readonly string[] }
  | {
      readonly kind: 'find-move';
      readonly position: string;
      readonly instruction: string;
      readonly solutions: readonly string[];
      readonly wrongMoveHints?: Readonly<Record<string, string>>;
    }
  | { readonly kind: 'mate-in-1'; readonly position: string; readonly instruction: string }
  | {
      readonly kind: 'play-out';
      readonly position: string;
      readonly instruction: string;
      readonly goal: 'win' | 'promote';
      readonly level: Level;
    };

export interface Lesson {
  readonly id: string;
  readonly title: string;
  /** 2 ou 3 phrases d'explication. */
  readonly intro: readonly string[];
  /** 1 à 3 exercices. */
  readonly exercises: readonly Exercise[];
}

/** Ce dont le moteur de leçons a besoin d'un jeu. */
export interface LessonRules<Pos, Move> {
  parse(position: string): Pos;
  legalMoves(pos: Pos): readonly Move[];
  play(pos: Pos, move: Move): Pos;
  /** Redonne le trait au joueur (exercices sans adversaire). */
  keepTurn(pos: Pos, color: Color): Pos;
  turn(pos: Pos): Color;
  status(pos: Pos): GameStatus;
  moveId(move: Move): string;
  destination(move: Move): string;
  isPromotion(move: Move): boolean;
}
```

- [ ] **Step 4 : Écrire `src/lessons/runner.ts`**

```ts
import type { Color, GameStatus } from '../core/types';
import type { Exercise, LessonRules } from './types';

export type RunStatus = 'playing' | 'waiting-opponent' | 'success' | 'failed';

export interface Feedback {
  readonly tone: 'success' | 'error' | 'info';
  readonly text: string;
}

export interface ExerciseRun<Pos> {
  readonly exercise: Exercise;
  readonly start: Pos;
  readonly pos: Pos;
  readonly player: Color;
  readonly remainingStars: readonly string[];
  readonly status: RunStatus;
  readonly feedback: Feedback | null;
}

export const SUCCESS_TEXT = 'Bravo, exercice réussi !';
const SUCCESS: Feedback = { tone: 'success', text: SUCCESS_TEXT };
const WRONG_MOVE_TEXT = "Ce n'est pas le bon coup. Réessaie !";
const NOT_MATE_TEXT = "Ce coup ne fait pas échec et mat. Cherche un coup où le roi adverse est attaqué et ne peut plus s'échapper.";

export function starsOf(exercise: Exercise): readonly string[] {
  if (exercise.kind === 'collect') return exercise.stars;
  if (exercise.kind === 'reach') return [exercise.target];
  return [];
}

export function startExercise<Pos, Move>(rules: LessonRules<Pos, Move>, exercise: Exercise): ExerciseRun<Pos> {
  const pos = rules.parse(exercise.position);
  return { exercise, start: pos, pos, player: rules.turn(pos), remainingStars: starsOf(exercise), status: 'playing', feedback: null };
}

function failureText(status: GameStatus): string {
  if (status.kind === 'draw' && status.reason === 'stalemate') {
    return "Pat ! Le roi adverse n'est pas en échec mais ne peut plus bouger : c'est nulle. Réessaie en lui laissant une case.";
  }
  if (status.kind === 'draw') return "Partie nulle : l'objectif n'est pas atteint. Réessaie !";
  return "L'ordinateur a gagné cette fois. Réessaie !";
}

/** Après un coup d'une fin de partie : réussite, échec, ou on continue avec `next`. */
function settle<Pos, Move>(rules: LessonRules<Pos, Move>, run: ExerciseRun<Pos>, next: RunStatus): ExerciseRun<Pos> {
  const status = rules.status(run.pos);
  if (status.kind === 'ongoing') return { ...run, status: next, feedback: null };
  if (status.kind === 'win' && status.winner === run.player) return { ...run, status: 'success', feedback: SUCCESS };
  return { ...run, status: 'failed', feedback: { tone: 'error', text: failureText(status) } };
}

function collectStep<Pos, Move>(rules: LessonRules<Pos, Move>, run: ExerciseRun<Pos>, move: Move): ExerciseRun<Pos> {
  const pos = rules.keepTurn(rules.play(run.pos, move), run.player);
  const remainingStars = run.remainingStars.filter((star) => star !== rules.destination(move));
  const done = remainingStars.length === 0;
  return { ...run, pos, remainingStars, status: done ? 'success' : 'playing', feedback: done ? SUCCESS : null };
}

export function playPlayerMove<Pos, Move>(rules: LessonRules<Pos, Move>, run: ExerciseRun<Pos>, move: Move): ExerciseRun<Pos> {
  if (run.status !== 'playing') return run;
  const exercise = run.exercise;
  switch (exercise.kind) {
    case 'reach':
    case 'collect':
      return collectStep(rules, run, move);
    case 'find-move': {
      const id = rules.moveId(move);
      if (exercise.solutions.includes(id)) return { ...run, pos: rules.play(run.pos, move), status: 'success', feedback: SUCCESS };
      return { ...run, pos: run.start, feedback: { tone: 'error', text: exercise.wrongMoveHints?.[id] ?? WRONG_MOVE_TEXT } };
    }
    case 'mate-in-1': {
      const after = rules.play(run.pos, move);
      const status = rules.status(after);
      if (status.kind === 'win' && status.winner === run.player) return { ...run, pos: after, status: 'success', feedback: SUCCESS };
      return { ...run, pos: run.start, feedback: { tone: 'error', text: NOT_MATE_TEXT } };
    }
    case 'play-out': {
      const after = { ...run, pos: rules.play(run.pos, move) };
      if (exercise.goal === 'promote' && rules.isPromotion(move)) return { ...after, status: 'success', feedback: SUCCESS };
      return settle(rules, after, 'waiting-opponent');
    }
  }
}

export function playOpponentMove<Pos, Move>(rules: LessonRules<Pos, Move>, run: ExerciseRun<Pos>, move: Move): ExerciseRun<Pos> {
  if (run.status !== 'waiting-opponent') return run;
  return settle(rules, { ...run, pos: rules.play(run.pos, move) }, 'playing');
}
```

- [ ] **Step 5 : Écrire `src/chess/lesson-rules.ts`**

```ts
import type { LessonRules } from '../lessons/types';
import { legalMoves, parseChess, play, setTurn, status, toUci, turnOf } from './adapter';
import type { ChessMove, ChessPos } from './types';

export const chessLessonRules: LessonRules<ChessPos, ChessMove> = {
  parse: (position) => parseChess(position, { allowMissingKings: true }),
  legalMoves,
  play,
  keepTurn: setTurn,
  turn: turnOf,
  status,
  moveId: toUci,
  destination: (move) => move.to,
  isPromotion: (move) => move.promotion !== undefined,
};
```

- [ ] **Step 6 : Lancer les tests**

Run : `npx vitest run tests/unit/lessons`
Expected : PASS (8 tests).

- [ ] **Step 7 : Commit**

```bash
git add src/lessons src/chess/lesson-rules.ts tests/unit/lessons
git commit -m "feat: moteur de leçons générique et règles des leçons d'échecs"
```

---

### Task 12 : Les 17 leçons d'échecs (données) + test de validité

**Files:**
- Create: `src/chess/lessons/pieces.ts`, `src/chess/lessons/rules.ts`, `src/chess/lessons/strategy.ts`, `src/chess/lessons/index.ts`
- Test: `tests/unit/chess/lessons.test.ts`

**Interfaces:**
- Consumes: `Lesson`, `Exercise` (Tâche 11) ; `chessLessonRules`, `startExercise`, `playPlayerMove` (Tâche 11) ; `parseChess`, `status`, `toUci`, `START_FEN` (Tâche 2).
- Produces : `CHESS_LESSONS: readonly Lesson[]` (17 leçons, dans l'ordre de la spec §6.2), `findChessLesson(id): Lesson | undefined`.

Toutes les positions ci-dessous ont été vérifiées avec chess.js (coups légaux, mats) ; le test de l'étape 1 le garantit dans la durée.

- [ ] **Step 1 : Écrire le test qui échoue**

`tests/unit/chess/lessons.test.ts` :
```ts
import { describe, expect, it } from 'vitest';
import { parseChess, status, toUci } from '../../../src/chess/adapter';
import { chessLessonRules as rules } from '../../../src/chess/lesson-rules';
import { CHESS_LESSONS, findChessLesson } from '../../../src/chess/lessons';
import type { ChessPos } from '../../../src/chess/types';
import { playPlayerMove, startExercise, starsOf, type ExerciseRun } from '../../../src/lessons/runner';
import type { Exercise } from '../../../src/lessons/types';

const SQUARE = /^[a-h][1-8]$/;

/** Recherche en largeur : les étoiles peuvent-elles toutes être ramassées ? */
function solvesStars(exercise: Exercise, maxDepth = 10): boolean {
  let frontier: ExerciseRun<ChessPos>[] = [startExercise(rules, exercise)];
  const seen = new Set<string>();
  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth += 1) {
    const next: ExerciseRun<ChessPos>[] = [];
    for (const run of frontier) {
      for (const move of rules.legalMoves(run.pos)) {
        const after = playPlayerMove(rules, run, move);
        if (after.status === 'success') return true;
        const key = `${after.pos.fen}|${after.remainingStars.join(',')}`;
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
  const legal = rules.legalMoves(pos).map(toUci);
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
      expect(status(parseChess(exercise.position))).toEqual({ kind: 'ongoing' });
      break;
  }
}

describe('leçons d’échecs', () => {
  it('propose 17 leçons aux identifiants uniques', () => {
    expect(CHESS_LESSONS).toHaveLength(17);
    expect(new Set(CHESS_LESSONS.map((lesson) => lesson.id)).size).toBe(17);
    expect(findChessLesson('roque')?.title).toBe('Le roque');
    expect(findChessLesson('inconnue')).toBeUndefined();
  });

  it.each(CHESS_LESSONS.map((lesson) => [lesson.id, lesson] as const))('%s : explication courte et 1 à 3 exercices', (_, lesson) => {
    expect(lesson.intro.length).toBeGreaterThanOrEqual(1);
    expect(lesson.intro.length).toBeLessThanOrEqual(3);
    expect(lesson.exercises.length).toBeGreaterThanOrEqual(1);
    expect(lesson.exercises.length).toBeLessThanOrEqual(3);
  });

  const exercises = CHESS_LESSONS.flatMap((lesson) =>
    lesson.exercises.map((exercise, index) => [`${lesson.id} n°${index + 1}`, exercise] as const),
  );

  it.each(exercises)('%s : position valide et exercice faisable', (_, exercise) => {
    checkExercise(exercise);
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run : `npx vitest run tests/unit/chess/lessons.test.ts`
Expected : FAIL — module `src/chess/lessons` introuvable.

- [ ] **Step 3 : Écrire `src/chess/lessons/pieces.ts` (leçons 1 à 7)**

```ts
import type { Lesson } from '../../lessons/types';

export const PIECE_LESSONS: readonly Lesson[] = [
  {
    id: 'plateau',
    title: 'Le plateau et le but du jeu',
    intro: [
      "L'échiquier a 64 cases, claires et foncées. Chaque case a un nom : une lettre pour la colonne (de a à h) et un chiffre pour la rangée (de 1 à 8).",
      'Les Blancs jouent toujours en premier, puis chacun joue à son tour, un coup à la fois.',
      "Le but du jeu : faire « échec et mat », c'est-à-dire attaquer le roi adverse sans qu'il puisse s'échapper.",
    ],
    exercises: [
      {
        kind: 'reach',
        position: '8/8/8/8/8/8/8/4R3 w - - 0 1',
        instruction: "Pour jouer, touche une pièce puis la case où tu veux l'amener. Amène la tour sur l'étoile, en e8.",
        target: 'e8',
      },
    ],
  },
  {
    id: 'tour',
    title: 'La tour',
    intro: [
      "La tour se déplace en ligne droite : vers le haut, le bas, la gauche ou la droite, d'autant de cases qu'elle veut.",
      'Elle ne peut pas sauter par-dessus une autre pièce.',
    ],
    exercises: [
      { kind: 'collect', position: '8/8/8/8/8/8/8/R7 w - - 0 1', instruction: 'Ramasse toutes les étoiles avec la tour.', stars: ['a5', 'e5', 'e8'] },
      {
        kind: 'collect',
        position: '8/8/8/8/3P4/8/8/3R4 w - - 0 1',
        instruction: "Ton pion bloque le chemin : contourne-le avec la tour pour atteindre l'étoile.",
        stars: ['d6'],
      },
    ],
  },
  {
    id: 'fou',
    title: 'Le fou',
    intro: ["Le fou se déplace en diagonale, d'autant de cases qu'il veut.", 'Il reste toujours sur des cases de la même couleur.'],
    exercises: [
      { kind: 'collect', position: '8/8/8/8/8/8/8/2B5 w - - 0 1', instruction: 'Ramasse toutes les étoiles avec le fou.', stars: ['e3', 'h6', 'f8'] },
    ],
  },
  {
    id: 'dame',
    title: 'La dame',
    intro: [
      'La dame est la pièce la plus puissante : elle se déplace comme la tour ET comme le fou.',
      "En ligne droite ou en diagonale, d'autant de cases qu'elle veut.",
    ],
    exercises: [
      { kind: 'collect', position: '8/8/8/8/8/8/8/3Q4 w - - 0 1', instruction: 'Ramasse toutes les étoiles avec la dame.', stars: ['d5', 'h1', 'a8'] },
    ],
  },
  {
    id: 'roi',
    title: 'Le roi',
    intro: [
      "Le roi se déplace d'une seule case, dans n'importe quelle direction.",
      "C'est la pièce la plus importante : s'il est mis échec et mat, la partie est perdue. Il ne peut jamais aller sur une case attaquée.",
    ],
    exercises: [
      { kind: 'collect', position: '8/8/8/8/8/8/8/4K3 w - - 0 1', instruction: 'Ramasse les étoiles avec le roi, une case à la fois.', stars: ['e3', 'f4', 'd5'] },
    ],
  },
  {
    id: 'cavalier',
    title: 'Le cavalier',
    intro: [
      'Le cavalier se déplace en « L » : deux cases tout droit, puis une case sur le côté.',
      "C'est la seule pièce qui peut sauter par-dessus les autres.",
    ],
    exercises: [
      { kind: 'collect', position: '8/8/8/8/8/8/8/1N6 w - - 0 1', instruction: 'Ramasse toutes les étoiles avec le cavalier.', stars: ['c3', 'd5', 'f6'] },
      {
        kind: 'reach',
        position: '8/8/8/8/PPP5/PNP5/PPP5/8 w - - 0 1',
        instruction: "Ton cavalier est entouré de pions : saute par-dessus pour atteindre l'étoile.",
        target: 'd4',
      },
    ],
  },
  {
    id: 'pion',
    title: 'Le pion',
    intro: [
      'Le pion avance tout droit, une case à la fois. À son tout premier coup, il peut avancer de deux cases.',
      'Il ne recule jamais. Pour prendre, il avance d’une case en diagonale.',
    ],
    exercises: [
      {
        kind: 'collect',
        position: '8/8/8/8/8/8/4P3/8 w - - 0 1',
        instruction: "Avance le pion jusqu'aux étoiles. Au premier coup, il peut faire deux pas !",
        stars: ['e4', 'e5'],
      },
      {
        kind: 'find-move',
        position: '8/8/8/8/3p4/4P3/8/8 w - - 0 1',
        instruction: 'Le pion prend en diagonale : prends le pion noir.',
        solutions: ['e3d4'],
        wrongMoveHints: { e3e4: 'Le pion ne prend jamais tout droit : il prend en diagonale.' },
      },
    ],
  },
];
```

- [ ] **Step 4 : Écrire `src/chess/lessons/rules.ts` (leçons 8 à 14)**

```ts
import type { Lesson } from '../../lessons/types';

export const RULE_LESSONS: readonly Lesson[] = [
  {
    id: 'prises',
    title: 'Prendre, et la valeur des pièces',
    intro: [
      'Pour prendre une pièce adverse, on va sur sa case : elle est retirée du plateau.',
      'Les pièces n’ont pas toutes la même valeur : pion 1, cavalier 3, fou 3, tour 5, dame 9. Le roi ne peut jamais être pris.',
      'Quand tu as le choix, prends la pièce qui vaut le plus !',
    ],
    exercises: [
      { kind: 'collect', position: '8/1p4p1/8/8/8/8/1p6/1R6 w - - 0 1', instruction: 'Prends tous les pions noirs avec ta tour.', stars: ['b2', 'b7', 'g7'] },
      {
        kind: 'find-move',
        position: 'r3k3/8/8/8/8/8/1p6/Q3K3 w - - 0 1',
        instruction: 'Ta dame peut prendre deux pièces. Choisis la plus précieuse.',
        solutions: ['a1a8'],
        wrongMoveHints: { a1b2: 'Le pion ne vaut que 1 point. La tour vaut 5 : prends plutôt la tour !' },
      },
    ],
  },
  {
    id: 'echec',
    title: "L'échec et comment en sortir",
    intro: [
      "Quand le roi est attaqué, on dit qu'il est « en échec ». Il faut le sortir de l'échec tout de suite.",
      "Il y a trois façons : déplacer le roi (fuir), mettre une pièce entre le roi et l'attaquant (bloquer), ou prendre la pièce qui attaque.",
    ],
    exercises: [
      {
        kind: 'find-move',
        position: 'k7/8/8/8/8/8/8/r3K3 w - - 0 1',
        instruction: "Ton roi est en échec par la tour. Fuis : déplace le roi sur une case où il n'est plus attaqué.",
        solutions: ['e1d2', 'e1e2', 'e1f2'],
      },
      {
        kind: 'find-move',
        position: '7k/8/8/8/8/3B4/5PPP/r5K1 w - - 0 1',
        instruction: "Ton roi est en échec et ne peut pas bouger. Bloque l'attaque avec ton fou.",
        solutions: ['d3f1', 'd3b1'],
      },
      {
        kind: 'find-move',
        position: '6k1/8/8/4R3/8/8/5PPP/4r1K1 w - - 0 1',
        instruction: 'Ton roi est en échec. Prends la pièce qui attaque !',
        solutions: ['e5e1'],
      },
    ],
  },
  {
    id: 'mat',
    title: "L'échec et mat",
    intro: [
      "Si le roi est en échec et qu'aucune des trois défenses ne marche, c'est « échec et mat » : la partie est finie.",
      'À toi de donner le mat en un seul coup !',
    ],
    exercises: [
      { kind: 'mate-in-1', position: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', instruction: 'Le roi noir est coincé derrière ses pions. Fais échec et mat avec la tour.' },
      { kind: 'mate-in-1', position: 'k7/8/1K6/8/8/8/8/7Q w - - 0 1', instruction: 'Ta dame et ton roi travaillent ensemble. Fais échec et mat.' },
      { kind: 'mate-in-1', position: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', instruction: 'Le roi noir est entouré de ses propres pièces. Fais échec et mat avec le cavalier.' },
    ],
  },
  {
    id: 'pat',
    title: 'Le pat et la partie nulle',
    intro: [
      "Si le joueur qui doit jouer n'a AUCUN coup possible mais que son roi n'est pas en échec, c'est « pat » : la partie est nulle, personne ne gagne.",
      "D'autres parties sont nulles : quand la même position revient trois fois, ou quand il ne reste pas assez de pièces pour mater.",
      'Quand tu gagnes, attention au pat : laisse toujours une case au roi adverse avant de le mater !',
    ],
    exercises: [
      {
        kind: 'find-move',
        position: 'k7/8/1K6/8/8/8/8/2Q5 w - - 0 1',
        instruction: 'Fais échec et mat, mais attention au pat !',
        solutions: ['c1c8'],
        wrongMoveHints: { c1c7: "Pat ! Le roi noir n'est pas en échec mais ne peut plus bouger : ce serait nulle. Cherche le mat." },
      },
    ],
  },
  {
    id: 'roque',
    title: 'Le roque',
    intro: [
      'Le roque est un coup spécial : en un seul coup, tu mets ton roi à l’abri et tu sors ta tour.',
      'Le roi se déplace de deux cases vers une tour, et la tour saute de l’autre côté du roi. Pour roquer, touche ton roi puis la case à deux pas.',
      "Conditions : ni le roi ni la tour n'ont encore bougé, aucune pièce entre eux, et le roi n'est pas en échec et ne traverse pas une case attaquée.",
    ],
    exercises: [
      {
        kind: 'find-move',
        position: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        instruction: 'Fais le petit roque : touche ton roi, puis la case g1.',
        solutions: ['e1g1'],
        wrongMoveHints: { e1c1: "Ça, c'est le grand roque (côté dame). Ici, on veut le petit roque, du côté de la tour h1." },
      },
      {
        kind: 'find-move',
        position: 'r3k3/8/8/8/2b5/8/8/R3K2R w KQq - 0 1',
        instruction: 'Le fou noir attaque la case f1 : le petit roque est interdit. Fais le grand roque !',
        solutions: ['e1c1'],
      },
    ],
  },
  {
    id: 'promotion',
    title: 'La promotion',
    intro: [
      'Quand un pion arrive sur la dernière rangée, il se transforme : tu choisis une dame, une tour, un fou ou un cavalier.',
      'On choisit presque toujours la dame, la pièce la plus forte.',
    ],
    exercises: [
      {
        kind: 'find-move',
        position: '8/4P3/8/8/8/2k5/8/4K3 w - - 0 1',
        instruction: "Avance ton pion jusqu'au bout et transforme-le en la pièce la plus forte.",
        solutions: ['e7e8q'],
        wrongMoveHints: {
          e7e8r: "Une tour, c'est bien, mais une dame est encore plus forte !",
          e7e8b: "Un fou est moins fort qu'une dame. Choisis la dame !",
          e7e8n: "Un cavalier est moins fort qu'une dame. Choisis la dame !",
        },
      },
      {
        kind: 'play-out',
        position: '8/8/1P6/8/8/8/k7/4K3 w - - 0 1',
        instruction: "Mène ton pion jusqu'au bout pour faire une dame. Le roi noir va essayer de l'arrêter !",
        goal: 'promote',
        level: 'expert',
      },
    ],
  },
  {
    id: 'en-passant',
    title: 'La prise en passant',
    intro: [
      'La prise en passant est une règle spéciale des pions.',
      "Si un pion adverse avance de deux cases et s'arrête juste à côté de ton pion, tu peux le prendre comme s'il n'avait avancé que d'une case. Attention : seulement au coup qui suit !",
    ],
    exercises: [
      {
        kind: 'find-move',
        position: 'k7/8/8/3pP3/8/8/8/K7 w - d6 0 1',
        instruction: 'Le pion noir vient d’avancer de d7 à d5. Prends-le en passant !',
        solutions: ['e5d6'],
        wrongMoveHints: { e5e6: "Le pion noir vient d'avancer de deux cases à côté du tien : prends-le en passant, en allant en d6 !" },
      },
    ],
  },
];
```

- [ ] **Step 5 : Écrire `src/chess/lessons/strategy.ts` (leçons 15 à 17)**

```ts
import type { Lesson } from '../../lessons/types';
import { START_FEN } from '../adapter';

const OFF_CENTER = 'Les pions du bord ne contrôlent pas le centre. Joue un pion du milieu !';
const ONE_STEP = 'Pas mal, mais avance-le de deux cases pour mieux prendre le centre.';
const KNIGHT_ON_RIM = 'Un cavalier au bord du plateau contrôle peu de cases. Vise le centre !';

export const STRATEGY_LESSONS: readonly Lesson[] = [
  {
    id: 'ouverture',
    title: 'Bien commencer une partie',
    intro: [
      '1. Occupe le centre avec tes pions (les cases d4, e4, d5 et e5).',
      '2. Sors vite tes cavaliers et tes fous, vers le centre.',
      "3. Roque tôt pour mettre ton roi à l'abri, et ne sors pas ta dame trop tôt.",
    ],
    exercises: [
      {
        kind: 'find-move',
        position: START_FEN,
        instruction: 'Premier coup de la partie : avance un pion du centre de deux cases.',
        solutions: ['e2e4', 'd2d4'],
        wrongMoveHints: { e2e3: ONE_STEP, d2d3: ONE_STEP, a2a4: OFF_CENTER, h2h4: OFF_CENTER },
      },
      {
        kind: 'find-move',
        position: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        instruction: 'Sors un cavalier vers le centre.',
        solutions: ['g1f3', 'b1c3'],
        wrongMoveHints: {
          d1h5: "Ne sors pas ta dame trop tôt : elle risque d'être attaquée.",
          g1h3: KNIGHT_ON_RIM,
          b1a3: KNIGHT_ON_RIM,
        },
      },
      {
        kind: 'find-move',
        position: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        instruction: "Ton cavalier et ton fou sont sortis : mets ton roi à l'abri en roquant.",
        solutions: ['e1g1'],
      },
    ],
  },
  {
    id: 'tactiques',
    title: 'Les tactiques de base',
    intro: [
      "Une fourchette, c'est une pièce qui attaque deux pièces adverses en même temps : l'adversaire ne peut en sauver qu'une.",
      "Un clouage, c'est quand une pièce ne peut pas bouger sans laisser prendre une pièce plus importante derrière elle.",
    ],
    exercises: [
      {
        kind: 'find-move',
        position: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1',
        instruction: 'Fourchette : trouve la case où ton cavalier attaque en même temps le roi et la tour.',
        solutions: ['b5c7'],
        wrongMoveHints: { b5d6: "Échec, mais ton cavalier n'attaque que le roi. Cherche la case où il attaque aussi la tour !" },
      },
      {
        kind: 'find-move',
        position: 'k7/8/8/n6n/8/8/2Q5/6K1 w - - 0 1',
        instruction: 'Attaque double : place ta dame pour qu’elle attaque les deux cavaliers en même temps.',
        solutions: ['c2c5', 'c2f5'],
      },
      {
        kind: 'find-move',
        position: '4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1',
        instruction: 'Clouage : place ton fou pour que le cavalier ne puisse plus bouger sans exposer son roi.',
        solutions: ['f1b5'],
      },
    ],
  },
  {
    id: 'mats-de-base',
    title: 'Les mats de base',
    intro: [
      'Avec une dame (ou une tour) et ton roi, tu peux toujours mater un roi seul.',
      'La méthode : repousse le roi adverse vers un bord avec ta dame ou ta tour, sans le mettre pat, puis approche ton roi pour aider à donner le mat.',
    ],
    exercises: [
      {
        kind: 'play-out',
        position: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1',
        instruction: "Roi et dame contre roi : fais échec et mat. L'ordinateur défend son roi du mieux possible.",
        goal: 'win',
        level: 'expert',
      },
      {
        kind: 'play-out',
        position: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1',
        instruction: 'Roi et tour contre roi : fais échec et mat. Prends ton temps !',
        goal: 'win',
        level: 'expert',
      },
    ],
  },
];
```

- [ ] **Step 6 : Écrire `src/chess/lessons/index.ts`**

```ts
import type { Lesson } from '../../lessons/types';
import { PIECE_LESSONS } from './pieces';
import { RULE_LESSONS } from './rules';
import { STRATEGY_LESSONS } from './strategy';

export const CHESS_LESSONS: readonly Lesson[] = [...PIECE_LESSONS, ...RULE_LESSONS, ...STRATEGY_LESSONS];

export function findChessLesson(id: string): Lesson | undefined {
  return CHESS_LESSONS.find((lesson) => lesson.id === id);
}
```

- [ ] **Step 7 : Lancer le test**

Run : `npx vitest run tests/unit/chess/lessons.test.ts`
Expected : PASS (1 + 17 + 32 tests). Si un exercice échoue, corriger la **donnée** de la leçon (position, solutions), jamais le test.

- [ ] **Step 8 : Commit**

```bash
git add src/chess/lessons tests/unit/chess/lessons.test.ts
git commit -m "feat: 17 leçons d'échecs interactives"
```

---

### Task 13 : Écrans des leçons (liste, explication, exercices)

**Files:**
- Create: `src/app/screens/LessonListScreen.tsx`, `src/app/screens/LessonScreen.tsx`, `src/app/screens/useLessonExercise.ts`
- Test: `tests/unit/app/lesson-screens.test.tsx`

**Interfaces:**
- Consumes: `Lesson`, `Exercise` (Tâche 11) ; `startExercise`, `playPlayerMove`, `playOpponentMove`, `ExerciseRun` (Tâche 11) ; `chessLessonRules` (Tâche 11) ; `CHESS_LESSONS` (Tâche 12, tests) ; `Board`, `chessGeometry`, `targetsOf`, `tapSquare`, `dropPiece`, `EMPTY_INPUT` (Tâches 3-4) ; `chessBoardPieces` (Tâche 4) ; `checkedKingSquare` (Tâche 2) ; `PromotionPicker` (Tâche 4) ; `getChessEngine`, `engineErrorMessage` (Tâches 5-6) ; `LessonProgress`, `isCompleted` (Tâche 8) ; `playSound` (Tâche 10).
- Produces :
  - `LessonListScreen` `{ lessons; progress; onOpen(id); onBack() }`.
  - `LessonScreen` `{ lesson; nextLesson?: Lesson; sound; onComplete(id); onOpen(id); onBack() }` — étapes : explication → exercices → « Leçon terminée ! ». `onComplete` est appelé quand le dernier exercice est validé par « Terminer la leçon ».
  - `useLessonExercise(exercise, engine)`.

- [ ] **Step 1 : Écrire les tests qui échouent**

`tests/unit/app/lesson-screens.test.tsx` :
```tsx
import { act, fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { LessonListScreen } from '../../../src/app/screens/LessonListScreen';
import { LessonScreen } from '../../../src/app/screens/LessonScreen';
import { CHESS_LESSONS, findChessLesson } from '../../../src/chess/lessons';

function tapSquare(container: HTMLElement, square: string): void {
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
      <LessonScreen lesson={lesson} nextLesson={findChessLesson('tour')} sound={false} onComplete={onComplete} onOpen={vi.fn()} onBack={vi.fn()} />,
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
    const { container } = render(<LessonScreen lesson={lesson} sound={false} onComplete={vi.fn()} onOpen={vi.fn()} onBack={vi.fn()} />);
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

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run tests/unit/app/lesson-screens.test.tsx`
Expected : FAIL — modules introuvables.

- [ ] **Step 3 : Écrire `src/app/screens/LessonListScreen.tsx`**

```tsx
import type { Lesson } from '../../lessons/types';
import { isCompleted, type LessonProgress } from '../progress';

interface LessonListScreenProps {
  readonly lessons: readonly Lesson[];
  readonly progress: LessonProgress;
  readonly onOpen: (lessonId: string) => void;
  readonly onBack: () => void;
}

export function LessonListScreen({ lessons, progress, onOpen, onBack }: LessonListScreenProps) {
  const done = lessons.filter((lesson) => isCompleted(progress, lesson.id)).length;
  return (
    <section class="screen">
      <header class="topbar">
        <button type="button" class="back" aria-label="Retour" onClick={onBack}>
          ←
        </button>
        <h1>Apprendre à jouer</h1>
      </header>
      <p class="muted">
        {done} / {lessons.length} leçons terminées
      </p>
      <ol class="lesson-list">
        {lessons.map((lesson, index) => (
          <li key={lesson.id}>
            <button type="button" class="btn" onClick={() => onOpen(lesson.id)}>
              {index + 1}. {lesson.title}
              {isCompleted(progress, lesson.id) && <span class="lesson-done">✓</span>}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

- [ ] **Step 4 : Écrire `src/app/screens/useLessonExercise.ts`**

```ts
import { useEffect, useMemo, useState } from 'preact/hooks';
import { EMPTY_INPUT, dropPiece, tapSquare, type InputResult, type InputState } from '../../board/move-input';
import { engineErrorMessage } from '../../chess/engine/errors';
import { chessLessonRules } from '../../chess/lesson-rules';
import type { ChessMove, ChessPos } from '../../chess/types';
import type { Engine } from '../../core/types';
import { playOpponentMove, playPlayerMove, startExercise, type ExerciseRun } from '../../lessons/runner';
import type { Exercise } from '../../lessons/types';

export interface LessonExercise {
  readonly run: ExerciseRun<ChessPos>;
  readonly input: InputState;
  readonly choices: readonly ChessMove[] | null;
  readonly last: ChessMove | null;
  readonly legal: readonly ChessMove[];
  readonly thinking: boolean;
  readonly engineError: string | null;
  tap(square: string): void;
  drop(from: string, to: string): void;
  choose(move: ChessMove): void;
  cancelChoice(): void;
  restart(): void;
  retryEngine(): void;
}

export function useLessonExercise(exercise: Exercise, engine: () => Engine<ChessPos, ChessMove>): LessonExercise {
  const [run, setRun] = useState(() => startExercise(chessLessonRules, exercise));
  const [input, setInput] = useState<InputState>(EMPTY_INPUT);
  const [choices, setChoices] = useState<readonly ChessMove[] | null>(null);
  const [last, setLast] = useState<ChessMove | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const legal = useMemo(() => (run.status === 'playing' ? chessLessonRules.legalMoves(run.pos) : []), [run]);

  // Fin de partie contre l'ordinateur : il répond quand c'est son tour.
  useEffect(() => {
    if (run.status !== 'waiting-opponent' || run.exercise.kind !== 'play-out') return undefined;
    const controller = new AbortController();
    engine()
      .bestMove(run.pos, run.exercise.level, controller.signal)
      .then((move) => {
        if (controller.signal.aborted) return;
        setLast(move);
        setRun(playOpponentMove(chessLessonRules, run, move));
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setEngineError(engineErrorMessage(error));
      });
    return () => controller.abort();
  }, [run, attempt]);

  const submit = (move: ChessMove) => {
    setInput(EMPTY_INPUT);
    setChoices(null);
    const next = playPlayerMove(chessLessonRules, run, move);
    setLast(next.pos === next.start ? null : move);
    setRun(next);
  };

  const handle = (result: InputResult<ChessMove>) => {
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
      setRun(startExercise(chessLessonRules, exercise));
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

- [ ] **Step 5 : Écrire `src/app/screens/LessonScreen.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Board } from '../../board/Board';
import { chessGeometry } from '../../board/geometry';
import { targetsOf } from '../../board/move-input';
import { checkedKingSquare, turnOf } from '../../chess/adapter';
import { getChessEngine } from '../../chess/engine';
import { chessBoardPieces } from '../../chess/view';
import type { Exercise, Lesson } from '../../lessons/types';
import { PromotionPicker } from '../components/PromotionPicker';
import { playSound } from '../sound';
import { useLessonExercise } from './useLessonExercise';

interface LessonScreenProps {
  readonly lesson: Lesson;
  readonly nextLesson?: Lesson;
  readonly sound: boolean;
  readonly onComplete: (lessonId: string) => void;
  readonly onOpen: (lessonId: string) => void;
  readonly onBack: () => void;
}

interface ExerciseViewProps {
  readonly exercise: Exercise;
  readonly index: number;
  readonly total: number;
  readonly sound: boolean;
  readonly onNext: () => void;
}

function ExerciseView({ exercise, index, total, sound, onNext }: ExerciseViewProps) {
  const ex = useLessonExercise(exercise, getChessEngine);
  const geometry = useMemo(() => chessGeometry(ex.run.player), [ex.run.player]);
  const solved = ex.run.status === 'success';
  const failed = ex.run.status === 'failed';

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
          pieces={chessBoardPieces(ex.run.pos)}
          selected={ex.input.selected}
          targets={targetsOf(ex.input.selected, ex.legal)}
          highlights={ex.last ? [ex.last.from, ex.last.to] : []}
          check={checkedKingSquare(ex.run.pos)}
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
      {ex.choices && <PromotionPicker color={turnOf(ex.run.pos)} choices={ex.choices} onPick={ex.choose} onCancel={ex.cancelChoice} />}
    </>
  );
}

export function LessonScreen({ lesson, nextLesson, sound, onComplete, onOpen, onBack }: LessonScreenProps) {
  const [step, setStep] = useState(-1);
  const total = lesson.exercises.length;

  const header = (
    <header class="topbar">
      <button type="button" class="back" aria-label="Retour aux leçons" onClick={onBack}>
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

- [ ] **Step 6 : Lancer les tests**

Run : `npx vitest run tests/unit/app/lesson-screens.test.tsx`
Expected : PASS (3 tests).

- [ ] **Step 7 : Commit**

```bash
git add src/app/screens/LessonListScreen.tsx src/app/screens/LessonScreen.tsx src/app/screens/useLessonExercise.ts tests/unit/app/lesson-screens.test.tsx
git commit -m "feat: écrans des leçons avec exercices sur le plateau"
```

---

### Task 14 : Navigation, menus, réglages et assemblage de l'app

**Files:**
- Create: `src/app/router.ts`, `src/app/navigation.ts`, `src/app/menu.ts`
- Create: `src/app/screens/HomeScreen.tsx`, `src/app/screens/ChessMenuScreen.tsx`, `src/app/screens/SettingsScreen.tsx`, `src/app/screens/ChessGameRoutes.tsx`
- Modify: `src/app/App.tsx` (remplacement complet)
- Test: `tests/unit/app/router.test.ts`, `tests/unit/app/menus.test.tsx`, `tests/unit/app/App.test.tsx` (complété)

**Interfaces:**
- Consumes: tout ce qui précède — `GameSetup`, `createSession`, `loadSavedChessGame`, `hasSavedChessGame`, `PlayScreen`, `LessonListScreen`, `LessonScreen`, `CHESS_LESSONS`, `findChessLesson`, `createStorage`, `detectBackend`, `STORAGE_KEYS`, `Settings`, `DEFAULT_SETTINGS`, `validateSettings`, `LessonProgress`, `EMPTY_PROGRESS`, `validateProgress`, `markCompleted`, `LEVEL_LABELS`, `LEVELS_ORDER`, `isOneOf`, `chessAdapter`.
- Produces :
  - `router.ts` : `Route` (`home`, `settings`, `chess-menu`, `chess-lessons`, `chess-lesson`, `chess-play`, `chess-resume`), `parseRoute(hash)`, `routeToHash(route)`. Adresses : `#/`, `#/reglages`, `#/echecs`, `#/echecs/lecons`, `#/echecs/lecons/<id>`, `#/echecs/partie/ordi/<faible|moyen|expert>/<blancs|noirs>`, `#/echecs/partie/deux-joueurs`, `#/echecs/reprendre`.
  - `navigation.ts` : `useRoute(): { route; version }`, `navigate(route)`, `replaceHash(route)`.
  - `menu.ts` : `ColorChoice`, `COLOR_CHOICES`, `resolveColor(choice, rng?)`, `NO_SAVED_GAME_MESSAGE`.
  - Écrans `HomeScreen`, `ChessMenuScreen`, `SettingsScreen`, `NewChessGame`, `ChessResume`, et `App`.

- [ ] **Step 1 : Écrire les tests qui échouent**

`tests/unit/app/router.test.ts` :
```ts
import { describe, expect, it } from 'vitest';
import { COLOR_CHOICES, resolveColor } from '../../../src/app/menu';
import { parseRoute, routeToHash, type Route } from '../../../src/app/router';

const routes: Route[] = [
  { name: 'home' },
  { name: 'settings' },
  { name: 'chess-menu' },
  { name: 'chess-lessons' },
  { name: 'chess-lesson', lessonId: 'en-passant' },
  { name: 'chess-resume' },
  { name: 'chess-play', setup: { game: 'chess', mode: 'ai', level: 'expert', playerColor: 'black' } },
  { name: 'chess-play', setup: { game: 'chess', mode: 'local', level: null, playerColor: 'white' } },
];

describe('routes', () => {
  it.each(routes.map((route) => [routeToHash(route), route] as const))('%s aller-retour', (hash, route) => {
    expect(parseRoute(hash)).toEqual(route);
  });

  it('écrit des adresses lisibles', () => {
    expect(routeToHash({ name: 'chess-play', setup: { game: 'chess', mode: 'ai', level: 'faible', playerColor: 'white' } })).toBe('#/echecs/partie/ordi/faible/blancs');
    expect(routeToHash({ name: 'home' })).toBe('#/');
  });

  it('se rabat sur un écran sûr pour une adresse inconnue', () => {
    expect(parseRoute('')).toEqual({ name: 'home' });
    expect(parseRoute('#/nimporte')).toEqual({ name: 'home' });
    expect(parseRoute('#/echecs/partie/ordi/maitre/blancs')).toEqual({ name: 'chess-menu' });
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

`tests/unit/app/menus.test.tsx` :
```tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { ChessMenuScreen } from '../../../src/app/screens/ChessMenuScreen';
import { HomeScreen } from '../../../src/app/screens/HomeScreen';
import { SettingsScreen } from '../../../src/app/screens/SettingsScreen';

describe('accueil', () => {
  it('ouvre les échecs et annonce les dames pour bientôt', () => {
    const onNavigate = vi.fn();
    render(<HomeScreen onNavigate={onNavigate} storageAvailable={false} />);
    expect(screen.getByText(/ne seront pas sauvegardées/)).toBeTruthy();
    expect((screen.getByRole('button', { name: /Dames/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Échecs/ }));
    expect(onNavigate).toHaveBeenCalledWith({ name: 'chess-menu' });
  });
});

describe('menu des échecs', () => {
  it('lance une partie contre l’ordinateur au niveau et à la couleur choisis', () => {
    const onNavigate = vi.fn();
    render(<ChessMenuScreen onNavigate={onNavigate} hasSavedGame={false} completedCount={3} totalLessons={17} notice={null} />);
    expect(screen.getByText('3 / 17 leçons terminées')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reprendre la partie' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Expert' }));
    fireEvent.click(screen.getByRole('button', { name: 'Noirs' }));
    expect(screen.getByRole('button', { name: 'Expert' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Jouer' }));
    expect(onNavigate).toHaveBeenCalledWith({ name: 'chess-play', setup: { game: 'chess', mode: 'ai', level: 'expert', playerColor: 'black' } });
  });

  it('propose de reprendre, d’apprendre et de jouer à deux', () => {
    const onNavigate = vi.fn();
    render(<ChessMenuScreen onNavigate={onNavigate} hasSavedGame completedCount={0} totalLessons={17} notice="La partie précédente n'a pas pu être reprise." />);
    expect(screen.getByText("La partie précédente n'a pas pu être reprise.")).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre la partie' }));
    fireEvent.click(screen.getByRole('button', { name: /Apprendre à jouer/ }));
    fireEvent.click(screen.getByRole('button', { name: /2 joueurs sur ce téléphone/ }));
    expect(onNavigate.mock.calls.map(([route]) => route.name)).toEqual(['chess-resume', 'chess-lessons', 'chess-play']);
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

Ajouter à `tests/unit/app/App.test.tsx` (après le test existant) :
```tsx
  it('affiche le menu des échecs à l’adresse #/echecs', () => {
    window.location.hash = '#/echecs';
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Échecs' })).toBeTruthy();
  });

  it('affiche la liste des leçons', () => {
    window.location.hash = '#/echecs/lecons';
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Apprendre à jouer' })).toBeTruthy();
  });

  it('démarre une partie à deux joueurs', () => {
    window.location.hash = '#/echecs/partie/deux-joueurs';
    render(<App />);
    expect(screen.getByRole('heading', { name: '2 joueurs' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Au tour des Blancs');
  });
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run tests/unit/app/router.test.ts tests/unit/app/menus.test.tsx tests/unit/app/App.test.tsx`
Expected : FAIL — modules `router`, `menu`, écrans introuvables ; les nouveaux tests de `App` échouent.

- [ ] **Step 3 : Écrire `src/app/router.ts`**

```ts
import { isOneOf } from '../core/guards';
import { LEVELS_ORDER } from '../core/types';
import type { GameSetup } from './game/session';

export type Route =
  | { readonly name: 'home' }
  | { readonly name: 'settings' }
  | { readonly name: 'chess-menu' }
  | { readonly name: 'chess-lessons' }
  | { readonly name: 'chess-lesson'; readonly lessonId: string }
  | { readonly name: 'chess-play'; readonly setup: GameSetup }
  | { readonly name: 'chess-resume' };

const HOME: Route = { name: 'home' };
const CHESS_MENU: Route = { name: 'chess-menu' };

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
  if (first !== 'echecs') return HOME;
  if (!second) return CHESS_MENU;
  if (second === 'lecons') return third ? { name: 'chess-lesson', lessonId: third } : { name: 'chess-lessons' };
  if (second === 'reprendre') return { name: 'chess-resume' };
  if (second === 'partie' && third === 'deux-joueurs') {
    return { name: 'chess-play', setup: { game: 'chess', mode: 'local', level: null, playerColor: 'white' } };
  }
  if (second === 'partie' && third === 'ordi' && isOneOf(fourth, LEVELS_ORDER) && isOneOf(fifth, ['blancs', 'noirs'] as const)) {
    return { name: 'chess-play', setup: { game: 'chess', mode: 'ai', level: fourth, playerColor: fifth === 'blancs' ? 'white' : 'black' } };
  }
  return CHESS_MENU;
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'settings':
      return '#/reglages';
    case 'chess-menu':
      return '#/echecs';
    case 'chess-lessons':
      return '#/echecs/lecons';
    case 'chess-lesson':
      return `#/echecs/lecons/${encodeURIComponent(route.lessonId)}`;
    case 'chess-resume':
      return '#/echecs/reprendre';
    case 'chess-play': {
      const { setup } = route;
      if (setup.mode === 'local' || setup.level === null) return '#/echecs/partie/deux-joueurs';
      return `#/echecs/partie/ordi/${setup.level}/${setup.playerColor === 'white' ? 'blancs' : 'noirs'}`;
    }
  }
}
```

- [ ] **Step 4 : Écrire `src/app/navigation.ts`**

```ts
import { useEffect, useState } from 'preact/hooks';
import { parseRoute, routeToHash, type Route } from './router';

export interface RouteState {
  readonly route: Route;
  /** Augmente à chaque navigation : sert de clé pour recréer un écran (ex. nouvelle partie). */
  readonly version: number;
}

export function useRoute(): RouteState {
  const [state, setState] = useState<RouteState>(() => ({ route: parseRoute(window.location.hash), version: 0 }));
  useEffect(() => {
    const onChange = () => setState((previous) => ({ route: parseRoute(window.location.hash), version: previous.version + 1 }));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return state;
}

export function navigate(route: Route): void {
  const hash = routeToHash(route);
  if (window.location.hash === hash) {
    // Même adresse (ex. « Nouvelle partie ») : on force quand même un nouvel écran.
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = hash;
  }
}

/** Change l'adresse sans changer d'écran ni ajouter d'entrée d'historique. */
export function replaceHash(route: Route): void {
  history.replaceState(null, '', routeToHash(route));
}
```

- [ ] **Step 5 : Écrire `src/app/menu.ts`**

```ts
import type { Color } from '../core/types';

export type ColorChoice = Color | 'random';

export const COLOR_CHOICES: readonly { readonly value: ColorChoice; readonly label: string }[] = [
  { value: 'white', label: 'Blancs' },
  { value: 'black', label: 'Noirs' },
  { value: 'random', label: 'Au hasard' },
];

export const NO_SAVED_GAME_MESSAGE = 'Aucune partie à reprendre.';

export function resolveColor(choice: ColorChoice, rng: () => number = Math.random): Color {
  if (choice !== 'random') return choice;
  return rng() < 0.5 ? 'white' : 'black';
}
```

- [ ] **Step 6 : Écrire les écrans de menu**

`src/app/screens/HomeScreen.tsx` :
```tsx
import type { Route } from '../router';

interface HomeScreenProps {
  readonly onNavigate: (route: Route) => void;
  readonly storageAvailable: boolean;
}

export function HomeScreen({ onNavigate, storageAvailable }: HomeScreenProps) {
  return (
    <main class="screen">
      <h1>Échecs &amp; Dames</h1>
      <p class="muted">Apprends à jouer, puis affronte l'ordinateur ou un ami.</p>
      {!storageAvailable && (
        <p class="feedback feedback-info">
          Ton navigateur ne permet pas d'enregistrer : ta progression et tes parties ne seront pas sauvegardées.
        </p>
      )}
      <button type="button" class="btn" onClick={() => onNavigate({ name: 'chess-menu' })}>
        ♞ Échecs
        <span class="sub">Apprendre et jouer</span>
      </button>
      <button type="button" class="btn" disabled>
        ⛂ Dames
        <span class="sub">Bientôt disponible</span>
      </button>
      <button type="button" class="btn" onClick={() => onNavigate({ name: 'settings' })}>
        ⚙ Réglages
      </button>
    </main>
  );
}
```

`src/app/screens/ChessMenuScreen.tsx` :
```tsx
import { useState } from 'preact/hooks';
import { LEVELS_ORDER, type Level } from '../../core/types';
import { LEVEL_LABELS } from '../labels';
import { COLOR_CHOICES, resolveColor, type ColorChoice } from '../menu';
import type { Route } from '../router';

interface ChessMenuScreenProps {
  readonly onNavigate: (route: Route) => void;
  readonly hasSavedGame: boolean;
  readonly completedCount: number;
  readonly totalLessons: number;
  readonly notice: string | null;
}

export function ChessMenuScreen({ onNavigate, hasSavedGame, completedCount, totalLessons, notice }: ChessMenuScreenProps) {
  const [level, setLevel] = useState<Level>('faible');
  const [color, setColor] = useState<ColorChoice>('white');

  return (
    <section class="screen">
      <header class="topbar">
        <button type="button" class="back" aria-label="Retour à l'accueil" onClick={() => onNavigate({ name: 'home' })}>
          ←
        </button>
        <h1>Échecs</h1>
      </header>
      {notice && (
        <p class="feedback feedback-info" role="status">
          {notice}
        </p>
      )}
      {hasSavedGame && (
        <button type="button" class="btn btn-primary" onClick={() => onNavigate({ name: 'chess-resume' })}>
          Reprendre la partie
        </button>
      )}
      <button type="button" class="btn" onClick={() => onNavigate({ name: 'chess-lessons' })}>
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
          onClick={() => onNavigate({ name: 'chess-play', setup: { game: 'chess', mode: 'ai', level, playerColor: resolveColor(color) } })}
        >
          Jouer
        </button>
      </div>
      <button
        type="button"
        class="btn"
        onClick={() => onNavigate({ name: 'chess-play', setup: { game: 'chess', mode: 'local', level: null, playerColor: 'white' } })}
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

`src/app/screens/SettingsScreen.tsx` :
```tsx
import type { Settings } from '../settings';

interface SettingsScreenProps {
  readonly settings: Settings;
  readonly onChange: (settings: Settings) => void;
  readonly onBack: () => void;
}

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
      <div class="card">
        <h2>À propos</h2>
        <p class="muted">
          Moteur d'échecs : Stockfish (licence GPL-3.0). Pièces : « cburnett » (licence GPLv2+). Cette application est un logiciel
          libre sous licence GPL-3.0.
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 7 : Écrire `src/app/screens/ChessGameRoutes.tsx`**

```tsx
import { useEffect, useState } from 'preact/hooks';
import { chessAdapter } from '../../chess/adapter';
import { loadSavedChessGame } from '../game/saved';
import { createSession, type GameSetup } from '../game/session';
import { NO_SAVED_GAME_MESSAGE } from '../menu';
import { navigate, replaceHash } from '../navigation';
import type { AppStorage } from '../storage';
import { PlayScreen } from './PlayScreen';

interface GameRouteProps {
  readonly storage: AppStorage;
  readonly sound: boolean;
}

/** Nouvelle partie ; l'adresse devient « reprendre » pour qu'un rechargement retrouve cette partie. */
export function NewChessGame({ setup, storage, sound }: GameRouteProps & { readonly setup: GameSetup }) {
  const [initial] = useState(() => createSession(chessAdapter, setup, chessAdapter.initial()));
  useEffect(() => replaceHash({ name: 'chess-resume' }), []);
  return (
    <PlayScreen
      initial={initial}
      storage={storage}
      sound={sound}
      onExit={() => navigate({ name: 'chess-menu' })}
      onNewGame={() => navigate({ name: 'chess-play', setup })}
    />
  );
}

export function ChessResume({ storage, sound, onFailure }: GameRouteProps & { readonly onFailure: (message: string) => void }) {
  const [loaded] = useState(() => loadSavedChessGame(storage));
  useEffect(() => {
    if (loaded.kind !== 'ok') onFailure(loaded.kind === 'error' ? loaded.message : NO_SAVED_GAME_MESSAGE);
  }, []);
  if (loaded.kind !== 'ok') return null;
  const setup = loaded.session.setup;
  return (
    <PlayScreen
      initial={loaded.session}
      storage={storage}
      sound={sound}
      onExit={() => navigate({ name: 'chess-menu' })}
      onNewGame={() => navigate({ name: 'chess-play', setup })}
    />
  );
}
```

- [ ] **Step 8 : Remplacer `src/app/App.tsx`**

```tsx
import { useMemo, useState } from 'preact/hooks';
import { CHESS_LESSONS, findChessLesson } from '../chess/lessons';
import { hasSavedChessGame } from './game/saved';
import { navigate, useRoute } from './navigation';
import { EMPTY_PROGRESS, isCompleted, markCompleted, validateProgress, type LessonProgress } from './progress';
import type { Route } from './router';
import { ChessMenuScreen } from './screens/ChessMenuScreen';
import { ChessResume, NewChessGame } from './screens/ChessGameRoutes';
import { HomeScreen } from './screens/HomeScreen';
import { LessonListScreen } from './screens/LessonListScreen';
import { LessonScreen } from './screens/LessonScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { DEFAULT_SETTINGS, validateSettings, type Settings } from './settings';
import { STORAGE_KEYS, createStorage, detectBackend } from './storage';

export function App() {
  const storage = useMemo(() => createStorage(detectBackend()), []);
  const [settings, setSettings] = useState<Settings>(() => storage.read(STORAGE_KEYS.settings, validateSettings) ?? DEFAULT_SETTINGS);
  const [progress, setProgress] = useState<LessonProgress>(() => storage.read(STORAGE_KEYS.chessProgress, validateProgress) ?? EMPTY_PROGRESS);
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

  const completeLesson = (lessonId: string) => {
    const next = markCompleted(progress, lessonId);
    setProgress(next);
    storage.write(STORAGE_KEYS.chessProgress, next);
  };

  switch (route.name) {
    case 'home':
      return <HomeScreen onNavigate={go} storageAvailable={storage.available} />;
    case 'settings':
      return <SettingsScreen settings={settings} onChange={updateSettings} onBack={() => go({ name: 'home' })} />;
    case 'chess-menu':
      return (
        <ChessMenuScreen
          onNavigate={go}
          hasSavedGame={hasSavedChessGame(storage)}
          completedCount={CHESS_LESSONS.filter((lesson) => isCompleted(progress, lesson.id)).length}
          totalLessons={CHESS_LESSONS.length}
          notice={menuNotice}
        />
      );
    case 'chess-lessons':
      return (
        <LessonListScreen
          lessons={CHESS_LESSONS}
          progress={progress}
          onOpen={(lessonId) => go({ name: 'chess-lesson', lessonId })}
          onBack={() => go({ name: 'chess-menu' })}
        />
      );
    case 'chess-lesson': {
      const lesson = findChessLesson(route.lessonId);
      if (!lesson) {
        return <LessonListScreen lessons={CHESS_LESSONS} progress={progress} onOpen={(lessonId) => go({ name: 'chess-lesson', lessonId })} onBack={() => go({ name: 'chess-menu' })} />;
      }
      const index = CHESS_LESSONS.indexOf(lesson);
      return (
        <LessonScreen
          key={`${lesson.id}-${version}`}
          lesson={lesson}
          nextLesson={CHESS_LESSONS[index + 1]}
          sound={settings.sound}
          onComplete={completeLesson}
          onOpen={(lessonId) => go({ name: 'chess-lesson', lessonId })}
          onBack={() => go({ name: 'chess-lessons' })}
        />
      );
    }
    case 'chess-play':
      return <NewChessGame key={version} setup={route.setup} storage={storage} sound={settings.sound} />;
    case 'chess-resume':
      return (
        <ChessResume
          key={version}
          storage={storage}
          sound={settings.sound}
          onFailure={(message) => {
            setMenuNotice(message);
            navigate({ name: 'chess-menu' });
          }}
        />
      );
  }
}
```

- [ ] **Step 9 : Lancer les tests et vérifier le typage**

Run : `npx vitest run`
Expected : PASS (tous les tests, dont 11 de routes, 4 de menus et 4 d'`App`).
Run : `npx tsc -b`
Expected : aucune erreur.

- [ ] **Step 10 : Vérifier à la main dans le navigateur**

Run : `npm run dev` puis ouvrir l'adresse affichée en format téléphone.
Expected : Accueil → Échecs → Apprendre à jouer → leçon 1 réussie ; « Contre l'ordinateur » en Faible : l'ordinateur répond, « Indice » affiche une flèche, « Annuler » revient en arrière ; recharger la page reprend la partie.

- [ ] **Step 11 : Commit**

```bash
git add src/app tests/unit/app
git commit -m "feat: navigation, menus, réglages et assemblage de l'application"
```

---

### Task 15 : Application installable et hors ligne (PWA)

**Files:**
- Create: `scripts/make-icon.mjs`, `pwa-assets.config.ts`, `public/icon.svg` (généré), icônes PNG + `favicon.ico` (générés)
- Modify: `vite.config.ts`, `index.html`

**Interfaces:**
- Consumes: `src/chess/pieces/wN.svg` (Tâche 3) ; `vite-plugin-pwa`, `@vite-pwa/assets-generator` (installés à la Tâche 1).
- Produces : `dist/manifest.webmanifest`, `dist/sw.js` (précache de toute l'app **y compris** `stockfish/stockfish-19-lite-single.wasm`).

- [ ] **Step 1 : Écrire `scripts/make-icon.mjs`**

```js
// Fabrique public/icon.svg : un cavalier blanc et un pion de dames sur fond vert.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const knight = readFileSync(join(root, 'src', 'chess', 'pieces', 'wN.svg'), 'utf8');
const inner = knight.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#1f4e3d"/>
  <circle cx="360" cy="368" r="96" fill="#b3261e" stroke="#ffffff" stroke-width="10"/>
  <circle cx="360" cy="368" r="60" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="6"/>
  <g transform="translate(40 30) scale(7.2)">${inner}</g>
</svg>
`;
writeFileSync(join(root, 'public', 'icon.svg'), icon);
console.info('[make-icon] public/icon.svg écrit');
```

- [ ] **Step 2 : Écrire `pwa-assets.config.ts`**

```ts
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/icon.svg'],
});
```

- [ ] **Step 3 : Générer les icônes**

Run : `npm run icons`
Expected : `[make-icon] public/icon.svg écrit`, puis création dans `public/` de `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico`. Ouvrir `public/pwa-192x192.png` pour vérifier que le cavalier est centré et lisible ; sinon ajuster `translate`/`scale` dans `make-icon.mjs` et relancer.

- [ ] **Step 4 : Configurer le plugin PWA dans `vite.config.ts`**

Remplacer le fichier par :
```ts
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    preact({ prefreshEnabled: !process.env.VITEST }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: 'Échecs & Dames',
        short_name: 'Échecs & Dames',
        description: "Apprends et joue aux échecs et aux dames contre l'ordinateur.",
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f4f1ea',
        theme_color: '#1f4e3d',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,wasm,webmanifest}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/unit/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/app/App.tsx',
        'src/app/navigation.ts',
        'src/app/sound.ts',
        'src/app/screens/**',
        'src/app/components/**',
        'src/app/game/useChessGame.ts',
        'src/chess/engine/transport.ts',
        'src/chess/engine/index.ts',
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
```

- [ ] **Step 5 : Compléter `index.html`**

Dans `<head>`, après la ligne `<meta name="description" …>`, ajouter :
```html
    <link rel="icon" href="/favicon.ico" sizes="48x48" />
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Échecs & Dames" />
```

- [ ] **Step 6 : Construire et vérifier le précache**

Run : `npm run build`
Expected : build réussi, message du plugin PWA indiquant un nombre d'entrées précachées.
Run (Git Bash) : `grep -o 'stockfish-19-lite-single\.[a-z]*\|manifest\.webmanifest' dist/sw.js | sort -u`
Expected :
```
manifest.webmanifest
stockfish-19-lite-single.js
stockfish-19-lite-single.wasm
```

- [ ] **Step 7 : Lancer tous les tests**

Run : `npx vitest run`
Expected : PASS.

- [ ] **Step 8 : Commit**

```bash
git add scripts/make-icon.mjs pwa-assets.config.ts public/icon.svg public/*.png public/favicon.ico vite.config.ts index.html
git commit -m "feat: application installable et jouable hors ligne (PWA)"
```

---

### Task 16 : Tests de bout en bout (Playwright, format téléphone)

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/helpers.ts`, `tests/e2e/lessons.spec.ts`, `tests/e2e/local-game.spec.ts`, `tests/e2e/ai-game.spec.ts`, `tests/e2e/offline.spec.ts`

**Interfaces:**
- Consumes: l'app construite (`npm run build` + `npm run preview`) ; sélecteurs `rect[data-square]`, `[data-piece]` (Tâche 3) ; textes des écrans (Tâches 10, 13, 14) ; clé `jeux.echecs.partie` (Tâche 8).
- Produces : `npm run e2e` vert.

- [ ] **Step 1 : Installer Chromium pour Playwright**

Run : `npx playwright install chromium`
Expected : téléchargement de Chromium terminé.

- [ ] **Step 2 : Écrire `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
  projects: [{ name: 'telephone', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
```

- [ ] **Step 3 : Écrire `tests/e2e/helpers.ts`**

```ts
import type { Page } from '@playwright/test';

export async function tap(page: Page, square: string): Promise<void> {
  await page.locator(`rect[data-square="${square}"]`).click();
}

export async function play(page: Page, from: string, to: string): Promise<void> {
  await tap(page, from);
  await tap(page, to);
}

export async function openChess(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /Échecs/ }).click();
}
```

- [ ] **Step 4 : Écrire les scénarios**

`tests/e2e/lessons.spec.ts` :
```ts
import { expect, test } from '@playwright/test';
import { openChess, play } from './helpers';

test('suivre la première leçon jusqu’au bout', async ({ page }) => {
  await openChess(page);
  await page.getByRole('button', { name: /Apprendre à jouer/ }).click();
  await page.getByRole('button', { name: /1\. Le plateau et le but du jeu/ }).click();
  await page.getByRole('button', { name: 'Commencer' }).click();
  await play(page, 'e1', 'e8');
  await expect(page.getByText('Bravo, exercice réussi !')).toBeVisible();
  await page.getByRole('button', { name: 'Terminer la leçon' }).click();
  await expect(page.getByText('Leçon terminée ! 🎉')).toBeVisible();
  await page.getByRole('button', { name: 'Retour aux leçons' }).click();
  await expect(page.getByText('1 / 17 leçons terminées')).toBeVisible();
});
```

`tests/e2e/local-game.spec.ts` :
```ts
import { expect, test } from '@playwright/test';
import { openChess, play } from './helpers';

test('partie à deux jusqu’au mat', async ({ page }) => {
  await openChess(page);
  await page.getByRole('button', { name: /2 joueurs sur ce téléphone/ }).click();
  await play(page, 'f2', 'f3');
  await play(page, 'e7', 'e5');
  await play(page, 'g2', 'g4');
  await play(page, 'd8', 'h4');
  await expect(page.getByRole('dialog', { name: 'Les Noirs gagnent !' })).toBeVisible();
});

test('reprendre une partie après rechargement', async ({ page }) => {
  await openChess(page);
  await page.getByRole('button', { name: /2 joueurs sur ce téléphone/ }).click();
  await play(page, 'e2', 'e4');
  await expect(page.locator('[data-piece="e4"]')).toHaveAttribute('aria-label', 'Pion blanc');
  await page.reload();
  await expect(page.locator('[data-piece="e4"]')).toHaveAttribute('aria-label', 'Pion blanc');
  await expect(page.getByRole('status')).toHaveText('Au tour des Noirs');
});
```

`tests/e2e/ai-game.spec.ts` :
```ts
import { expect, test } from '@playwright/test';
import { openChess, play } from './helpers';

test('contre l’ordinateur en Faible : réponse, indice et annulation', async ({ page }) => {
  await openChess(page);
  await page.getByRole('button', { name: 'Faible' }).click();
  await page.getByRole('button', { name: 'Blancs' }).click();
  await page.getByRole('button', { name: 'Jouer', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('À toi de jouer');
  await play(page, 'e2', 'e4');
  await expect(page.getByText("L'ordinateur réfléchit…")).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('À toi de jouer', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Indice' }).click();
  await expect(page.locator('line.arrow')).toHaveCount(1);
  await expect(page.getByText(/💡/)).toBeVisible();
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(page.locator('[data-piece="e2"]')).toHaveAttribute('aria-label', 'Pion blanc');
});

test('alerte avant une gaffe au niveau Faible', async ({ page }) => {
  const record = {
    setup: { game: 'chess', mode: 'ai', level: 'faible', playerColor: 'white' },
    start: '4k3/8/8/3p4/8/3Q4/8/4K3 w - - 0 1',
    moves: [],
  };
  await page.addInitScript((value) => window.localStorage.setItem('jeux.echecs.partie', value), JSON.stringify(record));
  await page.goto('/#/echecs/reprendre');
  await play(page, 'd3', 'c4');
  const dialog = page.getByRole('dialog', { name: 'Attention !' });
  await expect(dialog).toContainText('ta dame en c4 peut être prise gratuitement par le pion en d5', { timeout: 30_000 });
  await dialog.getByRole('button', { name: 'Choisir un autre coup' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('[data-piece="d3"]')).toHaveAttribute('aria-label', 'Dame blanche');
});

test('Expert répond en quelques secondes', async ({ page }) => {
  await openChess(page);
  await page.getByRole('button', { name: 'Expert' }).click();
  await page.getByRole('button', { name: 'Noirs' }).click();
  await page.getByRole('button', { name: 'Jouer', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('À toi de jouer', { timeout: 30_000 });
  await expect(page.locator('.hl-last')).toHaveCount(2);
});
```

`tests/e2e/offline.spec.ts` :
```ts
import { expect, test } from '@playwright/test';
import { play } from './helpers';

test('fonctionne hors ligne après le premier chargement, ordinateur compris', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Échecs & Dames' })).toBeVisible();
  await page.getByRole('button', { name: /Échecs/ }).click();
  await page.getByRole('button', { name: 'Moyen' }).click();
  await page.getByRole('button', { name: 'Blancs' }).click();
  await page.getByRole('button', { name: 'Jouer', exact: true }).click();
  await play(page, 'e2', 'e4');
  await expect(page.getByText("L'ordinateur réfléchit…")).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('À toi de jouer', { timeout: 30_000 });
});
```

- [ ] **Step 5 : Lancer les tests de bout en bout**

Run : `npm run e2e`
Expected : 7 tests PASS. En cas d'échec, lire la trace (`npx playwright show-trace test-results/<dossier>/trace.zip`) et corriger le **code** de l'app (les textes attendus viennent de la spec).

- [ ] **Step 6 : Commit**

```bash
git add playwright.config.ts tests/e2e
git commit -m "test: scénarios de bout en bout sur téléphone (leçon, 2 joueurs, IA, hors ligne)"
```

---

### Task 17 : Tests de force de l'IA (matchs et mats, lents, à la demande)

**Files:**
- Create: `vitest.strength.config.ts`, `tests/strength/node-transport.ts`, `tests/strength/strength.test.ts`

**Interfaces:**
- Consumes: `UciTransport` (Tâche 5), `StockfishClient` (Tâche 5), `ChessEngine`, `LEVELS`, `LevelConfig` (Tâche 6), `chessAdapter`, `parseChess` (Tâche 2) ; paquet `stockfish` (API Node : `initEngine('lite-single')` renvoie un moteur avec `sendCommand(cmd)` et une propriété `listener` appelée pour chaque ligne).
- Produces : `npm run test:strength` vert (≈ 5 à 10 minutes).

Les matchs utilisent des temps de réflexion réduits (Expert 300 ms, Moyen 100 ms) pour rester raisonnables ; les options UCI de chaque niveau restent celles de `LEVELS`.

- [ ] **Step 1 : Écrire `vitest.strength.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/strength/**/*.test.ts'],
    testTimeout: 900_000,
    hookTimeout: 60_000,
  },
});
```

- [ ] **Step 2 : Écrire `tests/strength/node-transport.ts`**

```ts
import { createRequire } from 'node:module';
import type { UciTransport } from '../../src/chess/engine/transport';

interface NodeEngine {
  listener?: (line: string) => void;
  sendCommand(command: string): void;
}

type InitEngine = (variant: string) => Promise<NodeEngine>;

const require = createRequire(import.meta.url);

/** Stockfish « lite single » dans Node, derrière la même interface que le Web Worker. */
export function createNodeTransport(): UciTransport {
  const initEngine = require('stockfish') as InitEngine;
  const pending: string[] = [];
  let engine: NodeEngine | null = null;
  let lineListener: (line: string) => void = () => undefined;
  let errorListener: (error: Error) => void = () => undefined;

  initEngine('lite-single')
    .then((loaded) => {
      engine = loaded;
      loaded.listener = (line) => lineListener(line);
      pending.splice(0).forEach((command) => loaded.sendCommand(command));
    })
    .catch((error: unknown) => errorListener(error instanceof Error ? error : new Error(String(error))));

  return {
    send: (command) => {
      if (engine) engine.sendCommand(command);
      else pending.push(command);
    },
    onLine: (listener) => {
      lineListener = listener;
    },
    onError: (listener) => {
      errorListener = listener;
    },
    terminate: () => engine?.sendCommand('quit'),
  };
}
```

- [ ] **Step 3 : Écrire `tests/strength/strength.test.ts`**

```ts
import { afterAll, describe, expect, it } from 'vitest';
import { chessAdapter, parseChess } from '../../src/chess/adapter';
import { ChessEngine } from '../../src/chess/engine/chess-engine';
import { LEVELS } from '../../src/chess/engine/levels';
import { StockfishClient } from '../../src/chess/engine/stockfish-client';
import type { ChessPos } from '../../src/chess/types';
import type { GameStatus, Level } from '../../src/core/types';
import { createNodeTransport } from './node-transport';

const FAST_LEVELS = {
  faible: LEVELS.faible,
  moyen: { ...LEVELS.moyen, go: 'go movetime 100' },
  expert: { ...LEVELS.expert, go: 'go movetime 300' },
};
const MAX_PLIES = 240;

const client = new StockfishClient(createNodeTransport, 60_000);
const engine = new ChessEngine(client, { sleep: async () => undefined, levels: FAST_LEVELS });

afterAll(() => client.restart());

async function playOut(start: ChessPos, white: Level, black: Level, maxPlies = MAX_PLIES): Promise<GameStatus> {
  let pos = start;
  for (let ply = 0; ply < maxPlies; ply += 1) {
    const current = chessAdapter.status(pos);
    if (current.kind !== 'ongoing') return current;
    const level = chessAdapter.turn(pos) === 'white' ? white : black;
    pos = chessAdapter.play(pos, await engine.bestMove(pos, level, new AbortController().signal));
  }
  const final = chessAdapter.status(pos);
  // Arbitrage : une partie trop longue compte comme nulle.
  return final.kind !== 'ongoing' ? final : { kind: 'draw', reason: 'fifty-moves' };
}

/** Joue `games` parties en alternant les couleurs ; renvoie le nombre de victoires de `strong`. */
async function match(strong: Level, weak: Level, games: number): Promise<number> {
  let wins = 0;
  for (let game = 0; game < games; game += 1) {
    const strongColor = game % 2 === 0 ? 'white' : 'black';
    const result = await playOut(
      chessAdapter.initial(),
      strongColor === 'white' ? strong : weak,
      strongColor === 'white' ? weak : strong,
    );
    if (result.kind === 'win' && result.winner === strongColor) wins += 1;
  }
  return wins;
}

describe('force de l’IA', () => {
  it.each([
    ['6k1/pp4p1/2p5/2bp4/8/P5Pb/1P3rrP/2BRRN1K b - - 0 1', 2],
    ['r2qkb1r/pp2nppp/3p4/2pNN1B1/2BnP3/3P4/PPP2PPP/R2bK2R w KQkq - 1 1', 2],
    ['r1b1kb1r/pppp1ppp/5q2/4n3/3KP3/2N3PN/PPP4P/R1BQ1B1R b kq - 0 1', 3],
  ] as const)('Expert trouve le mat dans %s (mat en %i)', async (fen, mateIn) => {
    const start = parseChess(fen);
    const attacker = chessAdapter.turn(start);
    const result = await playOut(start, 'expert', 'expert', mateIn * 2 - 1);
    expect(result).toEqual({ kind: 'win', winner: attacker, reason: 'checkmate' });
  });

  it('Expert bat Moyen au moins 9 fois sur 10', async () => {
    expect(await match('expert', 'moyen', 10)).toBeGreaterThanOrEqual(9);
  });

  it('Moyen bat Faible au moins 8 fois sur 10', async () => {
    expect(await match('moyen', 'faible', 10)).toBeGreaterThanOrEqual(8);
  });
});
```

- [ ] **Step 4 : Lancer les tests de force**

Run : `npm run test:strength`
Expected : 5 tests PASS (plusieurs minutes). Si un match échoue de peu, relancer une fois (hasard des niveaux Faible et Moyen) ; s'il échoue encore, revoir les réglages de `LEVELS` avec la spec §5.1, sans toucher aux seuils du test.

- [ ] **Step 5 : Vérification finale de l'étape 1**

Run : `npm run test:coverage`
Expected : PASS, couverture ≥ 80 % sur les quatre indicateurs.
Run : `npm run build`
Expected : build réussi.
Run : `npm run e2e`
Expected : 7 tests PASS.

- [ ] **Step 6 : Commit**

```bash
git add vitest.strength.config.ts tests/strength
git commit -m "test: matchs de force et mats pour valider les niveaux de l'IA"
```

---

## Couverture de la spec (auto-relecture)

| Exigence de la spec (étape 1) | Tâche |
|---|---|
| PWA installable Android/iPhone, hors ligne | 15, 16 (hors ligne) |
| Vite + Preact + TS, chess.js, Stockfish lite single-thread | 1, 2, 5, 6 |
| Interface commune `GameAdapter` / `Engine`, positions immuables | 2, 9 |
| Plateau SVG commun, toucher + glisser, dernier coup, échec, promotion | 3, 4, 10 |
| Écrans : accueil, menu, leçons, partie, fin de partie, réglages (son) | 10, 13, 14 |
| Choix du niveau et de la couleur (Blancs / Noirs / Au hasard) | 14 |
| Sauvegarde automatique et reprise ; partie illisible rejetée avec message | 9, 10, 14 |
| Niveaux Faible / Moyen / Expert (§5.1) | 6, 17 |
| Aide Faible : indice (flèche + raison), alerte gaffe (≥ 200 cp ou mat), annulation | 7, 9, 10 |
| Pas d'aide en Moyen / Expert / 2 joueurs | 9 (`canUndo`), 10 (`faibleHelp`) |
| 17 leçons, exercices reach / collect / find-move / mate-in-1 / play-out | 11, 12, 13 |
| Erreurs : moteur qui ne démarre pas, délai dépassé + nouvel essai, stockage indisponible | 5, 6, 8, 10, 14 |
| Tests unitaires ≥ 80 %, bout en bout, matchs de force | toutes, 16, 17 |
| Licence GPL-3.0 | 1, 14 (À propos) |
