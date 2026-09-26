import type { MoveShape } from '../../board/move-input';
import type { GameId } from '../../core/types';
import { chessKit } from './chess';
import type { GameKit } from './kit';

/** Appelle `run` avec le kit du jeu demandé ; null si ce jeu n'est pas encore disponible. */
export function withKit<R>(game: GameId, run: <Pos, Move extends MoveShape>(kit: GameKit<Pos, Move>) => R): R | null {
  switch (game) {
    case 'chess':
      return run(chessKit);
    case 'draughts':
      return null;
  }
}
