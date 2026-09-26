import { describe, expect, it } from 'vitest';
import type { GameStatus, Level } from '../../src/core/types';
import { DraughtsEngine } from '../../src/draughts/engine/draughts-engine';
import { DRAUGHTS_LEVELS } from '../../src/draughts/engine/levels';
import { createInlineSearcher } from '../../src/draughts/engine/searcher';
import { draughtsAdapter, draughtsMoveId, parseDraughts } from '../../src/draughts/rules';
import type { DraughtsPos } from '../../src/draughts/types';

const FAST_LEVELS = { ...DRAUGHTS_LEVELS, expert: { ...DRAUGHTS_LEVELS.expert, timeMs: 300 } };
const MAX_PLIES = 200;
const engine = new DraughtsEngine(createInlineSearcher(), { sleep: async () => undefined, levels: FAST_LEVELS });
const signal = () => new AbortController().signal;

async function playOut(start: DraughtsPos, white: Level, black: Level): Promise<GameStatus> {
  let pos = start;
  for (let ply = 0; ply < MAX_PLIES; ply += 1) {
    const current = draughtsAdapter.status(pos);
    if (current.kind !== 'ongoing') return current;
    const level = pos.turn === 'white' ? white : black;
    pos = draughtsAdapter.play(pos, await engine.bestMove(pos, level, signal()));
  }
  const final = draughtsAdapter.status(pos);
  // Arbitrage : une partie trop longue compte comme nulle.
  return final.kind !== 'ongoing' ? final : { kind: 'draw', reason: 'king-moves' };
}

/** Joue `games` parties en alternant les couleurs ; compte les victoires et défaites de `strong`. */
async function match(strong: Level, weak: Level, games: number): Promise<{ readonly wins: number; readonly losses: number }> {
  let wins = 0;
  let losses = 0;
  for (let game = 0; game < games; game += 1) {
    const strongColor = game % 2 === 0 ? 'white' : 'black';
    const result = await playOut(draughtsAdapter.initial(), strongColor === 'white' ? strong : weak, strongColor === 'white' ? weak : strong);
    if (result.kind === 'win') {
      if (result.winner === strongColor) wins += 1;
      else losses += 1;
    }
  }
  return { wins, losses };
}

describe('force de l’IA de dames', () => {
  it.each([
    ['W:W32,33,38,43:B1,2,22,23', '32-28'],
    ['W:W32,33,38,43:B4,5,12,22,23', '32-28'],
  ])('Expert trouve le coup tactique dans %s', async (fen, expected) => {
    expect(draughtsMoveId(await engine.bestMove(parseDraughts(fen), 'expert', signal()))).toBe(expected);
  });

  it('Expert bat Moyen (au moins 6 victoires, aucune défaite sur 10)', async () => {
    const { wins, losses } = await match('expert', 'moyen', 10);
    expect(losses).toBe(0);
    expect(wins).toBeGreaterThanOrEqual(6);
  });

  it('Moyen bat Faible au moins 8 fois sur 10', async () => {
    expect((await match('moyen', 'faible', 10)).wins).toBeGreaterThanOrEqual(8);
  });
});
