import { opposite, type Color, type DrawReason, type GameStatus, type WinReason } from '../core/types';
import { sideName } from './names';

export interface ResultText {
  readonly title: string;
  readonly detail: string;
}

const DRAW_DETAILS: Readonly<Record<DrawReason, string>> = {
  stalemate: "Pat : le joueur qui doit jouer n'a aucun coup possible, mais son roi n'est pas en échec. Personne ne gagne.",
  repetition: 'La même position est revenue trois fois : personne ne gagne.',
  'fifty-moves': '50 coups de chaque côté sans prise ni mouvement de pion : personne ne gagne.',
  'insufficient-material': 'Il ne reste pas assez de pièces pour faire échec et mat : personne ne gagne.',
};

function capitalize(text: string): string {
  return `${text[0].toUpperCase()}${text.slice(1)}`;
}

function winDetail(reason: WinReason, viewer: Color | null, winner: Color): string {
  const loserSide = capitalize(sideName(opposite(winner)));
  const viewerWon = viewer === winner;
  switch (reason) {
    case 'checkmate':
      if (viewer === null) return "Échec et mat : le roi est attaqué et ne peut plus s'échapper.";
      return viewerWon
        ? "Échec et mat ! Le roi adverse est attaqué et ne peut plus s'échapper."
        : "Échec et mat : ton roi est attaqué et ne peut plus s'échapper.";
    case 'resign':
      if (viewer === null) return `${loserSide} ont abandonné.`;
      return viewerWon ? "L'adversaire a abandonné." : 'Tu as abandonné la partie.';
    case 'no-moves':
      if (viewer === null) return `${loserSide} n'ont plus aucun coup possible.`;
      return viewerWon ? "L'adversaire n'a plus aucun coup possible." : "Tu n'as plus aucun coup possible.";
  }
}

/** `viewer` : couleur du joueur contre l'ordinateur, ou null en mode 2 joueurs. */
export function explainResult(status: GameStatus, viewer: Color | null): ResultText {
  if (status.kind === 'ongoing') return { title: 'Partie en cours', detail: '' };
  if (status.kind === 'draw') return { title: 'Partie nulle', detail: DRAW_DETAILS[status.reason] };
  const title =
    viewer === null ? `${capitalize(sideName(status.winner))} gagnent !` : viewer === status.winner ? 'Victoire !' : 'Défaite';
  return { title, detail: winDetail(status.reason, viewer, status.winner) };
}
