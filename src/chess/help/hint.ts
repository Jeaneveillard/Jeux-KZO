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
