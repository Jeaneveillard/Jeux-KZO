import { isOneOf } from '../core/guards';
import { GAME_IDS, LEVELS_ORDER, type GameId } from '../core/types';
import { normalizeCode } from '../online/code';
import type { GameSetup } from './game/session';

export type Route =
  | { readonly name: 'home' }
  | { readonly name: 'settings' }
  | { readonly name: 'menu'; readonly game: GameId }
  | { readonly name: 'lessons'; readonly game: GameId }
  | { readonly name: 'lesson'; readonly game: GameId; readonly lessonId: string }
  | { readonly name: 'play'; readonly setup: GameSetup }
  | { readonly name: 'resume'; readonly game: GameId }
  | { readonly name: 'online'; readonly game: GameId }
  | { readonly name: 'onlineGame'; readonly game: GameId; readonly code: string }
  | { readonly name: 'join'; readonly code: string };

const SEGMENTS: Readonly<Record<GameId, string>> = { chess: 'echecs', draughts: 'dames' };
const HOME: Route = { name: 'home' };

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
  if (first === 'rejoindre') {
    const code = normalizeCode(second ?? '');
    return code ? { name: 'join', code } : HOME;
  }
  const game = GAME_IDS.find((id) => SEGMENTS[id] === first);
  if (!game) return HOME;
  const menu: Route = { name: 'menu', game };
  if (!second) return menu;
  if (second === 'lecons') return third ? { name: 'lesson', game, lessonId: third } : { name: 'lessons', game };
  if (second === 'reprendre') return { name: 'resume', game };
  if (second === 'en-ligne') {
    const code = normalizeCode(third ?? '');
    return code ? { name: 'onlineGame', game, code } : { name: 'online', game };
  }
  if (second === 'partie' && third === 'deux-joueurs') {
    return { name: 'play', setup: { game, mode: 'local', level: null, playerColor: 'white' } };
  }
  if (second === 'partie' && third === 'ordi' && isOneOf(fourth, LEVELS_ORDER) && isOneOf(fifth, ['blancs', 'noirs'] as const)) {
    return { name: 'play', setup: { game, mode: 'ai', level: fourth, playerColor: fifth === 'blancs' ? 'white' : 'black' } };
  }
  return menu;
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'settings':
      return '#/reglages';
    case 'menu':
      return `#/${SEGMENTS[route.game]}`;
    case 'lessons':
      return `#/${SEGMENTS[route.game]}/lecons`;
    case 'lesson':
      return `#/${SEGMENTS[route.game]}/lecons/${encodeURIComponent(route.lessonId)}`;
    case 'resume':
      return `#/${SEGMENTS[route.game]}/reprendre`;
    case 'online':
      return `#/${SEGMENTS[route.game]}/en-ligne`;
    case 'onlineGame':
      return `#/${SEGMENTS[route.game]}/en-ligne/${route.code}`;
    case 'join':
      return `#/rejoindre/${route.code}`;
    case 'play': {
      const { setup } = route;
      const base = `#/${SEGMENTS[setup.game]}/partie`;
      if (setup.mode === 'local' || setup.level === null) return `${base}/deux-joueurs`;
      return `${base}/ordi/${setup.level}/${setup.playerColor === 'white' ? 'blancs' : 'noirs'}`;
    }
  }
}
