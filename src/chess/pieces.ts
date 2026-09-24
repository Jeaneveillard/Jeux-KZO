import bB from './pieces/bB.svg?no-inline';
import bK from './pieces/bK.svg?no-inline';
import bN from './pieces/bN.svg?no-inline';
import bP from './pieces/bP.svg?no-inline';
import bQ from './pieces/bQ.svg?no-inline';
import bR from './pieces/bR.svg?no-inline';
import wB from './pieces/wB.svg?no-inline';
import wK from './pieces/wK.svg?no-inline';
import wN from './pieces/wN.svg?no-inline';
import wP from './pieces/wP.svg?no-inline';
import wQ from './pieces/wQ.svg?no-inline';
import wR from './pieces/wR.svg?no-inline';
import type { Color } from '../core/types';
import type { PieceType } from './types';

const IMAGES: Readonly<Record<string, string>> = { wP, wN, wB, wR, wQ, wK, bP, bN, bB, bR, bQ, bK };

export function pieceImage(color: Color, type: PieceType): string {
  return IMAGES[`${color === 'white' ? 'w' : 'b'}${type.toUpperCase()}`];
}
