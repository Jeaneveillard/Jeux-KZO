import { useEffect, useMemo, useState } from 'preact/hooks';
import { Board } from '../../board/Board';
import { targetsOf, type MoveShape } from '../../board/move-input';
import type { Exercise, Lesson } from '../../lessons/types';
import type { GameKit } from '../games/kit';
import { playSound } from '../sound';
import { useLessonExercise } from './useLessonExercise';

interface LessonScreenProps<Pos, Move extends MoveShape> {
  readonly kit: GameKit<Pos, Move>;
  readonly lesson: Lesson;
  readonly nextLesson?: Lesson;
  readonly sound: boolean;
  readonly onComplete: (lessonId: string) => void;
  readonly onOpen: (lessonId: string) => void;
  readonly onBack: () => void;
}

interface ExerciseViewProps<Pos, Move extends MoveShape> {
  readonly kit: GameKit<Pos, Move>;
  readonly exercise: Exercise;
  readonly index: number;
  readonly total: number;
  readonly sound: boolean;
  readonly onNext: () => void;
}

function ExerciseView<Pos, Move extends MoveShape>({ kit, exercise, index, total, sound, onNext }: ExerciseViewProps<Pos, Move>) {
  const ex = useLessonExercise(kit.lessonRules, exercise, kit.engine);
  const geometry = useMemo(() => kit.geometry(ex.run.player), [kit, ex.run.player]);
  const solved = ex.run.status === 'success';
  const failed = ex.run.status === 'failed';
  const ChoicePicker = kit.ChoicePicker;

  useEffect(() => {
    if (solved) playSound('end', sound);
  }, [solved]);

  return (
    <>
      <div class="game-layout">
        <div class="game-info">
          <p class="muted">
            Exercice {index + 1} / {total}
          </p>
          <p class="card">{exercise.instruction}</p>
        </div>
        <div class="game-board">
          <div class="board-wrap">
            <Board
              geometry={geometry}
              pieces={kit.boardPieces(ex.run.pos)}
              selected={ex.input.selected}
              targets={targetsOf(ex.input.selected, ex.legal)}
              highlights={ex.last ? [ex.last.from, ex.last.to] : []}
              check={kit.checkSquare(ex.run.pos)}
              stars={ex.run.remainingStars}
              onSquareTap={ex.tap}
              onDrop={ex.drop}
              canDrag={(square) => ex.legal.some((move) => move.from === square)}
            />
          </div>
        </div>
        <div class="game-rest">
          {ex.thinking && <p class="status-line thinking">L'ordinateur réfléchit…</p>}
          {ex.run.feedback && (
            <p class={`feedback feedback-${ex.run.feedback.tone}`} role="status">
              {ex.run.feedback.text}
            </p>
          )}
          {ex.engineError && (
            <div class="banner" role="alert">
              <span>{ex.engineError}</span>
              <button type="button" class="btn btn-small" onClick={ex.retryEngine}>
                Réessayer
              </button>
            </div>
          )}
          <div class="actions">
            {!solved && (
              <button type="button" class="btn btn-small" onClick={ex.restart}>
                {failed ? 'Réessayer' : 'Recommencer'}
              </button>
            )}
            {solved && (
              <button type="button" class="btn btn-primary" onClick={onNext}>
                {index + 1 < total ? 'Exercice suivant' : 'Terminer la leçon'}
              </button>
            )}
          </div>
        </div>
      </div>
      {ex.choices && (
        <ChoicePicker color={kit.lessonRules.turn(ex.run.pos)} choices={ex.choices} onPick={ex.choose} onCancel={ex.cancelChoice} />
      )}
    </>
  );
}

export function LessonScreen<Pos, Move extends MoveShape>({ kit, lesson, nextLesson, sound, onComplete, onOpen, onBack }: LessonScreenProps<Pos, Move>) {
  const [step, setStep] = useState(-1);
  const total = lesson.exercises.length;

  const header = (
    <header class="topbar">
      <button type="button" class="back" aria-label="Retour à la liste des leçons" onClick={onBack}>
        ←
      </button>
      <h1>{lesson.title}</h1>
    </header>
  );

  if (step < 0) {
    return (
      <section class="screen">
        {header}
        <div class="card intro">
          {lesson.intro.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <button type="button" class="btn btn-primary" onClick={() => setStep(0)}>
          Commencer
        </button>
      </section>
    );
  }

  if (step >= total) {
    return (
      <section class="screen">
        {header}
        <p class="feedback feedback-success">Leçon terminée ! 🎉</p>
        {nextLesson && (
          <button type="button" class="btn btn-primary" onClick={() => onOpen(nextLesson.id)}>
            Leçon suivante : {nextLesson.title}
          </button>
        )}
        <button type="button" class="btn" onClick={onBack}>
          Retour aux leçons
        </button>
      </section>
    );
  }

  return (
    <section class="screen screen-game">
      {header}
      <ExerciseView
        key={step}
        kit={kit}
        exercise={lesson.exercises[step]}
        index={step}
        total={total}
        sound={sound}
        onNext={() => {
          if (step + 1 >= total) onComplete(lesson.id);
          setStep(step + 1);
        }}
      />
    </section>
  );
}
