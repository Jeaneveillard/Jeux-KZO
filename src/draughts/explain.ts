import { explainWith, type ResultText, type ResultTexts } from '../core/explain';
import type { Color, GameStatus } from '../core/types';

const DRAUGHTS_TEXTS: ResultTexts = {
  win: (_reason, view, loserSide) => {
    if (view === 'neutral') return `${loserSide} ne peuvent plus jouer : toutes leurs pièces sont prises ou bloquées.`;
    return view === 'winner'
      ? "L'adversaire ne peut plus jouer : toutes ses pièces sont prises ou bloquées."
      : 'Tu ne peux plus jouer : toutes tes pièces sont prises ou bloquées.';
  },
  draws: {
    repetition: 'La même position est revenue trois fois : personne ne gagne.',
    'king-moves': '25 coups de suite avec seulement des dames, sans prise ni pion joué : personne ne gagne.',
    'endgame-limit': 'Il reste trop peu de pièces pour gagner dans le nombre de coups permis : personne ne gagne.',
  },
};

/** `viewer` : couleur du joueur contre l'ordinateur, ou null en mode 2 joueurs. */
export function explainDraughtsResult(status: GameStatus, viewer: Color | null): ResultText {
  return explainWith(DRAUGHTS_TEXTS, status, viewer);
}
