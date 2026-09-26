import { NO_BLUNDER, type BlunderVerdict } from '../../core/help';
import type { Evaluation } from '../../core/types';
import { legalMoves, play } from '../rules';
import type { DraughtsMove, DraughtsPos } from '../types';

export const DRAUGHTS_BLUNDER_THRESHOLD_CP = 200;

function pieces(count: number): string {
  return count > 1 ? `${count} pièces` : 'une pièce';
}

/** `before` : évaluation de `pos` pour le joueur ; `afterForOpponent` : évaluation après le coup, du point de vue de l'adversaire. */
export function detectDraughtsBlunder(pos: DraughtsPos, move: DraughtsMove, before: Evaluation, afterForOpponent: Evaluation): BlunderVerdict {
  if (before.mateIn !== undefined && before.mateIn < 0) return NO_BLUNDER;
  if (afterForOpponent.mateIn !== undefined && afterForOpponent.mateIn > 0) {
    return { blunder: true, message: "Attention : après ce coup, l'ordinateur peut gagner la partie de force." };
  }
  const hadWin = before.mateIn !== undefined && before.mateIn > 0;
  const stillWins = afterForOpponent.mateIn !== undefined && afterForOpponent.mateIn < 0;
  if (hadWin && !stillWins) {
    return { blunder: true, message: 'Attention : tu pouvais gagner la partie, et ce coup laisse passer l’occasion.' };
  }
  // La note du joueur après le coup vaut -afterForOpponent.scoreCp.
  const loss = before.scoreCp + afterForOpponent.scoreCp;
  if (loss < DRAUGHTS_BLUNDER_THRESHOLD_CP) return NO_BLUNDER;
  const [reply] = legalMoves(play(pos, move));
  if (reply && reply.captures.length > 0) {
    return {
      blunder: true,
      message: `Attention : après ce coup, l'ordinateur peut prendre ${pieces(reply.captures.length)} (en ${reply.captures.join(', ')}).`,
    };
  }
  return {
    blunder: true,
    message: `Attention : l'ordinateur voit que ce coup te fait perdre l'équivalent d'environ ${Math.round(loss / 100)} pions.`,
  };
}
