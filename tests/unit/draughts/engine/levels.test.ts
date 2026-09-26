import { describe, expect, it } from 'vitest';
import { DRAUGHTS_BLUNDER_DEPTH, DRAUGHTS_HINT_DEPTH, DRAUGHTS_LEVELS } from '../../../../src/draughts/engine/levels';
import { pickDraughtsMove } from '../../../../src/draughts/engine/pick';

const sequence = (...values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length];
};
const scores = [
  { move: 'a', score: 50 },
  { move: 'b', score: 40 },
  { move: 'c', score: -100 },
  { move: 'd', score: -900 },
];

describe('niveaux du moteur de dames', () => {
  it('suit la spec : profondeur 2, profondeur 6, 3 secondes', () => {
    expect(DRAUGHTS_LEVELS.faible).toMatchObject({ maxDepth: 2, timeMs: null, minDelayMs: 600 });
    expect(DRAUGHTS_LEVELS.faible.noise).toBeGreaterThan(DRAUGHTS_LEVELS.moyen.noise);
    expect(DRAUGHTS_LEVELS.faible.randomRate).toBeGreaterThan(0);
    expect(DRAUGHTS_LEVELS.moyen).toMatchObject({ maxDepth: 6, timeMs: null, minDelayMs: 600, randomRate: 0 });
    expect(DRAUGHTS_LEVELS.expert).toMatchObject({ timeMs: 3000, noise: 0, randomRate: 0, minDelayMs: 0, timeoutMs: 8000 });
    expect(DRAUGHTS_HINT_DEPTH).toBe(8);
    expect(DRAUGHTS_BLUNDER_DEPTH).toBe(6);
  });

  it('joue le meilleur coup sans bruit ni hasard', () => {
    expect(pickDraughtsMove('a', scores, { noise: 0, randomRate: 0 }, sequence(0.5))).toBe('a');
    expect(pickDraughtsMove('z', [], { noise: 150, randomRate: 0.5 }, sequence(0.5))).toBe('z');
    expect(pickDraughtsMove(null, [], { noise: 0, randomRate: 0 }, sequence(0.5))).toBeNull();
  });

  it('se laisse tromper par le bruit', () => {
    expect(pickDraughtsMove('a', scores, { noise: 150, randomRate: 0 }, sequence(0.1, 0.9, 0.5, 0.5))).toBe('b');
  });

  it('joue parfois un coup moyen, mais jamais un coup très mauvais', () => {
    expect(pickDraughtsMove('a', scores, { noise: 0, randomRate: 0.2 }, sequence(0.1, 0.99))).toBe('c');
    expect(pickDraughtsMove('a', [scores[0], scores[3]], { noise: 0, randomRate: 0.2 }, sequence(0.1))).toBe('a');
  });
});
