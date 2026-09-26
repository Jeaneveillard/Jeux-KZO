import { describe, expect, it } from 'vitest';
import { WIN_SCORE, WIN_THRESHOLD, runSearch, type SearchRequest } from '../../../../src/draughts/engine/search';
import { START_FEN, parseFen } from '../../../../src/draughts/notation';

function request(fen: string, extra: Partial<SearchRequest> = {}): SearchRequest {
  const { board, turn } = parseFen(fen);
  return { board, turn, maxDepth: 4, timeMs: null, rootScores: false, ...extra };
}

describe('recherche du moteur de dames', () => {
  it('signale une position sans coup', () => {
    expect(runSearch(request('B:W41,47:B36'))).toEqual({ best: null, score: -WIN_SCORE, depth: 0, rootScores: [] });
  });

  it('joue la prise obligatoire', () => {
    expect(runSearch(request('W:W32,46:B28')).best).toBe('32x23');
  });

  it('voit une victoire immédiate', () => {
    const result = runSearch(request('W:WK46:BK28'));
    expect(result.best?.startsWith('46x')).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(WIN_THRESHOLD);
  });

  it('trouve le sacrifice qui gagne deux pions contre un', () => {
    expect(runSearch(request('W:W32,33,38,43:B1,2,22,23', { maxDepth: 5 })).best).toBe('32-28');
  });

  it('note chaque coup quand on le demande', () => {
    const result = runSearch(request(START_FEN, { maxDepth: 2, rootScores: true }));
    expect(result.rootScores).toHaveLength(9);
    const top = Math.max(...result.rootScores.map((entry) => entry.score));
    expect(result.rootScores.find((entry) => entry.move === result.best)?.score).toBe(top);
    expect(result.depth).toBe(2);
  });

  it('respecte le temps de réflexion', () => {
    const started = Date.now();
    const result = runSearch(request(START_FEN, { maxDepth: 64, timeMs: 50 }));
    expect(Date.now() - started).toBeLessThan(1000);
    expect(result.depth).toBeGreaterThanOrEqual(1);
    expect(result.best).not.toBeNull();
  });
});
