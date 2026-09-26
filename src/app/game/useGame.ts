import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { EMPTY_INPUT, dropPiece, tapSquare, type InputResult, type InputState, type MoveShape } from '../../board/move-input';
import { engineErrorMessage } from '../../core/engine-errors';
import type { BlunderVerdict } from '../../core/help';
import type { Engine, Evaluation } from '../../core/types';
import type { GameKit } from '../games/kit';
import { logWarning } from '../log';
import { playSound } from '../sound';
import type { AppStorage } from '../storage';
import { toRecord } from './record';
import { applyMove, canUndo, currentPosition, isHumanTurn, resign, undoLastHumanMove, type Session } from './session';

export interface Hint<Move> {
  readonly move: Move;
  readonly text: string;
}

export interface BlunderPrompt<Move> {
  readonly move: Move;
  readonly message: string;
}

export interface GameDeps<Pos, Move> {
  readonly engine: () => Engine<Pos, Move>;
  readonly storage: AppStorage;
  readonly sound: boolean;
}

export interface GameController<Pos, Move> {
  readonly session: Session<Pos, Move>;
  readonly position: Pos;
  readonly legal: readonly Move[];
  readonly input: InputState;
  readonly choices: readonly Move[] | null;
  readonly thinking: boolean;
  readonly checking: boolean;
  readonly hint: Hint<Move> | null;
  readonly blunder: BlunderPrompt<Move> | null;
  readonly engineError: string | null;
  readonly humanTurn: boolean;
  readonly undoAvailable: boolean;
  readonly faibleHelp: boolean;
  tap(square: string): void;
  drop(from: string, to: string): void;
  choose(move: Move): void;
  cancelChoice(): void;
  requestHint(): void;
  confirmBlunder(): void;
  cancelBlunder(): void;
  undo(): void;
  resignGame(): void;
  retryEngine(): void;
}

export function useGame<Pos, Move extends MoveShape>(
  initial: Session<Pos, Move>,
  kit: GameKit<Pos, Move>,
  deps: GameDeps<Pos, Move>,
): GameController<Pos, Move> {
  const { adapter, help } = kit;
  const [session, setSession] = useState(initial);
  const [input, setInput] = useState<InputState>(EMPTY_INPUT);
  const [choices, setChoices] = useState<readonly Move[] | null>(null);
  const [thinking, setThinking] = useState(false);
  const [checking, setChecking] = useState(false);
  const [hint, setHint] = useState<Hint<Move> | null>(null);
  const [blunder, setBlunder] = useState<BlunderPrompt<Move> | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [engineAttempt, setEngineAttempt] = useState(0);
  const beforeEval = useRef<Promise<Evaluation> | null>(null);

  const position = currentPosition(session);
  const ongoing = session.result.kind === 'ongoing';
  const humanTurn = ongoing && isHumanTurn(adapter, session);
  const legal = useMemo(() => (humanTurn ? adapter.legalMoves(position) : []), [position, humanTurn]);
  const faibleHelp = session.setup.mode === 'ai' && session.setup.level === 'faible';
  const busy = thinking || checking || blunder !== null;

  const commit = (base: Session<Pos, Move>, move: Move) => {
    const sound = kit.moveSound(currentPosition(base), move);
    const next = applyMove(adapter, base, move);
    setSession(next);
    setHint(null);
    setInput(EMPTY_INPUT);
    setChoices(null);
    playSound(next.result.kind !== 'ongoing' ? 'end' : sound, deps.sound);
  };

  // Sauvegarde automatique : partie en cours enregistrée, partie finie effacée.
  useEffect(() => {
    if (session.result.kind === 'ongoing') {
      deps.storage.write(kit.savedGameKey, toRecord(adapter, kit.codec, session));
    } else {
      deps.storage.remove(kit.savedGameKey);
    }
  }, [session]);

  // Tour de l'ordinateur.
  useEffect(() => {
    if (session.setup.mode !== 'ai' || !ongoing || isHumanTurn(adapter, session)) return undefined;
    const controller = new AbortController();
    setThinking(true);
    setEngineError(null);
    deps
      .engine()
      .bestMove(position, session.setup.level ?? 'moyen', controller.signal)
      .then((move) => {
        if (!controller.signal.aborted) commit(session, move);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setEngineError(engineErrorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setThinking(false);
      });
    return () => {
      controller.abort();
      setThinking(false);
    };
  }, [session, engineAttempt]);

  // Niveau Faible : on prépare l'évaluation de la position dès que c'est au joueur.
  useEffect(() => {
    beforeEval.current = null;
    if (!faibleHelp || !humanTurn) return;
    const pending = deps.engine().analyse(position, help.blunderDepth);
    // Évite un rejet non géré : l'erreur est traitée là où la promesse est attendue (checkForBlunder).
    pending.catch(() => undefined);
    beforeEval.current = pending;
  }, [session]);

  const checkForBlunder = async (base: Session<Pos, Move>, move: Move): Promise<BlunderVerdict> => {
    const pos = currentPosition(base);
    const before = await (beforeEval.current ?? deps.engine().analyse(pos, help.blunderDepth));
    const after = adapter.play(pos, move);
    if (adapter.status(after).kind !== 'ongoing') return { blunder: false };
    return help.detectBlunder(pos, move, before, await deps.engine().analyse(after, help.blunderDepth));
  };

  const submitHumanMove = (move: Move) => {
    setInput(EMPTY_INPUT);
    setChoices(null);
    if (!faibleHelp) {
      commit(session, move);
      return;
    }
    const base = session;
    setChecking(true);
    checkForBlunder(base, move)
      .then((verdict) => (verdict.blunder ? setBlunder({ move, message: verdict.message }) : commit(base, move)))
      .catch((error: unknown) => {
        logWarning('[aide] vérification du coup impossible', error);
        commit(base, move);
      })
      .finally(() => setChecking(false));
  };

  const handleInput = (result: InputResult<Move>) => {
    setInput(result.state);
    if (result.choices) setChoices(result.choices);
    else if (result.move) submitHumanMove(result.move);
  };

  const canAct = humanTurn && !busy && choices === null;

  return {
    session,
    position,
    legal,
    input,
    choices,
    thinking,
    checking,
    hint,
    blunder,
    engineError,
    humanTurn,
    faibleHelp,
    undoAvailable: canUndo(adapter, session) && !busy,
    tap: (square) => {
      if (canAct) handleInput(tapSquare(input, square, legal));
    },
    drop: (from, to) => {
      if (canAct) handleInput(dropPiece(from, to, legal));
    },
    choose: (move) => {
      setChoices(null);
      submitHumanMove(move);
    },
    cancelChoice: () => {
      setChoices(null);
      setInput(EMPTY_INPUT);
    },
    requestHint: () => {
      if (!faibleHelp || !canAct) return;
      const pos = position;
      setChecking(true);
      deps
        .engine()
        .analyse(pos, help.hintDepth)
        .then((analysis) => setHint({ move: analysis.best, text: help.hintText(pos, analysis.best) }))
        .catch((error: unknown) => setEngineError(engineErrorMessage(error)))
        .finally(() => setChecking(false));
    },
    confirmBlunder: () => {
      if (!blunder) return;
      setBlunder(null);
      commit(session, blunder.move);
    },
    cancelBlunder: () => setBlunder(null),
    undo: () => {
      if (!canUndo(adapter, session) || busy) return;
      setSession(undoLastHumanMove(adapter, session));
      setHint(null);
      setInput(EMPTY_INPUT);
    },
    resignGame: () => {
      // Un coup en cours de vérification serait ensuite joué sur la session d'avant l'abandon et l'effacerait.
      if (checking) return;
      const loser = session.setup.mode === 'ai' ? session.setup.playerColor : adapter.turn(position);
      setSession(resign(session, loser));
    },
    retryEngine: () => {
      setEngineError(null);
      setEngineAttempt((attempt) => attempt + 1);
    },
  };
}
