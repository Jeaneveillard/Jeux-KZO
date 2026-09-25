import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  EngineAbortError, EngineLoadError, EngineTimeoutError, engineErrorMessage, isAbortError,
} from '../../../../src/chess/engine/errors';
import { StockfishClient, type SearchRequest } from '../../../../src/chess/engine/stockfish-client';
import { FakeTransport, standardResponder } from './fake-transport';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const request = (go: string, extra: Partial<SearchRequest> = {}): SearchRequest => ({
  fen: START, go, options: {}, timeoutMs: 1000, ...extra,
});

afterEach(() => {
  vi.useRealTimers();
});

describe('StockfishClient', () => {
  it('démarre le moteur puis renvoie le meilleur coup et les variantes triées', async () => {
    const fake = new FakeTransport(standardResponder(() => [
      'info depth 5 multipv 2 score cp 10 pv d2d4 d7d5',
      'info depth 5 multipv 1 score cp 30 pv e2e4 e7e5',
      'bestmove e2e4 ponder e7e5',
    ]));
    const client = new StockfishClient(() => fake);
    const result = await client.search(request('go depth 5', { options: { MultiPV: 2, UCI_LimitStrength: false } }));
    expect(result.bestMove).toBe('e2e4');
    expect(result.lines.map((line) => line.pv[0])).toEqual(['e2e4', 'd2d4']);
    expect(fake.sent).toEqual([
      'uci', 'isready',
      'setoption name MultiPV value 2', 'setoption name UCI_LimitStrength value false',
      `position fen ${START}`, 'go depth 5',
    ]);
  });

  it('ne démarre le moteur qu’une seule fois', async () => {
    const factory = vi.fn(() => new FakeTransport(standardResponder(() => ['bestmove e2e4'])));
    const client = new StockfishClient(factory);
    await client.search(request('go depth 1'));
    await client.search(request('go depth 1'));
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('traite les recherches une par une', async () => {
    const fake = new FakeTransport(standardResponder((go) => [go === 'go depth 1' ? 'bestmove a2a3' : 'bestmove h2h3']));
    const client = new StockfishClient(() => fake);
    const results = await Promise.all([client.search(request('go depth 1')), client.search(request('go depth 2'))]);
    expect(results.map((r) => r.bestMove)).toEqual(['a2a3', 'h2h3']);
  });

  it('abandonne une recherche trop longue et relance le moteur ensuite', async () => {
    vi.useFakeTimers();
    let silent = true;
    const transports: FakeTransport[] = [];
    const client = new StockfishClient(() => {
      const fake = new FakeTransport(standardResponder(() => (silent ? [] : ['bestmove e2e4'])));
      transports.push(fake);
      return fake;
    });
    const pending = expect(client.search(request('go movetime 3000'))).rejects.toBeInstanceOf(EngineTimeoutError);
    await vi.advanceTimersByTimeAsync(1000);
    await pending;
    expect(transports[0].terminated).toBe(true);
    silent = false;
    expect((await client.search(request('go depth 1'))).bestMove).toBe('e2e4');
    expect(transports).toHaveLength(2);
  });

  it('signale un moteur qui ne démarre pas, puis réessaie', async () => {
    vi.useFakeTimers();
    let broken = true;
    const client = new StockfishClient(
      () => new FakeTransport(broken ? () => [] : standardResponder(() => ['bestmove e2e4'])),
      500,
    );
    const pending = expect(client.search(request('go depth 1'))).rejects.toBeInstanceOf(EngineLoadError);
    await vi.advanceTimersByTimeAsync(500);
    await pending;
    broken = false;
    expect((await client.search(request('go depth 1'))).bestMove).toBe('e2e4');
  });

  it('transforme une erreur du worker au démarrage en EngineLoadError', async () => {
    const client = new StockfishClient(() => {
      throw new Error('Worker indisponible');
    });
    await expect(client.search(request('go depth 1'))).rejects.toBeInstanceOf(EngineLoadError);
  });

  it('rejette une erreur du worker pendant une recherche', async () => {
    const fake = new FakeTransport(standardResponder(() => []));
    const client = new StockfishClient(() => fake);
    const pending = client.search(request('go depth 1'));
    await vi.waitFor(() => expect(fake.sent).toContain('go depth 1'));
    fake.emitError(new Error('plantage'));
    await expect(pending).rejects.toThrow('plantage');
    expect(fake.terminated).toBe(true);
  });

  it('annule une recherche en cours avec « stop »', async () => {
    const fake = new FakeTransport((command) => {
      if (command === 'uci') return ['uciok'];
      if (command === 'isready') return ['readyok'];
      if (command === 'stop') return ['bestmove e2e4'];
      return [];
    });
    const client = new StockfishClient(() => fake);
    const controller = new AbortController();
    const pending = client.search(request('go movetime 3000'), controller.signal);
    await vi.waitFor(() => expect(fake.sent).toContain('go movetime 3000'));
    controller.abort();
    await expect(pending).rejects.toBeInstanceOf(EngineAbortError);
    expect(fake.sent).toContain('stop');
  });

  it('refuse une recherche déjà annulée sans rien envoyer', async () => {
    const fake = new FakeTransport(standardResponder(() => ['bestmove e2e4']));
    const client = new StockfishClient(() => fake);
    const controller = new AbortController();
    controller.abort();
    await expect(client.search(request('go depth 1'), controller.signal)).rejects.toBeInstanceOf(EngineAbortError);
    expect(fake.sent).toEqual([]);
  });

  it('fournit des messages d’erreur lisibles', () => {
    expect(engineErrorMessage(new EngineLoadError())).toBe("L'ordinateur n'a pas pu démarrer.");
    expect(engineErrorMessage('bizarre')).toBe("L'ordinateur a rencontré un problème.");
    expect(isAbortError(new EngineAbortError())).toBe(true);
    expect(isAbortError(new Error('x'))).toBe(false);
  });
});
