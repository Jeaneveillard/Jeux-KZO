import type { MoveShape } from '../../board/move-input';
import type { GameId } from '../../core/types';
import { chessKit } from './chess';
import { draughtsKit } from './draughts';
import type { GameKit } from './kit';

/** Appelle `run` avec le kit du jeu demandé ; null si ce jeu n'est pas disponible. */
export function withKit<R>(game: GameId, run: <Pos, Move extends MoveShape>(kit: GameKit<Pos, Move>) => R): R | null {
  switch (game) {
    case 'chess':
      return run(chessKit);
    case 'draughts':
      return run(draughtsKit);
  }
}
