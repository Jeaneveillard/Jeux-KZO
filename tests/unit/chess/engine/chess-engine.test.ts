import { describe, expect, it, vi } from 'vitest';
import { chessAdapter } from '../../../../src/chess/adapter';
import { ChessEngine } from '../../../../src/chess/engine/chess-engine';
import { EngineAbortError, EngineUnavailableError } from '../../../../src/core/engine-errors';
import { LEVELS } from '../../../../src/chess/engine/levels';
import { StockfishClient } from '../../../../src/chess/engine/stockfish-client';
import { FakeTransport, standardResponder, type Responder } from './fake-transport';

const start = chessAdapter.initial();
const noSleep = async () => undefined;

function setup(respond: Responder, extra: ConstructorParameters<typeof ChessEngine>[1] = {}) {
  const transports: FakeTransport[] = [];
  const client = new StockfishClient(() => {
    const fake = new FakeTransport(respond);
    transports.push(fake);
    return fake;
  });
  const engine = new ChessEngine(client, { sleep: noSleep, ...extra });
  return { engine, transports };
}

const signal = () => new AbortController().signal;

describe('ChessEngine', () => {
  it('Expert joue le meilleur coup de Stockfish à pleine puissance', async () => {
    const { engine, transports } = setup(standardResponder(() => ['bestmove g1f3']));
    expect(await engine.bestMove(start, 'expert', signal())).toEqual({ from: 'g1', to: 'f3' });
    expect(transports[0].sent).toContain('go movetime 3000');
    expect(transports[0].sent).toContain('setoption name UCI_LimitStrength value false');
  });

  it('Moyen limite la force à 1600 Elo', async () => {
    const { engine, transports } = setup(standardResponder(() => ['bestmove e2e4']));
    await engine.bestMove(start, 'moyen', signal());
    expect(transports[0].sent).toEqual(expect.arrayContaining([
      'setoption name UCI_LimitStrength value true', 'setoption name UCI_Elo value 1600', 'go movetime 1000',
    ]));
  });

  it('Faible choisit parmi les 4 variantes', async () => {
    const { engine } = setup(
      standardResponder(() => [
        'info depth 5 multipv 1 score cp 30 pv e2e4',
        'info depth 5 multipv 2 score cp 20 pv d2d4',
        'info depth 5 multipv 3 score cp 10 pv g1f3',
        'info depth 5 multipv 4 score cp 0 pv c2c4',
        'bestmove e2e4',
      ]),
      { rng: vi.fn().mockReturnValueOnce(0.8).mockReturnValueOnce(0.99) },
    );
    expect(await engine.bestMove(start, 'faible', signal())).toEqual({ from: 'c2', to: 'c4' });
  });

  it('attend le délai minimal pour garder un rythme naturel', async () => {
    const sleep = vi.fn(async () => undefined);
    const { engine } = setup(standardResponder(() => ['bestmove e2e4']), { sleep, now: () => 1000 });
    await engine.bestMove(start, 'moyen', signal());
    expect(sleep).toHaveBeenCalledWith(600);
  });

  it('refuse de rendre un coup si la partie a été quittée pendant l’attente', async () => {
    const controller = new AbortController();
    const sleep = vi.fn(async () => controller.abort());
    const { engine } = setup(standardResponder(() => ['bestmove e2e4']), { sleep, now: () => 0 });
    await expect(engine.bestMove(start, 'moyen', controller.signal)).rejects.toBeInstanceOf(EngineAbortError);
  });

  it('réessaie à profondeur réduite après un délai dépassé', async () => {
    const levels = { ...LEVELS, expert: { ...LEVELS.expert, timeoutMs: 50 } };
    const { engine, transports } = setup(standardResponder((go) => (go.startsWith('go movetime') ? [] : ['bestmove d2d4'])), { levels });
    expect(await engine.bestMove(start, 'expert', signal())).toEqual({ from: 'd2', to: 'd4' });
    expect(transports).toHaveLength(2);
    expect(transports[1].sent).toContain(LEVELS.expert.fallbackGo);
  });

  it('signale un moteur indisponible après deux échecs', async () => {
    const levels = { ...LEVELS, expert: { ...LEVELS.expert, timeoutMs: 20 } };
    const { engine } = setup(standardResponder(() => []), { levels });
    await expect(engine.bestMove(start, 'expert', signal())).rejects.toBeInstanceOf(EngineUnavailableError);
  });

  it('signale l’absence de coup', async () => {
    const { engine } = setup(standardResponder(() => ['bestmove (none)']));
    await expect(engine.bestMove(start, 'expert', signal())).rejects.toThrow("L'ordinateur n'a trouvé aucun coup.");
  });

  it('analyse une position pour l’aide', async () => {
    const { engine, transports } = setup(standardResponder(() => ['info depth 12 multipv 1 score cp 55 pv e2e4 e7e5', 'bestmove e2e4']));
    expect(await engine.analyse(start, 12)).toEqual({ best: { from: 'e2', to: 'e4' }, scoreCp: 55 });
    expect(transports[0].sent).toContain('go depth 12');
    expect(transports[0].sent).toContain('setoption name MultiPV value 1');
  });

  it('refuse d’analyser une position terminée', async () => {
    const { engine } = setup(standardResponder(() => ['bestmove (none)']));
    await expect(engine.analyse(start, 10)).rejects.toThrow('Aucun coup à analyser');
  });
});
