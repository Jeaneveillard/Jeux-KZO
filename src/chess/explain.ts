import { explainWith, type ResultText, type ResultTexts } from '../core/explain';
import type { Color, GameStatus } from '../core/types';

export type { ResultText } from '../core/explain';

const CHESS_TEXTS: ResultTexts = {
  win: (reason, view, loserSide) => {
    if (reason === 'checkmate') {
      if (view === 'neutral') return "Échec et mat : le roi est attaqué et ne peut plus s'échapper.";
      return view === 'winner'
        ? "Échec et mat ! Le roi adverse est attaqué et ne peut plus s'échapper."
        : "Échec et mat : ton roi est attaqué et ne peut plus s'échapper.";
    }
    if (view === 'neutral') return `${loserSide} n'ont plus aucun coup possible.`;
    return view === 'winner' ? "L'adversaire n'a plus aucun coup possible." : "Tu n'as plus aucun coup possible.";
  },
  draws: {
    stalemate: "Pat : le joueur qui doit jouer n'a aucun coup possible, mais son roi n'est pas en échec. Personne ne gagne.",
    repetition: 'La même position est revenue trois fois : personne ne gagne.',
    'fifty-moves': '50 coups de chaque côté sans prise ni mouvement de pion : personne ne gagne.',
    'insufficient-material': 'Il ne reste pas assez de pièces pour faire échec et mat : personne ne gagne.',
  },
};

/** `viewer` : couleur du joueur contre l'ordinateur, ou null en mode 2 joueurs. */
export function explainResult(status: GameStatus, viewer: Color | null): ResultText {
  return explainWith(CHESS_TEXTS, status, viewer);
}
