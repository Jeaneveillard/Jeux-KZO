import { EngineAbortError, EngineLoadError, EngineTimeoutError } from '../../core/engine-errors';
import type { UciTransport } from './transport';
import { parseBestMove, parseInfo, type UciInfo } from './uci';

export type UciOptionValue = string | number | boolean;

export interface SearchRequest {
  readonly fen: string;
  readonly go: string;
  readonly options: Readonly<Record<string, UciOptionValue>>;
  readonly timeoutMs: number;
}

export interface SearchResult {
  readonly bestMove: string | null;
  /** Dernière ligne reçue pour chaque variante, triées par numéro (1 = la meilleure). */
  readonly lines: readonly UciInfo[];
}

interface Exchange {
  readonly command: string;
  readonly timeoutMs: number;
  readonly isDone: (line: string) => boolean;
  readonly onLine?: (line: string) => void;
  readonly timeoutError: () => Error;
}

export const DEFAULT_INIT_TIMEOUT_MS = 15_000;

/** Client UCI : une recherche à la fois, délai maximal, annulation, relance après panne. */
export class StockfishClient {
  private readonly createTransport: () => UciTransport;
  private readonly initTimeoutMs: number;
  private transport: UciTransport | null = null;
  private ready: Promise<UciTransport> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private lineListener: ((line: string) => void) | null = null;
  private errorListener: ((error: Error) => void) | null = null;

  constructor(createTransport: () => UciTransport, initTimeoutMs = DEFAULT_INIT_TIMEOUT_MS) {
    this.createTransport = createTransport;
    this.initTimeoutMs = initTimeoutMs;
  }

  search(request: SearchRequest, signal?: AbortSignal): Promise<SearchResult> {
    const run = this.queue.then(() => this.runSearch(request, signal));
    // La file continue après un échec ; l'erreur elle-même est rendue à l'appelant via `run`.
    this.queue = run.catch(() => undefined);
    return run;
  }

  /** Arrête le moteur ; il sera relancé à la prochaine recherche. */
  restart(): void {
    this.transport?.terminate();
    this.transport = null;
    this.ready = null;
    this.lineListener = null;
    this.errorListener = null;
  }

  private ensureReady(): Promise<UciTransport> {
    if (!this.ready) {
      this.ready = this.boot().catch((error: unknown) => {
        this.restart();
        throw error instanceof EngineLoadError ? error : new EngineLoadError(error);
      });
    }
    return this.ready;
  }

  private async boot(): Promise<UciTransport> {
    const transport = this.createTransport();
    this.transport = transport;
    transport.onLine((line) => this.lineListener?.(line));
    transport.onError((error) => this.errorListener?.(error));
    const loadTimeout = () => new EngineLoadError(new EngineTimeoutError());
    await this.exchange(transport, { command: 'uci', timeoutMs: this.initTimeoutMs, isDone: (l) => l === 'uciok', timeoutError: loadTimeout });
    await this.exchange(transport, { command: 'isready', timeoutMs: this.initTimeoutMs, isDone: (l) => l === 'readyok', timeoutError: loadTimeout });
    return transport;
  }

  private exchange(transport: UciTransport, exchange: Exchange): Promise<void> {
    return new Promise((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timer);
        this.lineListener = null;
        this.errorListener = null;
        if (error) reject(error);
        else resolve();
      };
      const timer = setTimeout(() => finish(exchange.timeoutError()), exchange.timeoutMs);
      this.lineListener = (line) => {
        exchange.onLine?.(line);
        if (exchange.isDone(line)) finish();
      };
      this.errorListener = (error) => finish(error);
      transport.send(exchange.command);
    });
  }

  private async runSearch(request: SearchRequest, signal?: AbortSignal): Promise<SearchResult> {
    if (signal?.aborted) throw new EngineAbortError();
    const transport = await this.ensureReady();
    for (const [name, value] of Object.entries(request.options)) {
      transport.send(`setoption name ${name} value ${String(value)}`);
    }
    transport.send(`position fen ${request.fen}`);
    const latest = new Map<number, UciInfo>();
    let bestMove: string | null = null;
    const stop = () => transport.send('stop');
    signal?.addEventListener('abort', stop);
    try {
      await this.exchange(transport, {
        command: request.go,
        timeoutMs: request.timeoutMs,
        timeoutError: () => new EngineTimeoutError(),
        onLine: (line) => {
          const info = parseInfo(line);
          if (info) latest.set(info.multipv, info);
        },
        isDone: (line) => {
          const best = parseBestMove(line);
          if (best) bestMove = best.move;
          return best !== null;
        },
      });
    } catch (error) {
      this.restart();
      throw error;
    } finally {
      signal?.removeEventListener('abort', stop);
    }
    if (signal?.aborted) throw new EngineAbortError();
    const lines = [...latest.entries()].sort(([a], [b]) => a - b).map(([, info]) => info);
    return { bestMove, lines };
  }
}
