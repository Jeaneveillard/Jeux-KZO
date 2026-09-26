import { opposite, type Color, type DrawReason, type GameStatus, type WinReason } from './types';

export interface ResultText {
  readonly title: string;
  readonly detail: string;
}

/** Point de vue de celui qui lit le résultat : vainqueur, perdant, ou neutre (partie à 2). */
export type ResultView = 'winner' | 'loser' | 'neutral';

/** Textes propres à un jeu ; l'abandon, les titres et la nulle par défaut sont communs. */
export interface ResultTexts {
  win(reason: Exclude<WinReason, 'resign'>, view: ResultView, loserSide: string): string;
  readonly draws: Readonly<Partial<Record<DrawReason, string>>>;
}

const DEFAULT_DRAW_DETAIL = 'Personne ne gagne.';

export function sideName(color: Color): string {
  return color === 'white' ? 'les Blancs' : 'les Noirs';
}

export function capitalize(text: string): string {
  return `${text[0].toUpperCase()}${text.slice(1)}`;
}

function resignDetail(view: ResultView, loserSide: string): string {
  if (view === 'neutral') return `${loserSide} ont abandonné.`;
  return view === 'winner' ? "L'adversaire a abandonné." : 'Tu as abandonné la partie.';
}

/** `viewer` : couleur du joueur contre l'ordinateur, ou null en mode 2 joueurs. */
export function explainWith(texts: ResultTexts, status: GameStatus, viewer: Color | null): ResultText {
  if (status.kind === 'ongoing') return { title: 'Partie en cours', detail: '' };
  if (status.kind === 'draw') return { title: 'Partie nulle', detail: texts.draws[status.reason] ?? DEFAULT_DRAW_DETAIL };
  const view: ResultView = viewer === null ? 'neutral' : viewer === status.winner ? 'winner' : 'loser';
  const loserSide = capitalize(sideName(opposite(status.winner)));
  const title = view === 'neutral' ? `${capitalize(sideName(status.winner))} gagnent !` : view === 'winner' ? 'Victoire !' : 'Défaite';
  const detail = status.reason === 'resign' ? resignDetail(view, loserSide) : texts.win(status.reason, view, loserSide);
  return { title, detail };
}
