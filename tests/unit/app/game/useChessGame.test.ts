import { act, renderHook } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { createSession, type GameSetup } from '../../../../src/app/game/session';
import { useChessGame } from '../../../../src/app/game/useChessGame';
import { createStorage } from '../../../../src/app/storage';
import { chessAdapter } from '../../../../src/chess/adapter';
import type { ChessMove, ChessPos } from '../../../../src/chess/types';
import type { Engine, Evaluation } from '../../../../src/core/types';

/** Moteur factice : les analyses attendent qu'on les libère, l'ordinateur ne répond jamais. */
function fakeEngine() {
  const pending: (() => void)[] = [];
  const engine: Engine<ChessPos, ChessMove> = {
    bestMove: vi.fn(() => new Promise<ChessMove>(() => undefined)),
    analyse: vi.fn(
      () => new Promise<{ readonly best: ChessMove } & Evaluation>((resolve) => pending.push(() => resolve({ best: { from: 'e2', to: 'e4' }, scoreCp: 0 }))),
    ),
  };
  const releaseAll = async () => {
    for (let round = 0; round < 5; round += 1) {
      await act(async () => {
        pending.splice(0).forEach((release) => release());
        await Promise.resolve();
      });
    }
  };
  return { engine, releaseAll };
}

function setup(level: GameSetup['level']) {
  const { engine, releaseAll } = fakeEngine();
  const initial = createSession(chessAdapter, { game: 'chess', mode: 'ai', level, playerColor: 'white' }, chessAdapter.initial());
  const hook = renderHook(() => useChessGame(initial, { engine: () => engine, storage: createStorage(null), sound: false }));
  const playE4 = () => {
    act(() => hook.result.current.tap('e2'));
    act(() => hook.result.current.tap('e4'));
  };
  return { hook, playE4, releaseAll };
}

describe('useChessGame', () => {
  it('ignore l’abandon pendant la vérification du coup, puis joue le coup', async () => {
    const { hook, playE4, releaseAll } = setup('faible');
    playE4();
    expect(hook.result.current.checking).toBe(true);
    act(() => hook.result.current.resignGame());
    expect(hook.result.current.session.result).toEqual({ kind: 'ongoing' });
    await releaseAll();
    expect(hook.result.current.session.moves).toEqual([{ from: 'e2', to: 'e4' }]);
    expect(hook.result.current.session.result).toEqual({ kind: 'ongoing' });
  });

  it('permet d’abandonner pendant que l’ordinateur réfléchit', () => {
    const { hook, playE4 } = setup('moyen');
    playE4();
    expect(hook.result.current.thinking).toBe(true);
    act(() => hook.result.current.resignGame());
    expect(hook.result.current.session.result).toEqual({ kind: 'win', winner: 'black', reason: 'resign' });
  });
});
