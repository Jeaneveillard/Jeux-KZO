import type { Color } from '../../core/types';
import { generateMoves, toCells } from '../movegen';
import { play, status } from '../rules';
import type { DraughtsMove, DraughtsPos } from '../types';

export type DraughtsHintReason = 'win' | 'promotion' | 'capture' | 'escape' | 'best';

/** Cases des pièces de `color` que l'adversaire pourrait prendre s'il jouait maintenant. */
export function threatenedSquares(board: string, color: Color): Set<string> {
  const attacker = color === 'white' ? -1 : 1;
  return new Set(generateMoves(toCells(board), attacker).flatMap((move) => move.captures.map(String)));
}

export function draughtsHintReason(pos: DraughtsPos, move: DraughtsMove): DraughtsHintReason {
  const after = play(pos, move);
  if (status(after).kind === 'win') return 'win';
  if (move.promotes) return 'promotion';
  if (move.captures.length > 0) return 'capture';
  if (threatenedSquares(pos.board, pos.turn).has(move.from) && !threatenedSquares(after.board, pos.turn).has(move.to)) return 'escape';
  return 'best';
}

export function draughtsHintText(pos: DraughtsPos, move: DraughtsMove): string {
  switch (draughtsHintReason(pos, move)) {
    case 'win':
      return "Ce coup gagne la partie : l'adversaire ne pourra plus jouer !";
    case 'promotion':
      return 'Ton pion arrive au bout : il devient une dame.';
    case 'capture':
      return move.captures.length === 1 ? 'Ce coup prend une pièce adverse.' : `Ce coup prend ${move.captures.length} pièces adverses.`;
    case 'escape': {
      const piece = pos.board[Number(move.from) - 1];
      return `Ce coup met ${piece === 'W' || piece === 'B' ? 'ta dame' : 'ton pion'} à l'abri.`;
    }
    case 'best':
      return "C'est le meilleur coup selon l'ordinateur.";
  }
}
