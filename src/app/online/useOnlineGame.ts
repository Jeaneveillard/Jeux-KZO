import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { MoveShape } from '../../board/move-input';
import { useMoveInput, type MoveInput } from '../../board/useMoveInput';
import type { OnlineApi } from '../../online/api';
import { isOnlineError, onlineErrorMessage } from '../../online/errors';
import type { OnlineGame } from '../../online/types';
import { currentPosition } from '../game/session';
import { playSound } from '../sound';
import { buildOnlineView, newerGame, resultAfter, type OnlineRules, type OnlineView } from './view';

const NOT_FOUND = "Cette partie n'existe plus, ou ce n'est pas la tienne.";

interface PendingMove {
  readonly text: string;
  /** Nombre de coups confirmés au moment de l'envoi. */
  readonly base: number;
}

export interface OnlineGameController<Pos, Move> {
  /** Dernière partie confirmée par le serveur. */
  readonly game: OnlineGame | null;
  /** Vue affichée : inclut le coup envoyé et pas encore confirmé. */
  readonly view: OnlineView<Pos, Move> | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly notice: string | null;
  readonly connected: boolean;
  readonly opponentOnline: boolean;
  readonly busy: boolean;
  readonly legal: readonly Move[];
  readonly input: MoveInput<Move>;
  offerDraw(): void;
  answerDraw(accept: boolean): void;
  resign(): void;
  cancel(): Promise<boolean>;
  rematch(): Promise<string | null>;
  refresh(): void;
}

export function useOnlineGame<Pos, Move extends MoveShape>(
  rules: OnlineRules<Pos, Move>,
  api: OnlineApi,
  userId: string,
  code: string,
  sound: boolean,
): OnlineGameController<Pos, Move> {
  const [game, setGame] = useState<OnlineGame | null>(null);
  const [pending, setPending] = useState<PendingMove | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  const [present, setPresent] = useState<readonly string[]>([]);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const seenMoves = useRef(-1);

  const accept = (next: OnlineGame) => setGame((previous) => newerGame(previous, next));

  const refresh = () => {
    api
      .findGame(code)
      .then((found) => {
        if (!alive.current) return;
        setLoading(false);
        if (found) {
          accept(found);
          setError(null);
        } else {
          setError(NOT_FOUND);
        }
      })
      .catch((failure: unknown) => {
        if (!alive.current) return;
        setLoading(false);
        setNotice(onlineErrorMessage(failure));
      });
  };

  useEffect(() => {
    alive.current = true;
    refresh();
    return () => {
      alive.current = false;
    };
  }, [code]);

  const gameId = game?.id ?? null;
  useEffect(() => {
    if (!gameId) return undefined;
    const stop = api.watch(gameId, userId, {
      onChange: refresh,
      onPresence: setPresent,
      onConnection: (value) => {
        setConnected(value);
        if (value) refresh();
      },
    });
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const onOnline = () => {
      setConnected(true);
      refresh();
    };
    const onOffline = () => setConnected(false);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [gameId]);

  // Son discret quand un coup de l'ami ou la fin de partie arrive.
  useEffect(() => {
    if (!game) return;
    if (seenMoves.current >= 0 && game.moves.length > seenMoves.current) playSound(game.status === 'terminee' ? 'end' : 'move', sound);
    seenMoves.current = game.moves.length;
  }, [game]);

  // Le coup envoyé s'affiche tout de suite, tant que le serveur ne l'a pas renvoyé (réponse ou notification).
  const shown = useMemo(
    () => (game && pending && game.moves.length === pending.base ? { ...game, moves: [...game.moves, pending.text] } : game),
    [game, pending],
  );
  const view = useMemo(() => (shown ? buildOnlineView(rules, shown, userId) : null), [shown, userId]);
  const canPlay = view !== null && view.myTurn && connected && !busy && pending === null;
  const legal = useMemo(() => (canPlay && view ? rules.adapter.legalMoves(currentPosition(view.session)) : []), [view, canPlay]);

  const play = (move: Move) => {
    if (!game || !view || !canPlay) return;
    const encoded = rules.codec.encode(move);
    const result = resultAfter(rules, currentPosition(view.session), move);
    setPending({ text: encoded, base: game.moves.length });
    setBusy(true);
    setNotice(null);
    seenMoves.current = game.moves.length + 1;
    // Réponse ou refus : tout change d'un coup (coup en attente retiré, partie ou message à jour).
    const settle = () => {
      setPending(null);
      setBusy(false);
    };
    api
      .playMove(game, encoded, result)
      .then((next) => {
        if (!alive.current) return;
        settle();
        accept(next);
      })
      .catch((failure: unknown) => {
        if (!alive.current) return;
        settle();
        setNotice(isOnlineError(failure, 'conflit') ? 'La partie a changé : rejoue ton coup.' : onlineErrorMessage(failure));
        refresh();
      });
  };

  const input = useMoveInput(legal, play);

  const act = (action: (gameId: string) => Promise<OnlineGame>) => {
    if (!game || busy) return;
    setBusy(true);
    setNotice(null);
    action(game.id)
      .then((next) => {
        if (alive.current) accept(next);
      })
      .catch((failure: unknown) => {
        if (!alive.current) return;
        setNotice(onlineErrorMessage(failure));
        refresh();
      })
      .finally(() => {
        if (alive.current) setBusy(false);
      });
  };

  return {
    game,
    view,
    loading,
    error,
    notice,
    connected,
    opponentOnline: view?.opponentId ? present.includes(view.opponentId) : false,
    busy,
    legal,
    input,
    offerDraw: () => act((id) => api.offerDraw(id)),
    answerDraw: (accept) => act((id) => api.answerDraw(id, accept)),
    resign: () => act((id) => api.resign(id)),
    cancel: async () => {
      if (!game || busy) return false;
      setBusy(true);
      try {
        await api.cancel(game.id);
        return true;
      } catch (failure) {
        setNotice(onlineErrorMessage(failure));
        refresh();
        return false;
      } finally {
        if (alive.current) setBusy(false);
      }
    },
    rematch: async () => {
      if (!game || busy) return null;
      setBusy(true);
      try {
        return (await api.rematch(game.id)).code;
      } catch (failure) {
        setNotice(onlineErrorMessage(failure));
        return null;
      } finally {
        if (alive.current) setBusy(false);
      }
    },
    refresh,
  };
}
