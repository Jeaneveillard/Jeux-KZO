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
