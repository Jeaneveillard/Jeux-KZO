import type { DraughtsLevelConfig } from './levels';
import type { RootScore } from './search';

/** Un « coup moyen » ne perd pas plus que l'équivalent de 2,5 pions par rapport au meilleur. */
export const MEDIUM_MOVE_MARGIN = 250;

/** Choix du coup : parfois un coup moyen, sinon le meilleur après bruit sur les notes. */
export function pickDraughtsMove(
  best: string | null,
  rootScores: readonly RootScore[],
  config: Pick<DraughtsLevelConfig, 'noise' | 'randomRate'>,
  rng: () => number,
): string | null {
  if (rootScores.length === 0) return best;
  const ranked = [...rootScores].sort((a, b) => b.score - a.score);
  if (ranked.length > 1 && config.randomRate > 0 && rng() < config.randomRate) {
    const pool = ranked
      .slice(1)
      .filter((entry) => entry.score >= ranked[0].score - MEDIUM_MOVE_MARGIN)
      .slice(0, Math.ceil(ranked.length / 2));
    return pool.length > 0 ? pool[Math.floor(rng() * pool.length)].move : ranked[0].move;
  }
  if (config.noise <= 0) return ranked[0].move;
  let choice = ranked[0];
  let choiceScore = -Infinity;
  for (const entry of ranked) {
    const noisy = entry.score + (rng() * 2 - 1) * config.noise;
    if (noisy > choiceScore) {
      choice = entry;
      choiceScore = noisy;
    }
  }
  return choice.move;
}
