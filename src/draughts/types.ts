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
