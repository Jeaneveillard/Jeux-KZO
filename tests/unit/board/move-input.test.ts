import { describe, expect, it } from 'vitest';
import { EMPTY_INPUT, dropPiece, tapSquare, targetsOf } from '../../../src/board/move-input';
import { chessAdapter, legalMoves, parseChess } from '../../../src/chess/adapter';

const start = legalMoves(chessAdapter.initial());

describe('saisie des coups', () => {
  it('sélectionne une pièce qui peut bouger et liste ses cases', () => {
    const result = tapSquare(EMPTY_INPUT, 'g1', start);
    expect(result.state.selected).toBe('g1');
    expect(result.move).toBeNull();
    expect(targetsOf('g1', start).sort()).toEqual(['f3', 'h3']);
    expect(targetsOf(null, start)).toEqual([]);
  });

  it('ignore une case sans pièce jouable', () => {
    expect(tapSquare(EMPTY_INPUT, 'e4', start).state.selected).toBeNull();
    expect(tapSquare(EMPTY_INPUT, 'e7', start).state.selected).toBeNull();
  });

  it('joue le coup quand on touche une case d’arrivée', () => {
    const result = tapSquare({ selected: 'e2' }, 'e4', start);
    expect(result.move).toEqual({ from: 'e2', to: 'e4' });
    expect(result.state).toEqual(EMPTY_INPUT);
  });

  it('désélectionne en touchant la même pièce', () => {
    expect(tapSquare({ selected: 'e2' }, 'e2', start).state).toEqual(EMPTY_INPUT);
  });

  it('change de pièce sélectionnée', () => {
    expect(tapSquare({ selected: 'e2' }, 'd2', start).state.selected).toBe('d2');
  });

  it('propose un choix quand plusieurs coups vont sur la même case (promotion)', () => {
    const promo = legalMoves(parseChess('8/4P3/8/8/8/2k5/8/4K3 w - - 0 1'));
    const result = tapSquare({ selected: 'e7' }, 'e8', promo);
    expect(result.move).toBeNull();
    expect(result.choices).toHaveLength(4);
    expect(result.state.selected).toBe('e7');
  });

  it('accepte un glisser-déposer', () => {
    expect(dropPiece('g1', 'f3', start).move).toEqual({ from: 'g1', to: 'f3' });
    expect(dropPiece('g1', 'g3', start).move).toBeNull();
  });

  it('renvoie des choix de promotion pour un glisser-déposer', () => {
    const promoMoves = legalMoves(parseChess('8/4P3/8/8/8/2k5/8/4K3 w - - 0 1'));
    const result = dropPiece('e7', 'e8', promoMoves);
    expect(result.move).toBeNull();
    expect(result.choices).toHaveLength(4);
  });
});
