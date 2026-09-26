import { EngineAbortError, EngineTimeoutError, EngineUnavailableError } from '../../core/engine-errors';
import type { Engine, Evaluation, Level } from '../../core/types';
import { draughtsMoveId, legalMoves } from '../rules';
import type { DraughtsMove, DraughtsPos } from '../types';
import { DRAUGHTS_ANALYSIS_TIMEOUT_MS, DRAUGHTS_LEVELS, type DraughtsLevelConfig } from './levels';
import { pickDraughtsMove } from './pick';
import { WIN_SCORE, WIN_THRESHOLD, type SearchRequest, type SearchResult } from './search';
import type { DraughtsSearcher } from './searcher';

export interface DraughtsEngineOptions {
  readonly rng?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly now?: () => number;
  readonly levels?: Readonly<Record<Level, DraughtsLevelConfig>>;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Note de recherche → évaluation commune ; une victoire forcée devient `mateIn` (en coups du camp au trait). */
export function evaluationOfScore(score: number): Evaluation {
  if (Math.abs(score) < WIN_THRESHOLD) return { scoreCp: score };
  return { scoreCp: score, mateIn: Math.sign(score) * Math.ceil((WIN_SCORE - Math.abs(score)) / 2) };
}

function resolveMove(pos: DraughtsPos, id: string): DraughtsMove {
  const move = legalMoves(pos).find((candidate) => draughtsMoveId(candidate) === id);
  if (!move) throw new Error(`Coup inconnu du moteur de dames : ${id}`);
  return move;
}

export class DraughtsEngine implements Engine<DraughtsPos, DraughtsMove> {
  private readonly searcher: DraughtsSearcher;
  private readonly rng: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  private readonly levels: Readonly<Record<Level, DraughtsLevelConfig>>;

  constructor(searcher: DraughtsSearcher, options: DraughtsEngineOptions = {}) {
    this.searcher = searcher;
    this.rng = options.rng ?? Math.random;
    this.sleep = options.sleep ?? wait;
    this.now = options.now ?? Date.now;
    this.levels = options.levels ?? DRAUGHTS_LEVELS;
  }

  async bestMove(pos: DraughtsPos, level: Level, signal: AbortSignal): Promise<DraughtsMove> {
    const config = this.levels[level];
    const started = this.now();
    const request: SearchRequest = {
      board: pos.board,
      turn: pos.turn,
      maxDepth: config.maxDepth,
      timeMs: config.timeMs,
      rootScores: config.noise > 0 || config.randomRate > 0,
    };
    const result = await this.searchWithRetry(request, config.timeoutMs, config.fallbackDepth, signal);
    const id = pickDraughtsMove(result.best, result.rootScores, config, this.rng);
    if (!id) throw new Error("L'ordinateur n'a trouvé aucun coup.");
    const remaining = config.minDelayMs - (this.now() - started);
    if (remaining > 0) await this.sleep(remaining);
    if (signal.aborted) throw new EngineAbortError();
    return resolveMove(pos, id);
  }

  async analyse(pos: DraughtsPos, depth: number): Promise<{ readonly best: DraughtsMove } & Evaluation> {
    const request: SearchRequest = { board: pos.board, turn: pos.turn, maxDepth: depth, timeMs: null, rootScores: false };
    const result = await this.searchWithRetry(request, DRAUGHTS_ANALYSIS_TIMEOUT_MS, Math.max(1, Math.floor(depth / 2)));
    if (!result.best) throw new Error('Aucun coup à analyser : la partie est terminée.');
    return { best: resolveMove(pos, result.best), ...evaluationOfScore(result.score) };
  }

  private async searchWithRetry(request: SearchRequest, timeoutMs: number, fallbackDepth: number, signal?: AbortSignal): Promise<SearchResult> {
    try {
      return await this.searcher.search(request, timeoutMs, signal);
    } catch (error) {
      if (!(error instanceof EngineTimeoutError)) throw error;
    }
    try {
      return await this.searcher.search({ ...request, maxDepth: fallbackDepth, timeMs: null }, timeoutMs, signal);
    } catch (error) {
      throw error instanceof EngineTimeoutError ? new EngineUnavailableError() : error;
    }
  }
}
