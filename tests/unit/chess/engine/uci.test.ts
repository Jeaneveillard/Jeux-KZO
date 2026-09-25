import { describe, expect, it } from 'vitest';
import { MATE_SCORE, evaluationOf, parseBestMove, parseInfo } from '../../../../src/chess/engine/uci';

describe('protocole UCI', () => {
  it('lit une ligne info avec score en centipions', () => {
    const info = parseInfo('info depth 12 seldepth 17 multipv 1 score cp -34 nodes 23297 nps 394864 hashfull 10 time 59 pv e7e5 g1f3 b8c6');
    expect(info).toEqual({ depth: 12, multipv: 1, scoreCp: -34, mate: undefined, pv: ['e7e5', 'g1f3', 'b8c6'] });
  });

  it('lit un score de mat et le numéro de variante', () => {
    expect(parseInfo('info depth 20 multipv 2 score mate -3 pv a2a3')).toMatchObject({ multipv: 2, mate: -3, pv: ['a2a3'] });
  });

  it('ignore les lignes sans variante', () => {
    expect(parseInfo('info depth 1 currmove e2e4 currmovenumber 1')).toBeNull();
    expect(parseInfo('info string NNUE evaluation using nn.nnue')).toBeNull();
    expect(parseInfo('readyok')).toBeNull();
  });

  it('lit le meilleur coup', () => {
    expect(parseBestMove('bestmove e2e4 ponder e7e5')).toEqual({ move: 'e2e4' });
    expect(parseBestMove('bestmove (none)')).toEqual({ move: null });
    expect(parseBestMove('info depth 1')).toBeNull();
  });

  it('convertit une ligne en évaluation', () => {
    expect(evaluationOf({ depth: 5, multipv: 1, scoreCp: 42, pv: ['e2e4'] })).toEqual({ scoreCp: 42 });
    expect(evaluationOf({ depth: 5, multipv: 1, mate: 2, pv: ['e2e4'] })).toEqual({ scoreCp: MATE_SCORE - 2, mateIn: 2 });
    expect(evaluationOf({ depth: 5, multipv: 1, mate: -1, pv: ['e2e4'] })).toEqual({ scoreCp: -(MATE_SCORE - 1), mateIn: -1 });
    expect(evaluationOf(undefined)).toEqual({ scoreCp: 0 });
  });
});
