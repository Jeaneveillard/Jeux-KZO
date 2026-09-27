import { describe, expect, it } from 'vitest';
import { parseGameRow, parseResult } from '../../../src/online/rows';
import { onlineGame, row } from './fixtures';

describe('lignes reçues du serveur', () => {
  it('traduit une ligne valide', () => {
    expect(parseGameRow(row({ coups: ['e2e4'] }))).toEqual(onlineGame({ moves: ['e2e4'] }));
  });

  it('accepte une partie en attente et une partie terminée', () => {
    expect(parseGameRow(row({ noirs: null, pseudo_noirs: null, statut: 'attente' }))?.black).toEqual({ id: null, pseudo: null });
    const finished = parseGameRow(row({ statut: 'terminee', resultat: { kind: 'draw', reason: 'agreement' }, revanche_code: 'ABCDEF' }));
    expect(finished?.result).toEqual({ kind: 'draw', reason: 'agreement' });
    expect(finished?.rematchCode).toBe('ABCDEF');
    expect(parseGameRow(row({ nulle_proposee_par: 'black' }))?.drawOfferedBy).toBe('black');
  });

  it.each([
    ['pas un objet', 'x'],
    ['code invalide', row({ code: 'k7m2qx' })],
    ['jeu inconnu', row({ jeu: 'go' })],
    ['coups mal formés', row({ coups: [1] })],
    ['statut inconnu', row({ statut: 'fini' })],
    ['résultat inventé', row({ statut: 'terminee', resultat: { kind: 'win', winner: 'rouge', reason: 'resign' } })],
    ['partie terminée sans résultat', row({ statut: 'terminee' })],
    ['nulle proposée par un inconnu', row({ nulle_proposee_par: 'rouge' })],
    ['joueur mal formé', row({ blancs: 42 })],
  ])('refuse une ligne : %s', (_, value) => {
    expect(parseGameRow(value)).toBeNull();
  });

  it('lit les résultats', () => {
    expect(parseResult({ kind: 'win', winner: 'white', reason: 'resign' })).toEqual({ kind: 'win', winner: 'white', reason: 'resign' });
    expect(parseResult({ kind: 'draw', reason: 'king-moves' })).toEqual({ kind: 'draw', reason: 'king-moves' });
    expect(parseResult({ kind: 'draw', reason: 'pluie' })).toBeNull();
    expect(parseResult(null)).toBeNull();
  });
});
