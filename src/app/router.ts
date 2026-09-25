import { isOneOf } from '../core/guards';
import { LEVELS_ORDER } from '../core/types';
import type { GameSetup } from './game/session';

export type Route =
  | { readonly name: 'home' }
  | { readonly name: 'settings' }
  | { readonly name: 'chess-menu' }
  | { readonly name: 'chess-lessons' }
  | { readonly name: 'chess-lesson'; readonly lessonId: string }
  | { readonly name: 'chess-play'; readonly setup: GameSetup }
  | { readonly name: 'chess-resume' };

const HOME: Route = { name: 'home' };
const CHESS_MENU: Route = { name: 'chess-menu' };

function splitHash(hash: string): string[] | null {
  try {
    return hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return null;
  }
}

export function parseRoute(hash: string): Route {
  const parts = splitHash(hash);
  if (!parts || parts.length === 0) return HOME;
  const [first, second, third, fourth, fifth] = parts;
  if (first === 'reglages') return { name: 'settings' };
  if (first !== 'echecs') return HOME;
  if (!second) return CHESS_MENU;
  if (second === 'lecons') return third ? { name: 'chess-lesson', lessonId: third } : { name: 'chess-lessons' };
  if (second === 'reprendre') return { name: 'chess-resume' };
  if (second === 'partie' && third === 'deux-joueurs') {
    return { name: 'chess-play', setup: { game: 'chess', mode: 'local', level: null, playerColor: 'white' } };
  }
  if (second === 'partie' && third === 'ordi' && isOneOf(fourth, LEVELS_ORDER) && isOneOf(fifth, ['blancs', 'noirs'] as const)) {
    return { name: 'chess-play', setup: { game: 'chess', mode: 'ai', level: fourth, playerColor: fifth === 'blancs' ? 'white' : 'black' } };
  }
  return CHESS_MENU;
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'settings':
      return '#/reglages';
    case 'chess-menu':
      return '#/echecs';
    case 'chess-lessons':
      return '#/echecs/lecons';
    case 'chess-lesson':
      return `#/echecs/lecons/${encodeURIComponent(route.lessonId)}`;
    case 'chess-resume':
      return '#/echecs/reprendre';
    case 'chess-play': {
      const { setup } = route;
      if (setup.mode === 'local' || setup.level === null) return '#/echecs/partie/deux-joueurs';
      return `#/echecs/partie/ordi/${setup.level}/${setup.playerColor === 'white' ? 'blancs' : 'noirs'}`;
    }
  }
}
