import { describe, expect, it } from 'vitest';
import { COLOR_CHOICES, resolveColor } from '../../../src/app/menu';
import { parseRoute, routeToHash, type Route } from '../../../src/app/router';

const routes: Route[] = [
  { name: 'home' },
  { name: 'settings' },
  { name: 'chess-menu' },
  { name: 'chess-lessons' },
  { name: 'chess-lesson', lessonId: 'en-passant' },
  { name: 'chess-resume' },
  { name: 'chess-play', setup: { game: 'chess', mode: 'ai', level: 'expert', playerColor: 'black' } },
  { name: 'chess-play', setup: { game: 'chess', mode: 'local', level: null, playerColor: 'white' } },
];

describe('routes', () => {
  it.each(routes.map((route) => [routeToHash(route), route] as const))('%s aller-retour', (hash, route) => {
    expect(parseRoute(hash)).toEqual(route);
  });

  it('écrit des adresses lisibles', () => {
    expect(routeToHash({ name: 'chess-play', setup: { game: 'chess', mode: 'ai', level: 'faible', playerColor: 'white' } })).toBe('#/echecs/partie/ordi/faible/blancs');
    expect(routeToHash({ name: 'home' })).toBe('#/');
  });

  it('se rabat sur un écran sûr pour une adresse inconnue', () => {
    expect(parseRoute('')).toEqual({ name: 'home' });
    expect(parseRoute('#/nimporte')).toEqual({ name: 'home' });
    expect(parseRoute('#/echecs/partie/ordi/maitre/blancs')).toEqual({ name: 'chess-menu' });
    expect(parseRoute('#/echecs/%E0%A4%A')).toEqual({ name: 'home' });
  });
});

describe('choix de couleur', () => {
  it('garde la couleur choisie ou tire au sort', () => {
    expect(resolveColor('black')).toBe('black');
    expect(resolveColor('random', () => 0.2)).toBe('white');
    expect(resolveColor('random', () => 0.7)).toBe('black');
    expect(COLOR_CHOICES.map((choice) => choice.label)).toEqual(['Blancs', 'Noirs', 'Au hasard']);
  });
});
