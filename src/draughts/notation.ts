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
