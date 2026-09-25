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
