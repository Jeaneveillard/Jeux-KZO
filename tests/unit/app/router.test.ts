import { describe, expect, it } from 'vitest';
import { COLOR_CHOICES, resolveColor } from '../../../src/app/menu';
import { parseRoute, routeToHash, type Route } from '../../../src/app/router';

const routes: Route[] = [
  { name: 'home' },
  { name: 'settings' },
  { name: 'menu', game: 'chess' },
  { name: 'menu', game: 'draughts' },
  { name: 'lessons', game: 'chess' },
  { name: 'lesson', game: 'draughts', lessonId: 'rafles' },
  { name: 'resume', game: 'chess' },
  { name: 'play', setup: { game: 'chess', mode: 'ai', level: 'expert', playerColor: 'black' } },
  { name: 'play', setup: { game: 'draughts', mode: 'local', level: null, playerColor: 'white' } },
  { name: 'online', game: 'chess' },
  { name: 'onlineGame', game: 'draughts', code: 'K7M2QX' },
  { name: 'join', code: 'K7M2QX' },
];

describe('routes', () => {
  it.each(routes.map((route) => [routeToHash(route), route] as const))('%s aller-retour', (hash, route) => {
    expect(parseRoute(hash)).toEqual(route);
  });

  it('écrit des adresses lisibles', () => {
    expect(routeToHash({ name: 'play', setup: { game: 'chess', mode: 'ai', level: 'faible', playerColor: 'white' } })).toBe('#/echecs/partie/ordi/faible/blancs');
    expect(routeToHash({ name: 'lessons', game: 'draughts' })).toBe('#/dames/lecons');
    expect(routeToHash({ name: 'home' })).toBe('#/');
  });

  it('se rabat sur un écran sûr pour une adresse inconnue', () => {
    expect(parseRoute('')).toEqual({ name: 'home' });
    expect(parseRoute('#/nimporte')).toEqual({ name: 'home' });
    expect(parseRoute('#/constructor')).toEqual({ name: 'home' });
    expect(parseRoute('#/echecs/partie/ordi/maitre/blancs')).toEqual({ name: 'menu', game: 'chess' });
    expect(parseRoute('#/echecs/%E0%A4%A')).toEqual({ name: 'home' });
  });

  it('lit les adresses du jeu en ligne', () => {
    expect(routeToHash({ name: 'join', code: 'K7M2QX' })).toBe('#/rejoindre/K7M2QX');
    expect(routeToHash({ name: 'onlineGame', game: 'chess', code: 'K7M2QX' })).toBe('#/echecs/en-ligne/K7M2QX');
    expect(parseRoute('#/rejoindre/k7m2qx')).toEqual({ name: 'join', code: 'K7M2QX' });
    expect(parseRoute('#/rejoindre/abc')).toEqual({ name: 'home' });
    expect(parseRoute('#/rejoindre')).toEqual({ name: 'home' });
    expect(parseRoute('#/dames/en-ligne/zz')).toEqual({ name: 'online', game: 'draughts' });
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
