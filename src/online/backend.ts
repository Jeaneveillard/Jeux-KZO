import type { GameId } from '../core/types';

export interface WatchHandlers {
  /** La partie a changé sur le serveur : il faut la relire. */
  onChange(): void;
  /** Identifiants des joueurs présents sur la partie. */
  onPresence(userIds: readonly string[]): void;
  /** État de la connexion temps réel. */
  onConnection(connected: boolean): void;
}

/** Accès brut au serveur : Supabase en vrai, faux serveur dans les tests. Les erreurs levées sont des `OnlineError`. */
export interface Backend {
  userId(): Promise<string>;
  rpc(fn: string, args: Readonly<Record<string, unknown>>): Promise<unknown>;
  listGames(game: GameId): Promise<readonly unknown[]>;
  findGame(code: string): Promise<unknown>;
  /** Suit une partie ; renvoie la fonction qui arrête le suivi. */
  watch(gameId: string, userId: string, handlers: WatchHandlers): () => void;
}
