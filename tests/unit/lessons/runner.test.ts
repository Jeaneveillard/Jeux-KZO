import { describe, expect, it } from 'vitest';
import { fromUci } from '../../../src/chess/adapter';
import { chessLessonRules as rules } from '../../../src/chess/lesson-rules';
import { SUCCESS_TEXT, playOpponentMove, playPlayerMove, startExercise, starsOf } from '../../../src/lessons/runner';
import type { Exercise } from '../../../src/lessons/types';

const move = (uci: string) => fromUci(uci);

describe('déroulé des exercices', () => {
  it('ramasse les étoiles coup après coup en gardant le trait', () => {
    const exercise: Exercise = { kind: 'collect', position: '8/8/8/8/8/8/8/R7 w - - 0 1', instruction: 'Ramasse les étoiles.', stars: ['a5', 'e5'] };
    const run0 = startExercise(rules, exercise);
    expect(run0.player).toBe('white');
    expect(run0.remainingStars).toEqual(['a5', 'e5']);
    const run1 = playPlayerMove(rules, run0, move('a1a5'));
    expect(run1.status).toBe('playing');
    expect(run1.remainingStars).toEqual(['e5']);
    expect(rules.turn(run1.pos)).toBe('white');
    const run2 = playPlayerMove(rules, run1, move('a5e5'));
    expect(run2.status).toBe('success');
    expect(run2.feedback).toEqual({ tone: 'success', text: SUCCESS_TEXT });
    expect(playPlayerMove(rules, run2, move('e5e6'))).toBe(run2);
  });

  it('traite « atteindre une case » comme une seule étoile', () => {
    const exercise: Exercise = { kind: 'reach', position: '8/8/8/8/8/8/8/4R3 w - - 0 1', instruction: 'Va en e8.', target: 'e8' };
    expect(starsOf(exercise)).toEqual(['e8']);
    expect(playPlayerMove(rules, startExercise(rules, exercise), move('e1e8')).status).toBe('success');
  });

  it('valide le bon coup et explique un mauvais coup', () => {
    const exercise: Exercise = {
      kind: 'find-move',
      position: 'r3k3/8/8/8/8/8/1p6/Q3K3 w - - 0 1',
      instruction: 'Prends la pièce qui vaut le plus.',
      solutions: ['a1a8'],
      wrongMoveHints: { a1b2: 'Le pion ne vaut que 1 point.' },
    };
    const run = startExercise(rules, exercise);
    const wrong = playPlayerMove(rules, run, move('a1b2'));
    expect(wrong.status).toBe('playing');
    expect(wrong.pos).toBe(run.start);
    expect(wrong.feedback).toEqual({ tone: 'error', text: 'Le pion ne vaut que 1 point.' });
    expect(playPlayerMove(rules, run, move('a1c1')).feedback?.text).toBe("Ce n'est pas le bon coup. Réessaie !");
    expect(playPlayerMove(rules, run, move('a1a8')).status).toBe('success');
  });

  it('valide un mat en 1 et refuse un coup qui ne mate pas', () => {
    const exercise: Exercise = { kind: 'mate-in-1', position: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', instruction: 'Fais échec et mat.' };
    const run = startExercise(rules, exercise);
    expect(playPlayerMove(rules, run, move('a1a8')).status).toBe('success');
    const miss = playPlayerMove(rules, run, move('a1a7'));
    expect(miss.status).toBe('playing');
    expect(miss.feedback?.tone).toBe('error');
  });

  it('joue une fin de partie contre l’ordinateur jusqu’à la promotion', () => {
    const exercise: Exercise = { kind: 'play-out', position: '8/8/1P6/8/8/8/k7/4K3 w - - 0 1', instruction: 'Fais une dame.', goal: 'promote', level: 'faible' };
    const run0 = startExercise(rules, exercise);
    const run1 = playPlayerMove(rules, run0, move('b6b7'));
    expect(run1.status).toBe('waiting-opponent');
    expect(playPlayerMove(rules, run1, move('e1e2'))).toBe(run1);
    const run2 = playOpponentMove(rules, run1, move('a2b3'));
    expect(run2.status).toBe('playing');
    expect(playOpponentMove(rules, run2, move('b3c4'))).toBe(run2);
    const run3 = playPlayerMove(rules, run2, move('b7b8q'));
    expect(run3.status).toBe('success');
  });

  it('réussit une fin de partie gagnée par mat', () => {
    const exercise: Exercise = { kind: 'play-out', position: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', instruction: 'Gagne.', goal: 'win', level: 'expert' };
    expect(playPlayerMove(rules, startExercise(rules, exercise), move('a1a8')).status).toBe('success');
  });

  it('échoue si la partie devient nulle ou perdue', () => {
    const stalemate: Exercise = { kind: 'play-out', position: 'k7/8/1K6/8/8/8/8/2Q5 w - - 0 1', instruction: 'Gagne.', goal: 'win', level: 'expert' };
    const drawn = playPlayerMove(rules, startExercise(rules, stalemate), move('c1c7'));
    expect(drawn.status).toBe('failed');
    expect(drawn.feedback?.text).toContain('Pat');
    const losing: Exercise = { kind: 'play-out', position: 'r5k1/8/8/8/8/8/5PPP/6K1 b - - 0 1', instruction: 'Défends-toi.', goal: 'win', level: 'expert' };
    const run = { ...startExercise(rules, losing), player: 'white' as const, status: 'waiting-opponent' as const };
    const lost = playOpponentMove(rules, run, move('a8a1'));
    expect(lost.status).toBe('failed');
    expect(lost.feedback?.text).toBe("L'ordinateur a gagné cette fois. Réessaie !");
  });

  it('échoue sur une autre nulle', () => {
    const exercise: Exercise = { kind: 'play-out', position: '8/8/8/8/8/2k5/8/K1b5 w - - 0 1', instruction: 'Gagne.', goal: 'win', level: 'expert' };
    const run = startExercise(rules, exercise);
    const drawn = playPlayerMove(rules, run, move('a1b1'));
    expect(drawn.status).toBe('failed');
    expect(drawn.feedback?.text).toBe("Partie nulle : l'objectif n'est pas atteint. Réessaie !");
  });
});
