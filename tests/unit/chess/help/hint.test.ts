import { describe, expect, it } from 'vitest';
import { chessAdapter, parseChess } from '../../../../src/chess/adapter';
import { hintReason, hintText } from '../../../../src/chess/help/hint';

describe('indice', () => {
  it('annonce un mat', () => {
    const pos = parseChess('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
    expect(hintReason(pos, { from: 'a1', to: 'a8' })).toBe('mate');
    expect(hintText(pos, { from: 'a1', to: 'a8' })).toBe('Ce coup fait échec et mat !');
  });

  it('annonce une promotion', () => {
    const pos = parseChess('8/4P3/8/8/8/2k5/8/4K3 w - - 0 1');
    expect(hintText(pos, { from: 'e7', to: 'e8', promotion: 'q' })).toBe('Ton pion arrive au bout : il se transforme en dame.');
  });

  it('annonce une prise en nommant la pièce', () => {
    const pos = parseChess('r3k3/8/8/8/8/8/1p6/Q3K3 w - - 0 1');
    expect(hintReason(pos, { from: 'a1', to: 'a8' })).toBe('capture');
    expect(hintText(pos, { from: 'a1', to: 'a8' })).toBe('Ce coup prend la tour adverse.');
  });

  it('annonce un échec', () => {
    const pos = parseChess('rnbqkbnr/ppppp1pp/8/5p2/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
    expect(hintText(pos, { from: 'd1', to: 'h5' })).toBe('Ce coup met le roi adverse en échec.');
  });

  it('annonce une pièce mise à l’abri', () => {
    const pos = parseChess('4k3/8/8/8/3p4/2N5/8/4K3 w - - 0 1');
    expect(hintReason(pos, { from: 'c3', to: 'b5' })).toBe('escape');
    expect(hintText(pos, { from: 'c3', to: 'b5' })).toBe("Ce coup met ton cavalier à l'abri.");
  });

  it('sinon, dit simplement que c’est le meilleur coup', () => {
    expect(hintText(chessAdapter.initial(), { from: 'e2', to: 'e4' })).toBe("C'est le meilleur coup selon l'ordinateur.");
  });
});
