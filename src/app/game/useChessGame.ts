import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { EMPTY_INPUT, dropPiece, tapSquare, type InputResult, type InputState } from '../../board/move-input';
import { chessAdapter, chessMoveCodec, legalMoves, moveInfo, play, turnOf } from '../../chess/adapter';
import { BLUNDER_DEPTH, HINT_DEPTH } from '../../chess/engine/levels';
import { engineErrorMessage } from '../../core/engine-errors';
import { detectBlunder } from '../../chess/help/blunder';
import type { BlunderVerdict } from '../../core/help';
import { hintText } from '../../chess/help/hint';
import type { ChessMove, ChessPos } from '../../chess/types';
import type { Engine, Evaluation } from '../../core/types';
import { logWarning } from '../log';
import { playSound } from '../sound';
import { STORAGE_KEYS, type AppStorage } from '../storage';
import { toRecord } from './record';
import { applyMove, canUndo, currentPosition, isHumanTurn, resign, undoLastHumanMove, type Session } from './session';

export type ChessSession = Session<ChessPos, ChessMove>;

export interface Hint {
  readonly move: ChessMove;
  readonly text: string;
}

export interface BlunderPrompt {
  readonly move: ChessMove;
  readonly message: string;
}

export interface ChessGameDeps {
  readonly engine: () => Engine<ChessPos, ChessMove>;
  readonly storage: AppStorage;
  readonly sound: boolean;
}

export interface ChessGame {
  readonly session: ChessSession;
  readonly position: ChessPos;
  readonly legal: readonly ChessMove[];
  readonly input: InputState;
  readonly promotionChoices: readonly ChessMove[] | null;
  readonly thinking: boolean;
  readonly checking: boolean;
  readonly hint: Hint | null;
  readonly blunder: BlunderPrompt | null;
  readonly engineError: string | null;
  readonly humanTurn: boolean;
  readonly undoAvailable: boolean;
  readonly faibleHelp: boolean;
  tap(square: string): void;
  drop(from: string, to: string): void;
  choosePromotion(move: ChessMove): void;
  cancelPromotion(): void;
  requestHint(): void;
  confirmBlunder(): void;
  cancelBlunder(): void;
  undo(): void;
  resignGame(): void;
  retryEngine(): void;
}

export function useChessGame(initial: ChessSession, deps: ChessGameDeps): ChessGame {
  const [session, setSession] = useState(initial);
  const [input, setInput] = useState<InputState>(EMPTY_INPUT);
  const [promotionChoices, setPromotionChoices] = useState<readonly ChessMove[] | null>(null);
  const [thinking, setThinking] = useState(false);
  const [checking, setChecking] = useState(false);
  const [hint, setHint] = useState<Hint | null>(null);
  const [blunder, setBlunder] = useState<BlunderPrompt | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [engineAttempt, setEngineAttempt] = useState(0);
  const beforeEval = useRef<Promise<Evaluation> | null>(null);

  const position = currentPosition(session);
  const ongoing = session.result.kind === 'ongoing';
  const humanTurn = ongoing && isHumanTurn(chessAdapter, session);
  const legal = useMemo(() => (humanTurn ? legalMoves(position) : []), [position, humanTurn]);
  const faibleHelp = session.setup.mode === 'ai' && session.setup.level === 'faible';
  const busy = thinking || checking || blunder !== null;

  const commit = (base: ChessSession, move: ChessMove) => {
    const info = moveInfo(currentPosition(base), move);
    const next = applyMove(chessAdapter, base, move);
    setSession(next);
    setHint(null);
    setInput(EMPTY_INPUT);
    setPromotionChoices(null);
    const kind = next.result.kind !== 'ongoing' ? 'end' : info.givesCheck ? 'check' : info.captured ? 'capture' : 'move';
    playSound(kind, deps.sound);
  };

  // Sauvegarde automatique : partie en cours enregistrée, partie finie effacée.
  useEffect(() => {
    if (session.result.kind === 'ongoing') {
      deps.storage.write(STORAGE_KEYS.chessSavedGame, toRecord(chessAdapter, chessMoveCodec, session));
    } else {
      deps.storage.remove(STORAGE_KEYS.chessSavedGame);
    }
  }, [session]);

  // Tour de l'ordinateur.
  useEffect(() => {
    if (session.setup.mode !== 'ai' || !ongoing || isHumanTurn(chessAdapter, session)) return undefined;
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
    const pending = deps.engine().analyse(position, BLUNDER_DEPTH);
    // Évite un rejet non géré : l'erreur est traitée là où la promesse est attendue (checkForBlunder).
    pending.catch(() => undefined);
    beforeEval.current = pending;
  }, [session]);

  const checkForBlunder = async (base: ChessSession, move: ChessMove): Promise<BlunderVerdict> => {
    const pos = currentPosition(base);
    const before = await (beforeEval.current ?? deps.engine().analyse(pos, BLUNDER_DEPTH));
    const after = play(pos, move);
    if (chessAdapter.status(after).kind !== 'ongoing') return { blunder: false };
    return detectBlunder(pos, move, before, await deps.engine().analyse(after, BLUNDER_DEPTH));
  };

  const submitHumanMove = (move: ChessMove) => {
    setInput(EMPTY_INPUT);
    setPromotionChoices(null);
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

  const handleInput = (result: InputResult<ChessMove>) => {
    setInput(result.state);
    if (result.choices) setPromotionChoices(result.choices);
    else if (result.move) submitHumanMove(result.move);
  };

  const canAct = humanTurn && !busy && promotionChoices === null;

  return {
    session,
    position,
    legal,
    input,
    promotionChoices,
    thinking,
    checking,
    hint,
    blunder,
    engineError,
    humanTurn,
    faibleHelp,
    undoAvailable: canUndo(chessAdapter, session) && !busy,
    tap: (square) => {
      if (canAct) handleInput(tapSquare(input, square, legal));
    },
    drop: (from, to) => {
      if (canAct) handleInput(dropPiece(from, to, legal));
    },
    choosePromotion: (move) => {
      setPromotionChoices(null);
      submitHumanMove(move);
    },
    cancelPromotion: () => {
      setPromotionChoices(null);
      setInput(EMPTY_INPUT);
    },
    requestHint: () => {
      if (!faibleHelp || !canAct) return;
      const pos = position;
      setChecking(true);
      deps
        .engine()
        .analyse(pos, HINT_DEPTH)
        .then((analysis) => setHint({ move: analysis.best, text: hintText(pos, analysis.best) }))
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
      if (!canUndo(chessAdapter, session) || busy) return;
      setSession(undoLastHumanMove(chessAdapter, session));
      setHint(null);
      setInput(EMPTY_INPUT);
    },
    resignGame: () => {
      // Un coup en cours de vérification serait ensuite joué sur la session d'avant l'abandon et l'effacerait.
      if (checking) return;
      const loser = session.setup.mode === 'ai' ? session.setup.playerColor : turnOf(position);
      setSession(resign(session, loser));
    },
    retryEngine: () => {
      setEngineError(null);
      setEngineAttempt((attempt) => attempt + 1);
    },
  };
}
