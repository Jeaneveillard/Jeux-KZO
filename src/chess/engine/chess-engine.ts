import type { Engine, Evaluation, Level } from '../../core/types';
import { fromUci } from '../adapter';
import type { ChessMove, ChessPos } from '../types';
import { EngineAbortError, EngineTimeoutError, EngineUnavailableError } from './errors';
import { movesKeepingQueen, pickFaibleMove } from './faible';
import { ANALYSIS_OPTIONS, ANALYSIS_TIMEOUT_MS, LEVELS, type LevelConfig } from './levels';
import type { SearchRequest, SearchResult, StockfishClient } from './stockfish-client';
import { evaluationOf } from './uci';

export interface ChessEngineOptions {
  readonly rng?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly now?: () => number;
  readonly levels?: Readonly<Record<Level, LevelConfig>>;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class ChessEngine implements Engine<ChessPos, ChessMove> {
  private readonly client: StockfishClient;
  private readonly rng: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  private readonly levels: Readonly<Record<Level, LevelConfig>>;

  constructor(client: StockfishClient, options: ChessEngineOptions = {}) {
    this.client = client;
    this.rng = options.rng ?? Math.random;
    this.sleep = options.sleep ?? wait;
    this.now = options.now ?? Date.now;
    this.levels = options.levels ?? LEVELS;
  }

  async bestMove(pos: ChessPos, level: Level, signal: AbortSignal): Promise<ChessMove> {
    const config = this.levels[level];
    const started = this.now();
    const result = await this.searchWithRetry(
      { fen: pos.fen, go: config.go, options: config.options, timeoutMs: config.timeoutMs },
      config.fallbackGo,
      signal,
    );
    const uci = level === 'faible' ? (pickFaibleMove(result.lines, movesKeepingQueen(pos), this.rng) ?? result.bestMove) : result.bestMove;
    if (!uci) throw new Error("L'ordinateur n'a trouvé aucun coup.");
    const remaining = config.minDelayMs - (this.now() - started);
    if (remaining > 0) await this.sleep(remaining);
    if (signal.aborted) throw new EngineAbortError();
    return fromUci(uci);
  }

  async analyse(pos: ChessPos, depth: number): Promise<{ readonly best: ChessMove } & Evaluation> {
    const result = await this.searchWithRetry(
      { fen: pos.fen, go: `go depth ${depth}`, options: ANALYSIS_OPTIONS, timeoutMs: ANALYSIS_TIMEOUT_MS },
      `go depth ${Math.max(1, Math.floor(depth / 2))}`,
    );
    if (!result.bestMove) throw new Error('Aucun coup à analyser : la partie est terminée.');
    return { best: fromUci(result.bestMove), ...evaluationOf(result.lines[0]) };
  }

  private async searchWithRetry(request: SearchRequest, fallbackGo: string, signal?: AbortSignal): Promise<SearchResult> {
    try {
      return await this.client.search(request, signal);
    } catch (error) {
      if (!(error instanceof EngineTimeoutError)) throw error;
    }
    try {
      return await this.client.search({ ...request, go: fallbackGo }, signal);
    } catch (error) {
      throw error instanceof EngineTimeoutError ? new EngineUnavailableError() : error;
    }
  }
}
