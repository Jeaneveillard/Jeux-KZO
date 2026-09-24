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
