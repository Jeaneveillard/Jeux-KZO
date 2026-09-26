import { act, renderHook, waitFor } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { chessKit } from '../../../../src/app/games/chess';
import { useOnlineGame } from '../../../../src/app/online/useOnlineGame';
import { OnlineError } from '../../../../src/online/errors';
import type { OnlineGame } from '../../../../src/online/types';
import { onlineGame } from '../../online/fixtures';
import { fakeApi } from './fake-api';

function setup(fake = fakeApi()) {
  const hook = renderHook(() => useOnlineGame(chessKit, fake.api, 'moi', 'K7M2QX', false));
  return { fake, hook };
}

describe('useOnlineGame', () => {
  it('charge la partie et suit ses changements', async () => {
    const { fake, hook } = setup();
    await waitFor(() => expect(hook.result.current.view?.myTurn).toBe(true));
    expect(hook.result.current.loading).toBe(false);
    expect(fake.watching()).toBe(true);
    fake.set(onlineGame({ moves: ['e2e4', 'e7e5'] }));
    act(() => fake.changed());
    await waitFor(() => expect(hook.result.current.game?.moves).toEqual(['e2e4', 'e7e5']));
  });

  it('joue un coup avec le numéro attendu et affiche le coup tout de suite', async () => {
    const { fake, hook } = setup();
    await waitFor(() => expect(hook.result.current.legal.length).toBeGreaterThan(0));
    act(() => hook.result.current.input.tap('e2'));
    act(() => hook.result.current.input.tap('e4'));
    expect(hook.result.current.view?.session.moves).toHaveLength(1);
    expect(fake.api.playMove).toHaveBeenCalledWith(onlineGame(), 'e2e4', null);
    await waitFor(() => expect(hook.result.current.game?.moves).toEqual(['e2e4']));
    expect(hook.result.current.view?.myTurn).toBe(false);
  });

  it('relit la partie après des coups croisés', async () => {
    const { fake, hook } = setup();
    await waitFor(() => expect(hook.result.current.legal.length).toBeGreaterThan(0));
    fake.api.playMove.mockRejectedValueOnce(new OnlineError('conflit'));
    act(() => hook.result.current.input.tap('e2'));
    act(() => hook.result.current.input.tap('e4'));
    await waitFor(() => expect(hook.result.current.notice).toBe('La partie a changé : rejoue ton coup.'));
    expect(hook.result.current.view?.session.moves).toHaveLength(0);
    expect(fake.api.findGame.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('suit la présence de l’ami et la connexion', async () => {
    const { fake, hook } = setup();
    await waitFor(() => expect(fake.watching()).toBe(true));
    act(() => fake.presence(['moi', 'ami']));
    expect(hook.result.current.opponentOnline).toBe(true);
    act(() => fake.connection(false));
    expect(hook.result.current.connected).toBe(false);
    expect(hook.result.current.legal).toEqual([]);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(hook.result.current.connected).toBe(true);
  });

  it('signale une partie introuvable', async () => {
    const { hook } = setup(fakeApi(null));
    await waitFor(() => expect(hook.result.current.error).toBe("Cette partie n'existe plus, ou ce n'est pas la tienne."));
  });

  it('propose, accepte la nulle, abandonne, annule et lance la revanche', async () => {
    const { fake, hook } = setup();
    const idle = () => expect(hook.result.current.busy).toBe(false);
    await waitFor(() => expect(hook.result.current.game).not.toBeNull());
    act(() => hook.result.current.offerDraw());
    await waitFor(() => {
      expect(hook.result.current.game?.drawOfferedBy).toBe('white');
      idle();
    });
    act(() => hook.result.current.answerDraw(true));
    await waitFor(() => {
      expect(hook.result.current.game?.status).toBe('terminee');
      idle();
    });
    expect(await hook.result.current.rematch()).toBe('REVAN2');
    fake.set(onlineGame());
    act(() => fake.changed());
    await waitFor(() => expect(hook.result.current.game?.status).toBe('en_cours'));
    act(() => hook.result.current.resign());
    await waitFor(() => {
      expect(hook.result.current.game?.status).toBe('terminee');
      idle();
    });
    expect(await hook.result.current.cancel()).toBe(true);
    expect(fake.api.cancel).toHaveBeenCalledWith(onlineGame().id);
  });

  it('n’affiche pas deux fois un coup relu avant la réponse du serveur', async () => {
    const { fake, hook } = setup();
    await waitFor(() => expect(hook.result.current.legal.length).toBeGreaterThan(0));
    let answer: (game: OnlineGame) => void = () => undefined;
    fake.api.playMove.mockImplementationOnce(
      () =>
        new Promise<OnlineGame>((resolve) => {
          answer = resolve;
        }),
    );
    act(() => hook.result.current.input.tap('e2'));
    act(() => hook.result.current.input.tap('e4'));
    const played = onlineGame({ moves: ['e2e4'], updatedAt: '2026-09-26T10:00:05Z' });
    fake.set(played);
    act(() => fake.changed());
    await waitFor(() => expect(hook.result.current.game?.moves).toEqual(['e2e4']));
    expect(hook.result.current.view?.invalidMove).toBe(false);
    expect(hook.result.current.view?.session.moves).toHaveLength(1);
    act(() => answer(played));
    await waitFor(() => expect(hook.result.current.busy).toBe(false));
    expect(hook.result.current.view?.session.moves).toHaveLength(1);
  });

  it('bloque les actions pendant une revanche en cours', async () => {
    const { fake, hook } = setup(fakeApi(onlineGame({ status: 'terminee', result: { kind: 'win', winner: 'black', reason: 'resign' } })));
    await waitFor(() => expect(hook.result.current.game).not.toBeNull());
    let done: (game: OnlineGame) => void = () => undefined;
    fake.api.rematch.mockImplementationOnce(
      () =>
        new Promise<OnlineGame>((resolve) => {
          done = resolve;
        }),
    );
    let code: Promise<string | null> = Promise.resolve(null);
    act(() => {
      code = hook.result.current.rematch();
    });
    expect(hook.result.current.busy).toBe(true);
    act(() => done(onlineGame({ code: 'REVAN2' })));
    expect(await code).toBe('REVAN2');
    await waitFor(() => expect(hook.result.current.busy).toBe(false));
  });
});
