import { describe, expect, it, vi } from 'vitest';
import { createOnlineApi } from '../../../src/online/api';
import type { Backend } from '../../../src/online/backend';
import { OnlineError } from '../../../src/online/errors';
import { onlineGame, row } from './fixtures';

function fakeBackend(rpcResult: unknown = row()) {
  const backend: Backend = {
    userId: vi.fn(async () => 'moi'),
    rpc: vi.fn(async () => rpcResult),
    listGames: vi.fn(async () => [row(), row({ code: 'ABCDEF' })]),
    findGame: vi.fn(async (code: string) => (code === 'K7M2QX' ? row() : null)),
    watch: vi.fn(() => () => undefined),
  };
  return backend;
}

describe('API du jeu en ligne', () => {
  it('appelle les fonctions du serveur avec les bons paramètres', async () => {
    const backend = fakeBackend();
    const api = createOnlineApi(backend);
    await api.createGame('draughts', 'black', 'Alice');
    await api.joinGame('K7M2QX', 'Bob');
    await api.playMove(onlineGame({ moves: ['e2e4'] }), 'e7e5', null);
    await api.offerDraw('p1');
    await api.answerDraw('p1', true);
    await api.resign('p1');
    await api.cancel('p1');
    await api.rematch('p1');
    expect(vi.mocked(backend.rpc).mock.calls).toEqual([
      ['creer_partie', { p_jeu: 'draughts', p_couleur: 'black', p_pseudo: 'Alice' }],
      ['rejoindre_partie', { p_code: 'K7M2QX', p_pseudo: 'Bob' }],
      ['jouer_coup', { p_partie: '11111111-1111-4111-8111-111111111111', p_numero: 1, p_coup: 'e7e5', p_resultat: null }],
      ['proposer_nulle', { p_partie: 'p1' }],
      ['repondre_nulle', { p_partie: 'p1', p_accepte: true }],
      ['abandonner', { p_partie: 'p1' }],
      ['annuler_partie', { p_partie: 'p1' }],
      ['lancer_revanche', { p_partie: 'p1' }],
    ]);
  });

  it('vérifie les réponses du serveur', async () => {
    await expect(createOnlineApi(fakeBackend(row())).resign('p1')).resolves.toEqual(onlineGame());
    await expect(createOnlineApi(fakeBackend({ n: 1 })).resign('p1')).rejects.toThrow(OnlineError);
    await expect(createOnlineApi(fakeBackend({ n: 1 })).resign('p1')).rejects.toMatchObject({ code: 'reponse_invalide' });
  });

  it('relit une partie, liste les parties et suit les changements', async () => {
    const backend = fakeBackend();
    const api = createOnlineApi(backend);
    expect(await api.findGame('K7M2QX')).toEqual(onlineGame());
    expect(await api.findGame('ZZZZZZ')).toBeNull();
    expect((await api.listGames('chess')).map((game) => game.code)).toEqual(['K7M2QX', 'ABCDEF']);
    expect(await api.userId()).toBe('moi');
    const handlers = { onChange: vi.fn(), onPresence: vi.fn(), onConnection: vi.fn() };
    api.watch('p1', 'moi', handlers);
    expect(backend.watch).toHaveBeenCalledWith('p1', 'moi', handlers);
  });
});
