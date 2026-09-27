import { useEffect, useState } from 'preact/hooks';
import type { OnlineApi } from '../../online/api';
import { OnlineError, onlineErrorMessage } from '../../online/errors';
import { getOnlineApi } from '../../online/index';

export interface OnlineConnection {
  readonly api: OnlineApi | null;
  readonly userId: string | null;
  readonly error: string | null;
  retry(): void;
}

interface ConnectionState {
  readonly api: OnlineApi | null;
  readonly userId: string | null;
  readonly error: string | null;
}

const EMPTY: ConnectionState = { api: null, userId: null, error: null };

/** Charge le client du jeu en ligne et ouvre la session anonyme ; rien n'est chargé tant que `enabled` est faux. */
export function useOnlineApi(enabled: boolean, load: () => Promise<OnlineApi> = getOnlineApi): OnlineConnection {
  const [state, setState] = useState<ConnectionState>(EMPTY);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    if (!navigator.onLine) {
      setState({ ...EMPTY, error: new OnlineError('hors_ligne').message });
      return undefined;
    }
    let alive = true;
    setState(EMPTY);
    load()
      .then(async (api) => {
        const userId = await api.userId();
        if (alive) setState({ api, userId, error: null });
      })
      .catch((error: unknown) => {
        if (alive) setState({ ...EMPTY, error: onlineErrorMessage(error) });
      });
    return () => {
      alive = false;
    };
  }, [enabled, attempt]);

  return { ...state, retry: () => setAttempt((value) => value + 1) };
}
