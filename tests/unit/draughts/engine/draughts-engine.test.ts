import { describe, expect, it, vi } from 'vitest';
import { EngineAbortError, EngineTimeoutError, EngineUnavailableError } from '../../../../src/core/engine-errors';
import { DraughtsEngine, evaluationOfScore } from '../../../../src/draughts/engine/draughts-engine';
import { DRAUGHTS_LEVELS } from '../../../../src/draughts/engine/levels';
import { WIN_SCORE, type SearchRequest, type SearchResult } from '../../../../src/draughts/engine/search';
import { createInlineSearcher, type DraughtsSearcher } from '../../../../src/draughts/engine/searcher';
import { draughtsAdapter, parseDraughts } from '../../../../src/draughts/rules';

const start = draughtsAdapter.initial();
const signal = () => new AbortController().signal;
const result = (best: string | null, extra: Partial<SearchResult> = {}): SearchResult => ({ best, score: 0, depth: 3, rootScores: [], ...extra });

function fakeSearcher(...answers: (SearchResult | Error)[]) {
  const requests: { request: SearchRequest; timeoutMs: number }[] = [];
  const searcher: DraughtsSearcher = {
    search: async (request, timeoutMs) => {
      requests.push({ request, timeoutMs });
      const answer = answers[Math.min(requests.length - 1, answers.length - 1)];
      if (answer instanceof Error) throw answer;
      return answer;
    },
  };
  return { searcher, requests };
}

describe('DraughtsEngine', () => {
  it('Expert cherche 3 secondes et joue le meilleur coup', async () => {
    const { searcher, requests } = fakeSearcher(result('32-28'));
    const engine = new DraughtsEngine(searcher, { sleep: async () => undefined });
    expect(await engine.bestMove(start, 'expert', signal())).toMatchObject({ from: '32', to: '28' });
    expect(requests[0].request).toMatchObject({ maxDepth: 64, timeMs: 3000, rootScores: false, turn: 'white' });
    expect(requests[0].timeoutMs).toBe(8000);
  });

  it('Faible demande la note de chaque coup et choisit avec le hasard', async () => {
    const rootScores = [
      { move: '32-28', score: 30 },
      { move: '31-27', score: 20 },
    ];
    const { searcher, requests } = fakeSearcher(result('32-28', { rootScores }));
    const engine = new DraughtsEngine(searcher, { sleep: async () => undefined, rng: vi.fn().mockReturnValueOnce(0.9).mockReturnValueOnce(0).mockReturnValueOnce(1) });
    expect(await engine.bestMove(start, 'faible', signal())).toMatchObject({ from: '31', to: '27' });
    expect(requests[0].request).toMatchObject({ maxDepth: 2, timeMs: null, rootScores: true });
  });

  it('attend le délai minimal pour garder un rythme naturel', async () => {
    const sleep = vi.fn(async () => undefined);
    const { searcher } = fakeSearcher(result('32-28', { rootScores: [{ move: '32-28', score: 0 }] }));
    await new DraughtsEngine(searcher, { sleep, now: () => 1000, rng: () => 0.5 }).bestMove(start, 'moyen', signal());
    expect(sleep).toHaveBeenCalledWith(600);
  });

  it('refuse de rendre un coup si la partie a été quittée pendant l’attente', async () => {
    const controller = new AbortController();
    const { searcher } = fakeSearcher(result('32-28', { rootScores: [{ move: '32-28', score: 0 }] }));
    const engine = new DraughtsEngine(searcher, { sleep: async () => controller.abort(), now: () => 0, rng: () => 0.5 });
    await expect(engine.bestMove(start, 'moyen', controller.signal)).rejects.toBeInstanceOf(EngineAbortError);
  });

  it('réessaie moins profond après un délai dépassé', async () => {
    const { searcher, requests } = fakeSearcher(new EngineTimeoutError(), result('32-28'));
    const engine = new DraughtsEngine(searcher, { sleep: async () => undefined });
    expect(await engine.bestMove(start, 'expert', signal())).toMatchObject({ from: '32', to: '28' });
    expect(requests[1].request).toMatchObject({ maxDepth: DRAUGHTS_LEVELS.expert.fallbackDepth, timeMs: null });
  });

  it('signale un moteur indisponible après deux délais dépassés', async () => {
    const { searcher } = fakeSearcher(new EngineTimeoutError());
    await expect(new DraughtsEngine(searcher).bestMove(start, 'expert', signal())).rejects.toBeInstanceOf(EngineUnavailableError);
  });

  it('transmet les autres erreurs et l’absence de coup', async () => {
    await expect(new DraughtsEngine(fakeSearcher(new Error('panne')).searcher).bestMove(start, 'expert', signal())).rejects.toThrow('panne');
    await expect(new DraughtsEngine(fakeSearcher(result(null)).searcher).bestMove(start, 'expert', signal())).rejects.toThrow("L'ordinateur n'a trouvé aucun coup.");
    await expect(new DraughtsEngine(fakeSearcher(result('11-15')).searcher).bestMove(start, 'expert', signal())).rejects.toThrow('Coup inconnu');
  });

  it('analyse une position pour l’aide', async () => {
    const engine = new DraughtsEngine(createInlineSearcher());
    const analysis = await engine.analyse(parseDraughts('W:W32,46:B28'), 4);
    expect(analysis.best).toMatchObject({ from: '32', to: '23', captures: ['28'] });
    await expect(engine.analyse(parseDraughts('B:W41,47:B36'), 4)).rejects.toThrow('Aucun coup à analyser');
  });

  it('traduit une victoire forcée en nombre de coups', () => {
    expect(evaluationOfScore(120)).toEqual({ scoreCp: 120 });
    expect(evaluationOfScore(WIN_SCORE - 1)).toEqual({ scoreCp: WIN_SCORE - 1, mateIn: 1 });
    expect(evaluationOfScore(-(WIN_SCORE - 4))).toEqual({ scoreCp: -(WIN_SCORE - 4), mateIn: -2 });
  });

  it('abandonne une recherche dans le fil courant si la partie est quittée', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(createInlineSearcher().search({ board: start.board, turn: 'white', maxDepth: 2, timeMs: null, rootScores: false }, 1000, controller.signal)).rejects.toBeInstanceOf(EngineAbortError);
  });
});
