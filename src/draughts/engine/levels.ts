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
