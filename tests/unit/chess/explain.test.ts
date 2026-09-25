import { describe, expect, it } from 'vitest';
import { explainResult } from '../../../src/chess/explain';

describe('explication du résultat', () => {
  it('explique un mat au perdant et au gagnant', () => {
    const mate = { kind: 'win', winner: 'black', reason: 'checkmate' } as const;
    expect(explainResult(mate, 'white')).toEqual({ title: 'Défaite', detail: "Échec et mat : ton roi est attaqué et ne peut plus s'échapper." });
    expect(explainResult(mate, 'black')).toEqual({ title: 'Victoire !', detail: "Échec et mat ! Le roi adverse est attaqué et ne peut plus s'échapper." });
    expect(explainResult(mate, null)).toEqual({ title: 'Les Noirs gagnent !', detail: "Échec et mat : le roi est attaqué et ne peut plus s'échapper." });
  });

  it('explique un abandon', () => {
    const resign = { kind: 'win', winner: 'white', reason: 'resign' } as const;
    expect(explainResult(resign, 'black').detail).toBe('Tu as abandonné la partie.');
    expect(explainResult(resign, 'white').detail).toBe("L'adversaire a abandonné.");
    expect(explainResult(resign, null).detail).toBe('Les Noirs ont abandonné.');
  });

  it('explique l’absence de coup possible', () => {
    const blocked = { kind: 'win', winner: 'white', reason: 'no-moves' } as const;
    expect(explainResult(blocked, 'black').detail).toBe("Tu n'as plus aucun coup possible.");
    expect(explainResult(blocked, 'white').detail).toBe("L'adversaire n'a plus aucun coup possible.");
    expect(explainResult(blocked, null).detail).toBe("Les Noirs n'ont plus aucun coup possible.");
  });

  it('explique chaque partie nulle', () => {
    expect(explainResult({ kind: 'draw', reason: 'stalemate' }, 'white')).toEqual({
      title: 'Partie nulle',
      detail: "Pat : le joueur qui doit jouer n'a aucun coup possible, mais son roi n'est pas en échec. Personne ne gagne.",
    });
    expect(explainResult({ kind: 'draw', reason: 'repetition' }, null).detail).toBe('La même position est revenue trois fois : personne ne gagne.');
    expect(explainResult({ kind: 'draw', reason: 'fifty-moves' }, null).detail).toBe('50 coups de chaque côté sans prise ni mouvement de pion : personne ne gagne.');
    expect(explainResult({ kind: 'draw', reason: 'insufficient-material' }, null).detail).toBe('Il ne reste pas assez de pièces pour faire échec et mat : personne ne gagne.');
  });

  it('indique une partie en cours', () => {
    expect(explainResult({ kind: 'ongoing' }, null)).toEqual({ title: 'Partie en cours', detail: '' });
  });
});
