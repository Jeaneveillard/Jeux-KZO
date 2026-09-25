import type { Color, GameStatus } from '../core/types';
import type { Exercise, LessonRules } from './types';

export type RunStatus = 'playing' | 'waiting-opponent' | 'success' | 'failed';

export interface Feedback {
  readonly tone: 'success' | 'error' | 'info';
  readonly text: string;
}

export interface ExerciseRun<Pos> {
  readonly exercise: Exercise;
  readonly start: Pos;
  readonly pos: Pos;
  readonly player: Color;
  readonly remainingStars: readonly string[];
  readonly status: RunStatus;
  readonly feedback: Feedback | null;
}

export const SUCCESS_TEXT = 'Bravo, exercice réussi !';
const SUCCESS: Feedback = { tone: 'success', text: SUCCESS_TEXT };
const WRONG_MOVE_TEXT = "Ce n'est pas le bon coup. Réessaie !";
const NOT_MATE_TEXT = "Ce coup ne fait pas échec et mat. Cherche un coup où le roi adverse est attaqué et ne peut plus s'échapper.";

export function starsOf(exercise: Exercise): readonly string[] {
  if (exercise.kind === 'collect') return exercise.stars;
  if (exercise.kind === 'reach') return [exercise.target];
  return [];
}

export function startExercise<Pos, Move>(rules: LessonRules<Pos, Move>, exercise: Exercise): ExerciseRun<Pos> {
  const pos = rules.parse(exercise.position);
  return { exercise, start: pos, pos, player: rules.turn(pos), remainingStars: starsOf(exercise), status: 'playing', feedback: null };
}

function failureText(status: GameStatus): string {
  if (status.kind === 'draw' && status.reason === 'stalemate') {
    return "Pat ! Le roi adverse n'est pas en échec mais ne peut plus bouger : c'est nulle. Réessaie en lui laissant une case.";
  }
  if (status.kind === 'draw') return "Partie nulle : l'objectif n'est pas atteint. Réessaie !";
  return "L'ordinateur a gagné cette fois. Réessaie !";
}

/** Après un coup d'une fin de partie : réussite, échec, ou on continue avec `next`. */
function settle<Pos, Move>(rules: LessonRules<Pos, Move>, run: ExerciseRun<Pos>, next: RunStatus): ExerciseRun<Pos> {
  const status = rules.status(run.pos);
  if (status.kind === 'ongoing') return { ...run, status: next, feedback: null };
  if (status.kind === 'win' && status.winner === run.player) return { ...run, status: 'success', feedback: SUCCESS };
  return { ...run, status: 'failed', feedback: { tone: 'error', text: failureText(status) } };
}

function collectStep<Pos, Move>(rules: LessonRules<Pos, Move>, run: ExerciseRun<Pos>, move: Move): ExerciseRun<Pos> {
  const pos = rules.keepTurn(rules.play(run.pos, move), run.player);
  const remainingStars = run.remainingStars.filter((star) => star !== rules.destination(move));
  const done = remainingStars.length === 0;
  return { ...run, pos, remainingStars, status: done ? 'success' : 'playing', feedback: done ? SUCCESS : null };
}

export function playPlayerMove<Pos, Move>(rules: LessonRules<Pos, Move>, run: ExerciseRun<Pos>, move: Move): ExerciseRun<Pos> {
  if (run.status !== 'playing') return run;
  const exercise = run.exercise;
  switch (exercise.kind) {
    case 'reach':
    case 'collect':
      return collectStep(rules, run, move);
    case 'find-move': {
      const id = rules.moveId(move);
      if (exercise.solutions.includes(id)) return { ...run, pos: rules.play(run.pos, move), status: 'success', feedback: SUCCESS };
      return { ...run, pos: run.start, feedback: { tone: 'error', text: exercise.wrongMoveHints?.[id] ?? WRONG_MOVE_TEXT } };
    }
    case 'mate-in-1': {
      const after = rules.play(run.pos, move);
      const status = rules.status(after);
      if (status.kind === 'win' && status.winner === run.player) return { ...run, pos: after, status: 'success', feedback: SUCCESS };
      return { ...run, pos: run.start, feedback: { tone: 'error', text: NOT_MATE_TEXT } };
    }
    case 'play-out': {
      const after = { ...run, pos: rules.play(run.pos, move) };
      if (exercise.goal === 'promote' && rules.isPromotion(move)) return { ...after, status: 'success', feedback: SUCCESS };
      return settle(rules, after, 'waiting-opponent');
    }
  }
}

export function playOpponentMove<Pos, Move>(rules: LessonRules<Pos, Move>, run: ExerciseRun<Pos>, move: Move): ExerciseRun<Pos> {
  if (run.status !== 'waiting-opponent') return run;
  return settle(rules, { ...run, pos: rules.play(run.pos, move) }, 'playing');
}
