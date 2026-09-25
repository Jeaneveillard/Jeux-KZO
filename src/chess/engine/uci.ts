import type { Evaluation } from '../../core/types';

export interface UciInfo {
  readonly depth: number;
  readonly multipv: number;
  readonly scoreCp?: number;
  readonly mate?: number;
  readonly pv: readonly string[];
}

export const MATE_SCORE = 100_000;

/** Lit une ligne « info … pv … » ; renvoie null si elle ne contient pas de variante. */
export function parseInfo(line: string): UciInfo | null {
  if (!line.startsWith('info ')) return null;
  const tokens = line.split(/\s+/);
  let depth = 0;
  let multipv = 1;
  let scoreCp: number | undefined;
  let mate: number | undefined;
  let pv: string[] = [];
  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === 'depth') {
      depth = Number(tokens[i + 1]);
      i += 1;
    } else if (token === 'multipv') {
      multipv = Number(tokens[i + 1]);
      i += 1;
    } else if (token === 'score') {
      const value = Number(tokens[i + 2]);
      if (tokens[i + 1] === 'cp') scoreCp = value;
      if (tokens[i + 1] === 'mate') mate = value;
      i += 2;
    } else if (token === 'pv') {
      pv = tokens.slice(i + 1);
      break;
    }
  }
  if (depth === 0 || pv.length === 0) return null;
  return { depth, multipv, scoreCp, mate, pv };
}

export function parseBestMove(line: string): { readonly move: string | null } | null {
  if (!line.startsWith('bestmove')) return null;
  const move = line.split(/\s+/)[1];
  return { move: !move || move === '(none)' ? null : move };
}

export function evaluationOf(info: UciInfo | undefined): Evaluation {
  if (!info) return { scoreCp: 0 };
  if (info.mate !== undefined) {
    return { scoreCp: Math.sign(info.mate) * (MATE_SCORE - Math.abs(info.mate)), mateIn: info.mate };
  }
  return { scoreCp: info.scoreCp ?? 0 };
}
