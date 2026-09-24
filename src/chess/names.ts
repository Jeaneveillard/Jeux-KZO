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
