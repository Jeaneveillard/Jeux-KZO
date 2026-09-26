import bK from './pieces/bK.svg?no-inline';
import bM from './pieces/bM.svg?no-inline';
import wK from './pieces/wK.svg?no-inline';
import wM from './pieces/wM.svg?no-inline';
import type { Color } from '../core/types';
import type { DraughtsPieceKind } from './types';

const IMAGES: Readonly<Record<Color, Readonly<Record<DraughtsPieceKind, string>>>> = {
  white: { man: wM, king: wK },
  black: { man: bM, king: bK },
};

export function draughtsPieceImage(color: Color, kind: DraughtsPieceKind): string {
  return IMAGES[color][kind];
}

export function draughtsPieceLabel(color: Color, kind: DraughtsPieceKind): string {
  if (kind === 'man') return color === 'white' ? 'Pion blanc' : 'Pion noir';
  return color === 'white' ? 'Dame blanche' : 'Dame noire';
}
