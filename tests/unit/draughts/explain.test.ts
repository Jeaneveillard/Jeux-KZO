import { describe, expect, it } from 'vitest';
import { explainDraughtsResult } from '../../../src/draughts/explain';

describe('fin de partie aux dames', () => {
  it('explique une victoire selon le point de vue', () => {
    const win = { kind: 'win', winner: 'white', reason: 'no-moves' } as const;
    expect(explainDraughtsResult(win, 'white')).toEqual({ title: 'Victoire !', detail: "L'adversaire ne peut plus jouer : toutes ses pièces sont prises ou bloquées." });
    expect(explainDraughtsResult(win, 'black').detail).toBe('Tu ne peux plus jouer : toutes tes pièces sont prises ou bloquées.');
    expect(explainDraughtsResult(win, null)).toEqual({ title: 'Les Blancs gagnent !', detail: 'Les Noirs ne peuvent plus jouer : toutes leurs pièces sont prises ou bloquées.' });
  });

  it('explique chaque nulle', () => {
    expect(explainDraughtsResult({ kind: 'draw', reason: 'repetition' }, null).detail).toBe('La même position est revenue trois fois : personne ne gagne.');
    expect(explainDraughtsResult({ kind: 'draw', reason: 'king-moves' }, null).detail).toBe('25 coups de suite avec seulement des dames, sans prise ni pion joué : personne ne gagne.');
    expect(explainDraughtsResult({ kind: 'draw', reason: 'endgame-limit' }, 'white')).toEqual({
      title: 'Partie nulle',
      detail: 'Il reste trop peu de pièces pour gagner dans le nombre de coups permis : personne ne gagne.',
    });
  });
});
