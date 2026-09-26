import { describe, expect, it } from 'vitest';
import { explainWith, sideName, type ResultTexts } from '../../../src/core/explain';

const texts: ResultTexts = {
  win: (reason, view, loserSide) => `${reason}/${view}/${loserSide}`,
  draws: { repetition: 'Répétition.' },
};

describe('texte de fin de partie commun', () => {
  it('nomme les camps', () => {
    expect(sideName('white')).toBe('les Blancs');
    expect(sideName('black')).toBe('les Noirs');
  });

  it('donne le titre selon le point de vue', () => {
    const win = { kind: 'win', winner: 'white', reason: 'no-moves' } as const;
    expect(explainWith(texts, win, 'white')).toEqual({ title: 'Victoire !', detail: 'no-moves/winner/Les Noirs' });
    expect(explainWith(texts, win, 'black')).toEqual({ title: 'Défaite', detail: 'no-moves/loser/Les Noirs' });
    expect(explainWith(texts, win, null)).toEqual({ title: 'Les Blancs gagnent !', detail: 'no-moves/neutral/Les Noirs' });
  });

  it('explique un abandon pour tous les jeux', () => {
    const resign = { kind: 'win', winner: 'black', reason: 'resign' } as const;
    expect(explainWith(texts, resign, 'white').detail).toBe('Tu as abandonné la partie.');
    expect(explainWith(texts, resign, 'black').detail).toBe("L'adversaire a abandonné.");
    expect(explainWith(texts, resign, null).detail).toBe('Les Blancs ont abandonné.');
  });

  it('prend le texte de nulle du jeu, sinon un texte général', () => {
    expect(explainWith(texts, { kind: 'draw', reason: 'repetition' }, null)).toEqual({ title: 'Partie nulle', detail: 'Répétition.' });
    expect(explainWith(texts, { kind: 'draw', reason: 'king-moves' }, null).detail).toBe('Personne ne gagne.');
    expect(explainWith(texts, { kind: 'ongoing' }, null)).toEqual({ title: 'Partie en cours', detail: '' });
  });
});
