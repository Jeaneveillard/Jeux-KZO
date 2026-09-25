import { afterAll, describe, expect, it } from 'vitest';
import { chessAdapter, parseChess } from '../../src/chess/adapter';
import { ChessEngine } from '../../src/chess/engine/chess-engine';
import { LEVELS } from '../../src/chess/engine/levels';
import { StockfishClient } from '../../src/chess/engine/stockfish-client';
import type { ChessPos } from '../../src/chess/types';
import type { GameStatus, Level } from '../../src/core/types';
import { createNodeTransport } from './node-transport';

const FAST_LEVELS = {
  faible: LEVELS.faible,
  moyen: { ...LEVELS.moyen, go: 'go movetime 100' },
  expert: { ...LEVELS.expert, go: 'go movetime 300' },
};
const MAX_PLIES = 240;

const client = new StockfishClient(createNodeTransport, 60_000);
const engine = new ChessEngine(client, { sleep: async () => undefined, levels: FAST_LEVELS });

afterAll(() => client.restart());

async function playOut(start: ChessPos, white: Level, black: Level, maxPlies = MAX_PLIES): Promise<GameStatus> {
  let pos = start;
  for (let ply = 0; ply < maxPlies; ply += 1) {
    const current = chessAdapter.status(pos);
    if (current.kind !== 'ongoing') return current;
    const level = chessAdapter.turn(pos) === 'white' ? white : black;
    pos = chessAdapter.play(pos, await engine.bestMove(pos, level, new AbortController().signal));
  }
  const final = chessAdapter.status(pos);
  // Arbitrage : une partie trop longue compte comme nulle.
  return final.kind !== 'ongoing' ? final : { kind: 'draw', reason: 'fifty-moves' };
}

/** Joue `games` parties en alternant les couleurs ; renvoie le nombre de victoires de `strong`. */
async function match(strong: Level, weak: Level, games: number): Promise<number> {
  let wins = 0;
  for (let game = 0; game < games; game += 1) {
    const strongColor = game % 2 === 0 ? 'white' : 'black';
    const result = await playOut(
      chessAdapter.initial(),
      strongColor === 'white' ? strong : weak,
      strongColor === 'white' ? weak : strong,
    );
    if (result.kind === 'win' && result.winner === strongColor) wins += 1;
  }
  return wins;
}

describe('force de l’IA', () => {
  it.each([
    ['6k1/pp4p1/2p5/2bp4/8/P5Pb/1P3rrP/2BRRN1K b - - 0 1', 2],
    ['r2qkb1r/pp2nppp/3p4/2pNN1B1/2BnP3/3P4/PPP2PPP/R2bK2R w KQkq - 1 1', 2],
    ['r1b1kb1r/pppp1ppp/5q2/4n3/3KP3/2N3PN/PPP4P/R1BQ1B1R b kq - 0 1', 3],
  ] as const)('Expert trouve le mat dans %s (mat en %i)', async (fen, mateIn) => {
    const start = parseChess(fen);
    const attacker = chessAdapter.turn(start);
    const result = await playOut(start, 'expert', 'expert', mateIn * 2 - 1);
    expect(result).toEqual({ kind: 'win', winner: attacker, reason: 'checkmate' });
  });

  it('Expert bat Moyen au moins 9 fois sur 10', async () => {
    expect(await match('expert', 'moyen', 10)).toBeGreaterThanOrEqual(9);
  });

  it('Moyen bat Faible au moins 8 fois sur 10', async () => {
    expect(await match('moyen', 'faible', 10)).toBeGreaterThanOrEqual(8);
  });
});
