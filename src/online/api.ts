import type { Color, GameId, GameStatus } from '../core/types';
import type { Backend, WatchHandlers } from './backend';
import { OnlineError } from './errors';
import { parseGameRow } from './rows';
import type { OnlineGame } from './types';

export interface OnlineApi {
  userId(): Promise<string>;
  createGame(game: GameId, color: Color, pseudo: string): Promise<OnlineGame>;
  joinGame(code: string, pseudo: string): Promise<OnlineGame>;
  /** `game` : dernière partie confirmée par le serveur (son nombre de coups sert de numéro attendu). */
  playMove(game: OnlineGame, move: string, result: GameStatus | null): Promise<OnlineGame>;
  offerDraw(gameId: string): Promise<OnlineGame>;
  answerDraw(gameId: string, accept: boolean): Promise<OnlineGame>;
  resign(gameId: string): Promise<OnlineGame>;
  cancel(gameId: string): Promise<void>;
  rematch(gameId: string): Promise<OnlineGame>;
  findGame(code: string): Promise<OnlineGame | null>;
  listGames(game: GameId): Promise<OnlineGame[]>;
  watch(gameId: string, userId: string, handlers: WatchHandlers): () => void;
}

function toGame(value: unknown): OnlineGame {
  const game = parseGameRow(value);
  if (!game) throw new OnlineError('reponse_invalide');
  return game;
}

export function createOnlineApi(backend: Backend): OnlineApi {
  const call = async (fn: string, args: Readonly<Record<string, unknown>>) => toGame(await backend.rpc(fn, args));
  return {
    userId: () => backend.userId(),
    createGame: (game, color, pseudo) => call('creer_partie', { p_jeu: game, p_couleur: color, p_pseudo: pseudo }),
    joinGame: (code, pseudo) => call('rejoindre_partie', { p_code: code, p_pseudo: pseudo }),
    playMove: (game, move, result) => call('jouer_coup', { p_partie: game.id, p_numero: game.moves.length, p_coup: move, p_resultat: result }),
    offerDraw: (gameId) => call('proposer_nulle', { p_partie: gameId }),
    answerDraw: (gameId, accept) => call('repondre_nulle', { p_partie: gameId, p_accepte: accept }),
    resign: (gameId) => call('abandonner', { p_partie: gameId }),
    cancel: async (gameId) => {
      await backend.rpc('annuler_partie', { p_partie: gameId });
    },
    rematch: (gameId) => call('lancer_revanche', { p_partie: gameId }),
    findGame: async (code) => {
      const value = await backend.findGame(code);
      return value === null || value === undefined ? null : toGame(value);
    },
    listGames: async (game) => (await backend.listGames(game)).map(toGame),
    watch: (gameId, userId, handlers) => backend.watch(gameId, userId, handlers),
  };
}
