import { opposite, type Color, type Evaluation } from '../../core/types';
import { attackersOf, listPieces, pieceOn, play, turnOf } from '../adapter';
import { PIECE_VALUES, isFeminine, withArticle, withPossessive } from '../names';
import type { ChessMove, ChessPos, PieceType } from '../types';

export const BLUNDER_THRESHOLD_CP = 200;

export type BlunderVerdict = { readonly blunder: false } | { readonly blunder: true; readonly message: string };

interface Attacker {
  readonly square: string;
  readonly type: PieceType;
}

interface Hanging {
  readonly square: string;
  readonly type: PieceType;
  readonly attacker: Attacker;
  readonly defended: boolean;
}

const NO_BLUNDER: BlunderVerdict = { blunder: false };

function attackers(pos: ChessPos, square: string, by: Color): Attacker[] {
  return attackersOf(pos, square, by).flatMap((from) => {
    const piece = pieceOn(pos, from);
    return piece ? [{ square: from, type: piece.type }] : [];
  });
}

/** Pièce du joueur (hors roi) qui peut être prise avec perte ; la plus précieuse s'il y en a plusieurs. */
function findHangingPiece(after: ChessPos, me: Color): Hanging | null {
  const them = opposite(me);
  const hanging = listPieces(after).flatMap((piece): Hanging[] => {
    if (piece.color !== me || piece.type === 'k') return [];
    const threats = attackers(after, piece.square, them);
    if (threats.length === 0) return [];
    const cheapest = threats.reduce((a, b) => (PIECE_VALUES[b.type] < PIECE_VALUES[a.type] ? b : a));
    const defended = attackersOf(after, piece.square, me).length > 0;
    const losing = !defended || PIECE_VALUES[cheapest.type] < PIECE_VALUES[piece.type];
    return losing ? [{ square: piece.square, type: piece.type, attacker: cheapest, defended }] : [];
  });
  return hanging.reduce<Hanging | null>(
    (worst, candidate) => (!worst || PIECE_VALUES[candidate.type] > PIECE_VALUES[worst.type] ? candidate : worst),
    null,
  );
}

function hangingMessage(piece: Hanging): string {
  const taken = isFeminine(piece.type) ? 'prise' : 'pris';
  const freely = piece.defended ? '' : 'gratuitement ';
  return `Attention : après ce coup, ${withPossessive(piece.type)} en ${piece.square} peut être ${taken} ${freely}par ${withArticle(piece.attacker.type)} en ${piece.attacker.square}.`;
}

export function detectBlunder(pos: ChessPos, move: ChessMove, before: Evaluation, afterForOpponent: Evaluation): BlunderVerdict {
  const alreadyLost = before.mateIn !== undefined && before.mateIn < 0;
  if (alreadyLost) return NO_BLUNDER;

  const opponentMates = afterForOpponent.mateIn !== undefined && afterForOpponent.mateIn > 0;
  if (opponentMates) {
    const n = afterForOpponent.mateIn ?? 1;
    return { blunder: true, message: `Attention : après ce coup, l'ordinateur peut faire échec et mat en ${n} coup${n > 1 ? 's' : ''}.` };
  }

  const hadMate = before.mateIn !== undefined && before.mateIn > 0;
  const stillMates = afterForOpponent.mateIn !== undefined && afterForOpponent.mateIn < 0;
  if (hadMate && !stillMates) {
    return { blunder: true, message: 'Attention : tu pouvais faire échec et mat, et ce coup laisse passer l’occasion.' };
  }

  // La note du joueur après le coup vaut -afterForOpponent.scoreCp.
  const loss = before.scoreCp + afterForOpponent.scoreCp;
  if (loss < BLUNDER_THRESHOLD_CP) return NO_BLUNDER;

  const hanging = findHangingPiece(play(pos, move), turnOf(pos));
  if (hanging) return { blunder: true, message: hangingMessage(hanging) };
  return {
    blunder: true,
    message: `Attention : l'ordinateur voit que ce coup te fait perdre l'équivalent d'environ ${Math.round(loss / 100)} pions.`,
  };
}
