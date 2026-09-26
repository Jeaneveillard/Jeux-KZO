import { EngineAbortError, EngineLoadError, EngineTimeoutError } from '../../core/engine-errors';
import type { SearchRequest, SearchResult } from './search';
import type { DraughtsSearcher } from './searcher';

/** Ce que le chercheur utilise d'un Web Worker (remplaçable dans les tests). */
export interface WorkerLike {
  postMessage(message: unknown): void;
  terminate(): void;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

interface Reply {
  readonly id: number;
  readonly result?: SearchResult;
  readonly error?: string;
}

/** Une recherche à la fois ; délai dépassé, annulation ou erreur : le worker est arrêté puis recréé à la demande suivante. */
export class WorkerSearcher implements DraughtsSearcher {
  private readonly createWorker: () => WorkerLike;
  private worker: WorkerLike | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private nextId = 1;

  constructor(createWorker: () => WorkerLike) {
    this.createWorker = createWorker;
  }

  search(request: SearchRequest, timeoutMs: number, signal?: AbortSignal): Promise<SearchResult> {
    const run = this.queue.then(() => this.run(request, timeoutMs, signal));
    // La file continue après un échec ; l'erreur est rendue à l'appelant via `run`.
    this.queue = run.catch(() => undefined);
    return run;
  }

  private stop(): void {
    this.worker?.terminate();
    this.worker = null;
  }

  private run(request: SearchRequest, timeoutMs: number, signal?: AbortSignal): Promise<SearchResult> {
    if (signal?.aborted) return Promise.reject(new EngineAbortError());
    let worker: WorkerLike;
    try {
      this.worker ??= this.createWorker();
      worker = this.worker;
    } catch (error) {
      return Promise.reject(new EngineLoadError(error));
    }
    const id = this.nextId;
    this.nextId += 1;
    return new Promise<SearchResult>((resolve, reject) => {
      const finish = (error: Error | null, result?: SearchResult) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        worker.onmessage = null;
        worker.onerror = null;
        if (error) {
          this.stop();
          reject(error);
        } else if (result) {
          resolve(result);
        }
      };
      const onAbort = () => finish(new EngineAbortError());
      const timer = setTimeout(() => finish(new EngineTimeoutError()), timeoutMs);
      signal?.addEventListener('abort', onAbort);
      worker.onmessage = (event: MessageEvent) => {
        const reply = event.data as Reply;
        if (reply.id !== id) return;
        if (reply.result) finish(null, reply.result);
        else finish(new Error(reply.error ?? 'Réponse vide du moteur de dames.'));
      };
      worker.onerror = (event: ErrorEvent) => finish(new EngineLoadError(event.message));
      worker.postMessage({ id, request });
    });
  }
}
