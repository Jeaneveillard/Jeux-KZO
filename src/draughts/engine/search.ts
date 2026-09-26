import type { Color } from '../../core/types';
import { destination, generateMoves, promotes, rawMoveId, toCells, type Cells, type RawMove, type Side } from '../movegen';
import { evaluate } from './evaluate';

export const WIN_SCORE = 100_000;
/** Au-delà, la note annonce une victoire (ou une défaite) forcée. */
export const WIN_THRESHOLD = WIN_SCORE - 1_000;

const INFINITY = 1_000_000;
const MAX_PLY = 96;
const TIME_CHECK_MASK = 1023;
const TT_LIMIT = 400_000;
const HASH_SPLIT = 67_108_864; // 2^26

export interface SearchRequest {
  readonly board: string;
  readonly turn: Color;
  readonly maxDepth: number;
  /** Temps de réflexion maximal en millisecondes ; null = seulement la profondeur. */
  readonly timeMs: number | null;
  /** Calculer une note exacte pour chaque coup (choix bruité des niveaux Faible et Moyen). */
  readonly rootScores: boolean;
}

export interface RootScore {
  readonly move: string;
  readonly score: number;
}

export interface SearchResult {
  readonly best: string | null;
  /** Note du point de vue du camp au trait (pion = 100). */
  readonly score: number;
  readonly depth: number;
  readonly rootScores: readonly RootScore[];
}

type Bound = 'exact' | 'lower' | 'upper';

interface TableEntry {
  readonly depth: number;
  readonly score: number;
  readonly bound: Bound;
  readonly best: string | null;
}

interface Undo {
  readonly piece: number;
  readonly captured: readonly number[];
}

interface Clock {
  readonly now: () => number;
  /** Au-delà : la recherche en cours s'arrête. */
  readonly deadline: number | null;
  /** Au-delà : on ne commence pas une nouvelle profondeur. */
  readonly softDeadline: number | null;
}

class TimeUp extends Error {}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(20260924);
const randomKey = () => Math.floor(random() * HASH_SPLIT);
/** Clés de Zobrist : index = case × 4 + type de pièce. */
const KEYS_HI = Array.from({ length: 51 * 4 }, randomKey);
const KEYS_LO = Array.from({ length: 51 * 4 }, randomKey);
const SIDE_HI = randomKey();
const SIDE_LO = randomKey();

function pieceIndex(piece: number): number {
  return piece > 0 ? piece - 1 : 1 - piece;
}

/** Les notes de victoire dépendent de la distance : on les stocke relativement au nœud. */
function toTable(score: number, ply: number): number {
  if (score >= WIN_THRESHOLD) return score + ply;
  if (score <= -WIN_THRESHOLD) return score - ply;
  return score;
}

function fromTable(score: number, ply: number): number {
  if (score >= WIN_THRESHOLD) return score - ply;
  if (score <= -WIN_THRESHOLD) return score + ply;
  return score;
}

class Search {
  private readonly cells: Cells;
  private side: Side;
  private readonly clock: Clock;
  private readonly table = new Map<number, TableEntry>();
  private readonly history = new Map<string, number>();
  private readonly killers: string[][] = [];
  private hashHi = 0;
  private hashLo = 0;
  private nodes = 0;
  private canStop = false;

  constructor(cells: Cells, side: Side, clock: Clock) {
    this.cells = cells;
    this.side = side;
    this.clock = clock;
    for (let square = 1; square <= 50; square += 1) {
      if (cells[square] !== 0) this.toggle(square, cells[square]);
    }
    if (side === -1) this.toggleSide();
  }

  run(maxDepth: number, exact: boolean): SearchResult {
    const moves = generateMoves(this.cells, this.side);
    if (moves.length === 0) return { best: null, score: -WIN_SCORE, depth: 0, rootScores: [] };
    const depthLimit = moves.length === 1 && !exact ? Math.min(maxDepth, 2) : maxDepth;
    let best: { readonly move: RawMove; readonly score: number } | null = null;
    let scores: RootScore[] = [];
    let completed = 0;
    for (let depth = 1; depth <= depthLimit; depth += 1) {
      this.canStop = best !== null;
      try {
        const result = this.searchRoot(moves, depth, exact);
        best = result.best;
        scores = result.scores;
        completed = depth;
      } catch (error) {
        if (error instanceof TimeUp) break;
        throw error;
      }
      if (best && (Math.abs(best.score) >= WIN_THRESHOLD || this.pastSoftDeadline())) break;
    }
    if (!best) throw new Error('Recherche interrompue avant la première profondeur.');
    return { best: rawMoveId(best.move), score: best.score, depth: completed, rootScores: scores };
  }

  private searchRoot(moves: readonly RawMove[], depth: number, exact: boolean) {
    const ordered = this.order(moves, this.table.get(this.key())?.best ?? null, 0);
    let alpha = -INFINITY;
    let best = { move: ordered[0], score: -INFINITY };
    const scores: RootScore[] = [];
    for (let index = 0; index < ordered.length; index += 1) {
      const move = ordered[index];
      const undo = this.make(move);
      let score: number;
      if (exact || index === 0) {
        score = -this.negamax(depth - 1, -INFINITY, exact ? INFINITY : -alpha, 1);
      } else {
        score = -this.negamax(depth - 1, -alpha - 1, -alpha, 1);
        if (score > alpha) score = -this.negamax(depth - 1, -INFINITY, -alpha, 1);
      }
      this.unmake(move, undo);
      if (exact) scores.push({ move: rawMoveId(move), score });
      if (score > best.score) best = { move, score };
      if (!exact && score > alpha) alpha = score;
    }
    this.store(0, depth, best.score, 'exact', rawMoveId(best.move));
    return { best, scores };
  }

  private negamax(depth: number, alpha: number, beta: number, ply: number): number {
    this.nodes += 1;
    if (this.canStop && (this.nodes & TIME_CHECK_MASK) === 0 && this.pastDeadline()) throw new TimeUp();
    const moves = generateMoves(this.cells, this.side);
    if (moves.length === 0) return -(WIN_SCORE - ply);
    const forced = moves[0].captures.length > 0;
    if ((depth <= 0 && !forced) || ply >= MAX_PLY) return evaluate(this.cells, this.side);
    const nodeDepth = Math.max(depth, 0);
    const entry = this.table.get(this.key());
    if (entry && entry.depth >= nodeDepth) {
      const stored = fromTable(entry.score, ply);
      if (entry.bound === 'exact' || (entry.bound === 'lower' && stored >= beta) || (entry.bound === 'upper' && stored <= alpha)) {
        return stored;
      }
    }
    const alphaStart = alpha;
    let bestScore = -INFINITY;
    let bestId: string | null = null;
    const ordered = this.order(moves, entry?.best ?? null, ply);
    for (let index = 0; index < ordered.length; index += 1) {
      const move = ordered[index];
      const id = rawMoveId(move);
      const undo = this.make(move);
      let score: number;
      if (index === 0) {
        score = -this.negamax(depth - 1, -beta, -alpha, ply + 1);
      } else {
        const reduction = index >= 3 && depth >= 3 && !forced && !this.isKiller(id, ply) ? 1 : 0;
        score = -this.negamax(depth - 1 - reduction, -alpha - 1, -alpha, ply + 1);
        if (score > alpha && (reduction > 0 || score < beta)) score = -this.negamax(depth - 1, -beta, -alpha, ply + 1);
      }
      this.unmake(move, undo);
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
      if (score > alpha) alpha = score;
      if (alpha >= beta) {
        if (!forced) this.rememberCutoff(id, depth, ply);
        break;
      }
    }
    const bound: Bound = bestScore <= alphaStart ? 'upper' : bestScore >= beta ? 'lower' : 'exact';
    this.store(ply, nodeDepth, bestScore, bound, bestId);
    return bestScore;
  }

  private order(moves: readonly RawMove[], tableBest: string | null, ply: number): RawMove[] {
    const killers = this.killers[ply] ?? [];
    return moves
      .map((move) => {
        const id = rawMoveId(move);
        let score = this.history.get(id) ?? 0;
        if (id === tableBest) score += 1e9;
        else if (killers.includes(id)) score += 1e6;
        if (promotes(this.cells[move.from], destination(move))) score += 1e5;
        return { move, score };
      })
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.move);
  }

  private rememberCutoff(id: string, depth: number, ply: number): void {
    const killers = this.killers[ply] ?? [];
    if (!killers.includes(id)) this.killers[ply] = [id, ...killers].slice(0, 2);
    this.history.set(id, (this.history.get(id) ?? 0) + depth * depth);
  }

  private isKiller(id: string, ply: number): boolean {
    return (this.killers[ply] ?? []).includes(id);
  }

  private store(ply: number, depth: number, score: number, bound: Bound, best: string | null): void {
    if (this.table.size >= TT_LIMIT) this.table.clear();
    this.table.set(this.key(), { depth, score: toTable(score, ply), bound, best });
  }

  private make(move: RawMove): Undo {
    const piece = this.cells[move.from];
    const captured = move.captures.map((square) => this.cells[square]);
    this.toggle(move.from, piece);
    this.cells[move.from] = 0;
    move.captures.forEach((square, index) => {
      this.toggle(square, captured[index]);
      this.cells[square] = 0;
    });
    const to = destination(move);
    const placed = promotes(piece, to) ? piece * 2 : piece;
    this.cells[to] = placed;
    this.toggle(to, placed);
    this.side = this.side === 1 ? -1 : 1;
    this.toggleSide();
    return { piece, captured };
  }

  private unmake(move: RawMove, undo: Undo): void {
    this.side = this.side === 1 ? -1 : 1;
    this.toggleSide();
    const to = destination(move);
    this.toggle(to, this.cells[to]);
    this.cells[to] = 0;
    move.captures.forEach((square, index) => {
      this.cells[square] = undo.captured[index];
      this.toggle(square, undo.captured[index]);
    });
    this.cells[move.from] = undo.piece;
    this.toggle(move.from, undo.piece);
  }

  private toggle(square: number, piece: number): void {
    const index = square * 4 + pieceIndex(piece);
    this.hashHi ^= KEYS_HI[index];
    this.hashLo ^= KEYS_LO[index];
  }

  private toggleSide(): void {
    this.hashHi ^= SIDE_HI;
    this.hashLo ^= SIDE_LO;
  }

  private key(): number {
    return this.hashHi * HASH_SPLIT + this.hashLo;
  }

  private pastDeadline(): boolean {
    return this.clock.deadline !== null && this.clock.now() >= this.clock.deadline;
  }

  private pastSoftDeadline(): boolean {
    return this.clock.softDeadline !== null && this.clock.now() >= this.clock.softDeadline;
  }
}

/** Cherche le meilleur coup du camp au trait. */
export function runSearch(request: SearchRequest, now: () => number = Date.now): SearchResult {
  const start = now();
  const clock: Clock = {
    now,
    deadline: request.timeMs === null ? null : start + request.timeMs,
    softDeadline: request.timeMs === null ? null : start + request.timeMs / 2,
  };
  const search = new Search(toCells(request.board), request.turn === 'white' ? 1 : -1, clock);
  return search.run(request.maxDepth, request.rootScores);
}
