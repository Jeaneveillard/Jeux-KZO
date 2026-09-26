import { describe, expect, it } from 'vitest';
import { EngineAbortError, EngineLoadError, EngineTimeoutError } from '../../../../src/core/engine-errors';
import type { SearchRequest } from '../../../../src/draughts/engine/search';
import { WorkerSearcher, type WorkerLike } from '../../../../src/draughts/engine/worker-searcher';

interface Message {
  readonly id: number;
  readonly request: SearchRequest;
}

class FakeWorker implements WorkerLike {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;
  readonly received: Message[] = [];
  private readonly reply: (message: Message) => object | null;

  constructor(reply: (message: Message) => object | null) {
    this.reply = reply;
  }

  postMessage(message: unknown): void {
    const typed = message as Message;
    this.received.push(typed);
    const answer = this.reply(typed);
    if (answer) setTimeout(() => this.onmessage?.({ data: answer } as MessageEvent), 0);
  }

  terminate(): void {
    this.terminated = true;
  }
}

const request: SearchRequest = { board: '.'.repeat(50), turn: 'white', maxDepth: 2, timeMs: null, rootScores: false };
const answer = (message: Message) => ({ id: message.id, result: { best: '32-28', score: 0, depth: 2, rootScores: [] } });

function setup(reply: (message: Message) => object | null) {
  const workers: FakeWorker[] = [];
  const searcher = new WorkerSearcher(() => {
    const worker = new FakeWorker(reply);
    workers.push(worker);
    return worker;
  });
  return { searcher, workers };
}

describe('WorkerSearcher', () => {
  it('confie la recherche au worker et rend sa réponse', async () => {
    const { searcher, workers } = setup(answer);
    await expect(searcher.search(request, 1000)).resolves.toMatchObject({ best: '32-28' });
    await expect(searcher.search(request, 1000)).resolves.toMatchObject({ best: '32-28' });
    expect(workers).toHaveLength(1);
    expect(workers[0].received.map((message) => message.id)).toEqual([1, 2]);
  });

  it('arrête le worker après un délai dépassé puis en crée un autre', async () => {
    let calls = 0;
    const { searcher, workers } = setup((message) => (calls++ === 0 ? null : answer(message)));
    await expect(searcher.search(request, 20)).rejects.toBeInstanceOf(EngineTimeoutError);
    expect(workers[0].terminated).toBe(true);
    await expect(searcher.search(request, 1000)).resolves.toMatchObject({ best: '32-28' });
    expect(workers).toHaveLength(2);
  });

  it('arrête le worker quand la partie est quittée', async () => {
    const { searcher, workers } = setup(() => null);
    const controller = new AbortController();
    const pending = searcher.search(request, 1000, controller.signal);
    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();
    await expect(pending).rejects.toBeInstanceOf(EngineAbortError);
    expect(workers[0].terminated).toBe(true);
    const aborted = new AbortController();
    aborted.abort();
    await expect(searcher.search(request, 1000, aborted.signal)).rejects.toBeInstanceOf(EngineAbortError);
  });

  it('signale une erreur du worker', async () => {
    const { searcher } = setup((message) => ({ id: message.id, error: 'plantage' }));
    await expect(searcher.search(request, 1000)).rejects.toThrow('plantage');
    const broken = new WorkerSearcher(() => {
      throw new Error('pas de worker');
    });
    await expect(broken.search(request, 1000)).rejects.toBeInstanceOf(EngineLoadError);
  });

  it('ignore une réponse destinée à une autre recherche', async () => {
    const { searcher } = setup((message) => ({ ...answer(message), id: message.id + 100 }));
    await expect(searcher.search(request, 30)).rejects.toBeInstanceOf(EngineTimeoutError);
  });
});
