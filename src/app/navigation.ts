import { useEffect, useState } from 'preact/hooks';
import { parseRoute, routeToHash, type Route } from './router';

export interface RouteState {
  readonly route: Route;
  /** Augmente à chaque navigation : sert de clé pour recréer un écran (ex. nouvelle partie). */
  readonly version: number;
}

export function useRoute(): RouteState {
  const [state, setState] = useState<RouteState>(() => ({ route: parseRoute(window.location.hash), version: 0 }));
  useEffect(() => {
    const onChange = () => setState((previous) => ({ route: parseRoute(window.location.hash), version: previous.version + 1 }));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return state;
}

export function navigate(route: Route): void {
  const hash = routeToHash(route);
  if (window.location.hash === hash) {
    // Même adresse (ex. « Nouvelle partie ») : on force quand même un nouvel écran.
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = hash;
  }
}

/** Change l'adresse sans changer d'écran ni ajouter d'entrée d'historique. */
export function replaceHash(route: Route): void {
  history.replaceState(null, '', routeToHash(route));
}
