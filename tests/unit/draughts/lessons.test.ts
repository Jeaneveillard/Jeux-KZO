import { describe, expect, it } from 'vitest';
import { DRAUGHTS_LESSONS, findDraughtsLesson } from '../../../src/draughts/lessons';
import { draughtsLessonRules as rules, draughtsMoveId, parseDraughts, status } from '../../../src/draughts/rules';
import type { DraughtsPos } from '../../../src/draughts/types';
import { playPlayerMove, startExercise, starsOf, type ExerciseRun } from '../../../src/lessons/runner';
import type { Exercise } from '../../../src/lessons/types';

const SQUARE = /^([1-9]|[1-4]\d|50)$/;

/** Recherche en largeur : les étoiles peuvent-elles toutes être ramassées ? */
function solvesStars(exercise: Exercise, maxDepth = 10): boolean {
  let frontier: ExerciseRun<DraughtsPos>[] = [startExercise(rules, exercise)];
  const seen = new Set<string>();
  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth += 1) {
    const next: ExerciseRun<DraughtsPos>[] = [];
    for (const run of frontier) {
      for (const move of rules.legalMoves(run.pos)) {
        const after = playPlayerMove(rules, run, move);
        if (after.status === 'success') return true;
        const key = `${after.pos.board}|${after.remainingStars.join(',')}`;
        if (!seen.has(key)) {
          seen.add(key);
          next.push(after);
        }
      }
    }
    frontier = next;
  }
  return false;
}

function checkExercise(exercise: Exercise): void {
  const pos = rules.parse(exercise.position);
  const legal = rules.legalMoves(pos).map(draughtsMoveId);
  expect(exercise.instruction.length).toBeGreaterThan(10);
  switch (exercise.kind) {
    case 'reach':
    case 'collect':
      starsOf(exercise).forEach((star) => expect(star).toMatch(SQUARE));
      expect(solvesStars(exercise)).toBe(true);
      break;
    case 'find-move':
      exercise.solutions.forEach((solution) => expect(legal).toContain(solution));
      Object.keys(exercise.wrongMoveHints ?? {}).forEach((wrong) => {
        expect(legal).toContain(wrong);
        expect(exercise.solutions).not.toContain(wrong);
      });
      break;
    case 'mate-in-1':
      expect(rules.legalMoves(pos).some((move) => status(rules.play(pos, move)).kind === 'win')).toBe(true);
      break;
    case 'play-out':
      expect(status(parseDraughts(exercise.position))).toEqual({ kind: 'ongoing' });
      break;
  }
}

describe('leçons de dames', () => {
  it('propose 12 leçons aux identifiants uniques', () => {
    expect(DRAUGHTS_LESSONS).toHaveLength(12);
    expect(new Set(DRAUGHTS_LESSONS.map((lesson) => lesson.id)).size).toBe(12);
    expect(findDraughtsLesson('rafles')?.title).toBe('Les rafles');
    expect(findDraughtsLesson('inconnue')).toBeUndefined();
  });

  it.each(DRAUGHTS_LESSONS.map((lesson) => [lesson.id, lesson] as const))('%s : explication courte et 1 à 3 exercices', (_, lesson) => {
    expect(lesson.intro.length).toBeGreaterThanOrEqual(1);
    expect(lesson.intro.length).toBeLessThanOrEqual(3);
    expect(lesson.exercises.length).toBeGreaterThanOrEqual(1);
    expect(lesson.exercises.length).toBeLessThanOrEqual(3);
  });

  const exercises = DRAUGHTS_LESSONS.flatMap((lesson) =>
    lesson.exercises.map((exercise, index) => [`${lesson.id} n°${index + 1}`, exercise] as const),
  );

  it.each(exercises)('%s : position valide et exercice faisable', (_, exercise) => {
    checkExercise(exercise);
  });
});
