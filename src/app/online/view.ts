import type { Color, GameAdapter, GameStatus } from '../../core/types';
import type { OnlineGame } from '../../online/types';
import { applyMove, createSession, currentPosition, type Session } from '../game/session';

/** Ce qu'il faut d'un jeu pour rejouer une partie en ligne (un `GameKit` convient). */
export interface OnlineRules<Pos, Move> {
  readonly adapter: GameAdapter<Pos, Move>;
  readonly codec: { encode(move: Move): string; decode(text: string, pos: Pos): Move };
}

export interface OnlineView<Pos, Move> {
  readonly session: Session<Pos, Move>;
  /** Un coup reçu est illégal selon nos règles : la partie ne peut pas continuer. */
  readonly invalidMove: boolean;
  /** Ma couleur, ou null si je ne joue pas cette partie. */
  readonly myColor: Color | null;
  readonly myTurn: boolean;
  readonly opponentName: string;
  readonly opponentId: string | null;
  /** Résultat officiel (serveur) d'une partie terminée, sinon celui des règles. */
  readonly result: GameStatus;
}

export function colorOf(game: OnlineGame, userId: string): Color | null {
  if (game.white.id === userId) return 'white';
  if (game.black.id === userId) return 'black';
  return null;
}

/** Les deux jeux commencent par les Blancs : le trait se déduit du nombre de coups. */
export function turnOf(game: OnlineGame): Color {
  return game.moves.length % 2 === 0 ? 'white' : 'black';
}

function opponentName(game: OnlineGame, myColor: Color | null): string {
  return (myColor === 'black' ? game.white : game.black).pseudo ?? 'ton ami';
}

export function buildOnlineView<Pos, Move>(rules: OnlineRules<Pos, Move>, game: OnlineGame, userId: string): OnlineView<Pos, Move> {
  const myColor = colorOf(game, userId);
  const setup = { game: game.game, mode: 'online', level: null, playerColor: myColor ?? 'white' } as const;
  let session = createSession(rules.adapter, setup, rules.adapter.parse(game.start));
  let invalidMove = false;
  for (const text of game.moves) {
    try {
      session = applyMove(rules.adapter, session, rules.codec.decode(text, currentPosition(session)));
    } catch {
      invalidMove = true;
      break;
    }
  }
  const myTurn = game.status === 'en_cours' && !invalidMove && myColor !== null && rules.adapter.turn(currentPosition(session)) === myColor;
  return {
    session,
    invalidMove,
    myColor,
    myTurn,
    opponentName: opponentName(game, myColor),
    opponentId: (myColor === 'black' ? game.white : game.black).id,
    result: game.status === 'terminee' && game.result ? game.result : session.result,
  };
}

/** Résultat à envoyer avec un coup : null si la partie continue. */
export function resultAfter<Pos, Move>(rules: OnlineRules<Pos, Move>, pos: Pos, move: Move): GameStatus | null {
  const status = rules.adapter.status(rules.adapter.play(pos, move));
  return status.kind === 'ongoing' ? null : status;
}

export interface StatusContext {
  readonly connected: boolean;
  readonly opponentOnline: boolean;
}

export function onlineStatusText<Pos, Move>(game: OnlineGame, view: OnlineView<Pos, Move>, context: StatusContext): string {
  if (!context.connected) return 'Connexion perdue, reconnexion…';
  if (view.invalidMove) return 'Coup invalide reçu : la partie ne peut pas continuer.';
  if (game.status === 'attente') return 'En attente de ton ami…';
  if (game.status === 'terminee') return 'Partie terminée';
  if (view.myTurn) return 'À toi de jouer';
  return context.opponentOnline ? `C'est à ${view.opponentName} de jouer` : `C'est à ${view.opponentName} de jouer (hors ligne pour l'instant)`;
}

export interface ListEntry {
  readonly game: OnlineGame;
  readonly label: string;
  readonly detail: string;
}

/** « Mes parties en ligne » : à mon tour, puis au tour de l'ami, puis en attente, puis terminées ; les plus récentes d'abord. */
export function listEntries(games: readonly OnlineGame[], userId: string): ListEntry[] {
  const rank = (game: OnlineGame): number => {
    if (game.status === 'en_cours') return turnOf(game) === colorOf(game, userId) ? 0 : 1;
    return game.status === 'attente' ? 2 : 3;
  };
  const describe = (game: OnlineGame): ListEntry => {
    const opponent = opponentName(game, colorOf(game, userId));
    const details = ['À toi de jouer', `C'est à ${opponent} de jouer`, 'En attente de ton ami', 'Partie terminée'];
    return { game, label: game.status === 'attente' ? `Partie ${game.code}` : `Contre ${opponent}`, detail: details[rank(game)] };
  };
  return [...games].sort((a, b) => rank(a) - rank(b) || b.updatedAt.localeCompare(a.updatedAt)).map(describe);
}
