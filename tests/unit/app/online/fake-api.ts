import { vi } from 'vitest';
import type { OnlineApi } from '../../../../src/online/api';
import type { WatchHandlers } from '../../../../src/online/backend';
import type { OnlineGame } from '../../../../src/online/types';
import { onlineGame } from '../../online/fixtures';

/** Faux serveur : une partie en mémoire, modifiable, et des événements déclenchables. */
export function fakeApi(initial: OnlineGame | null = onlineGame()) {
  let current: OnlineGame | null = initial;
  let handlers: WatchHandlers | null = null;
  const now = (): OnlineGame => {
    if (!current) throw new Error('aucune partie');
    return current;
  };
  const update = (changes: Partial<OnlineGame>): OnlineGame => {
    current = { ...now(), ...changes };
    return current;
  };
  const api = {
    userId: vi.fn(async () => 'moi'),
    createGame: vi.fn(async () => now()),
    joinGame: vi.fn(async () => now()),
    playMove: vi.fn(async (game: OnlineGame, move: string) => update({ moves: [...game.moves, move] })),
    offerDraw: vi.fn(async () => update({ drawOfferedBy: 'white' })),
    answerDraw: vi.fn(async (_gameId: string, accept: boolean) =>
      update(accept ? { status: 'terminee', result: { kind: 'draw', reason: 'agreement' }, drawOfferedBy: null } : { drawOfferedBy: null }),
    ),
    resign: vi.fn(async () => update({ status: 'terminee', result: { kind: 'win', winner: 'black', reason: 'resign' } })),
    cancel: vi.fn(async () => {
      current = null;
    }),
    rematch: vi.fn(async () => onlineGame({ code: 'REVAN2', white: { id: 'ami', pseudo: 'Bob' }, black: { id: 'moi', pseudo: 'Alice' } })),
    findGame: vi.fn(async () => current),
    listGames: vi.fn(async () => (current ? [current] : [])),
    watch: vi.fn((_gameId: string, _userId: string, next: WatchHandlers) => {
      handlers = next;
      return () => {
        handlers = null;
      };
    }),
  } satisfies OnlineApi;
  return {
    api,
    set: (game: OnlineGame | null) => {
      current = game;
    },
    changed: () => handlers?.onChange(),
    presence: (userIds: readonly string[]) => handlers?.onPresence(userIds),
    connection: (connected: boolean) => handlers?.onConnection(connected),
    watching: () => handlers !== null,
  };
}
