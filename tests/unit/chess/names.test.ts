import { describe, expect, it } from 'vitest';
import { PIECE_VALUES, isFeminine, pieceLabel, pieceName, sideName, withArticle, withPossessive } from '../../../src/chess/names';
import { pieceImage } from '../../../src/chess/pieces';

describe('noms des pièces', () => {
  it('accorde articles et possessifs', () => {
    expect(pieceName('n')).toBe('cavalier');
    expect(isFeminine('q')).toBe(true);
    expect(withArticle('r')).toBe('la tour');
    expect(withArticle('p')).toBe('le pion');
    expect(withPossessive('q')).toBe('ta dame');
    expect(withPossessive('b')).toBe('ton fou');
  });

  it('donne un libellé accessible accordé en genre', () => {
    expect(pieceLabel('white', 'n')).toBe('Cavalier blanc');
    expect(pieceLabel('black', 'q')).toBe('Dame noire');
    expect(pieceLabel('white', 'r')).toBe('Tour blanche');
  });

  it('nomme les camps et connaît la valeur des pièces', () => {
    expect(sideName('white')).toBe('les Blancs');
    expect(sideName('black')).toBe('les Noirs');
    expect(PIECE_VALUES.q).toBe(9);
    expect(PIECE_VALUES.p).toBe(1);
  });

  it("fournit l'image de chaque pièce", () => {
    expect(pieceImage('white', 'n')).toContain('wN');
    expect(pieceImage('black', 'k')).toContain('bK');
  });
});
