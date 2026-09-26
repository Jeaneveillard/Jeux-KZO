import { useEffect, useMemo, useState } from 'preact/hooks';
import { EMPTY_INPUT, dropPiece, tapSquare, type InputResult, type InputState, type MoveShape } from '../../board/move-input';
import { engineErrorMessage } from '../../core/engine-errors';
import type { Engine } from '../../core/types';
import { playOpponentMove, playPlayerMove, startExercise, type ExerciseRun } from '../../lessons/runner';
import type { Exercise, LessonRules } from '../../lessons/types';

export interface LessonExercise<Pos, Move> {
  readonly run: ExerciseRun<Pos>;
  readonly input: InputState;
  readonly choices: readonly Move[] | null;
  readonly last: Move | null;
  readonly legal: readonly Move[];
  readonly thinking: boolean;
  readonly engineError: string | null;
  tap(square: string): void;
  drop(from: string, to: string): void;
  choose(move: Move): void;
  cancelChoice(): void;
  restart(): void;
  retryEngine(): void;
}

export function useLessonExercise<Pos, Move extends MoveShape>(
  rules: LessonRules<Pos, Move>,
  exercise: Exercise,
  engine: () => Engine<Pos, Move>,
): LessonExercise<Pos, Move> {
  const [run, setRun] = useState(() => startExercise(rules, exercise));
  const [input, setInput] = useState<InputState>(EMPTY_INPUT);
  const [choices, setChoices] = useState<readonly Move[] | null>(null);
  const [last, setLast] = useState<Move | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const legal = useMemo(() => (run.status === 'playing' ? rules.legalMoves(run.pos) : []), [run]);

  // Fin de partie contre l'ordinateur : il répond quand c'est son tour.
  useEffect(() => {
    if (run.status !== 'waiting-opponent' || run.exercise.kind !== 'play-out') return undefined;
    const controller = new AbortController();
    engine()
      .bestMove(run.pos, run.exercise.level, controller.signal)
      .then((move) => {
        if (controller.signal.aborted) return;
        setLast(move);
        setRun(playOpponentMove(rules, run, move));
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setEngineError(engineErrorMessage(error));
      });
    return () => controller.abort();
  }, [run, attempt]);

  const submit = (move: Move) => {
    setInput(EMPTY_INPUT);
    setChoices(null);
    const next = playPlayerMove(rules, run, move);
    setLast(next.pos === next.start ? null : move);
    setRun(next);
  };

  const handle = (result: InputResult<Move>) => {
    setInput(result.state);
    if (result.choices) setChoices(result.choices);
    else if (result.move) submit(result.move);
  };

  const canPlay = run.status === 'playing' && choices === null;

  return {
    run,
    input,
    choices,
    last,
    legal,
    thinking: run.status === 'waiting-opponent',
    engineError,
    tap: (square) => {
      if (canPlay) handle(tapSquare(input, square, legal));
    },
    drop: (from, to) => {
      if (canPlay) handle(dropPiece(from, to, legal));
    },
    choose: submit,
    cancelChoice: () => {
      setChoices(null);
      setInput(EMPTY_INPUT);
    },
    restart: () => {
      setRun(startExercise(rules, exercise));
      setInput(EMPTY_INPUT);
      setChoices(null);
      setLast(null);
      setEngineError(null);
    },
    retryEngine: () => {
      setEngineError(null);
      setAttempt((value) => value + 1);
    },
  };
}
