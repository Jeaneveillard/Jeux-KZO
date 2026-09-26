import { describe, expect, it } from 'vitest';
import { detectDraughtsBlunder } from '../../../src/draughts/help/blunder';
import { draughtsHintReason, draughtsHintText, threatenedSquares } from '../../../src/draughts/help/hint';
import { decodeDraughtsMove, draughtsAdapter, parseDraughts } from '../../../src/draughts/rules';

const hint = (fen: string, id: string) => {
  const pos = parseDraughts(fen);
  return draughtsHintText(pos, decodeDraughtsMove(id, pos));
};

describe('indice aux dames', () => {
  it('annonce une victoire', () => {
    const pos = parseDraughts('W:WK46:BK28');
    expect(draughtsHintReason(pos, decodeDraughtsMove('46x23', pos))).toBe('win');
    expect(hint('W:WK46:BK28', '46x23')).toBe("Ce coup gagne la partie : l'adversaire ne pourra plus jouer !");
  });

  it('annonce une promotion', () => {
    expect(hint('W:W7:B45', '7-1')).toBe('Ton pion arrive au bout : il devient une dame.');
  });

  it('annonce une prise en comptant les pièces', () => {
    expect(hint('W:W32:B28,19,45', '32x23x14')).toBe('Ce coup prend 2 pièces adverses.');
    expect(hint('W:W32:B28,45', '32x23')).toBe('Ce coup prend une pièce adverse.');
  });

  it('annonce une pièce mise à l’abri', () => {
    expect([...threatenedSquares(parseDraughts('W:W32:B21,27').board, 'white')]).toEqual(['32']);
    expect(hint('W:W32:B21,27', '32-28')).toBe("Ce coup met ton pion à l'abri.");
  });

  it('sinon, dit simplement que c’est le meilleur coup', () => {
    expect(hint('W:W31-50:B1-20', '32-28')).toBe("C'est le meilleur coup selon l'ordinateur.");
  });
});

describe('alerte de gaffe aux dames', () => {
  const pos = parseDraughts('W:W33:B18,22');
  const move = decodeDraughtsMove('33-28', pos);

  it('nomme les pièces que l’ordinateur peut prendre', () => {
    expect(detectDraughtsBlunder(pos, move, { scoreCp: 0 }, { scoreCp: 250 })).toEqual({
      blunder: true,
      message: "Attention : après ce coup, l'ordinateur peut prendre une pièce (en 28).",
    });
  });

  it('ne dit rien pour une petite perte', () => {
    expect(detectDraughtsBlunder(pos, move, { scoreCp: 0 }, { scoreCp: 100 })).toEqual({ blunder: false });
  });

  it('prévient d’une victoire forcée pour l’ordinateur ou d’une victoire manquée', () => {
    expect(detectDraughtsBlunder(pos, move, { scoreCp: 0 }, { scoreCp: 99_997, mateIn: 2 })).toEqual({
      blunder: true,
      message: "Attention : après ce coup, l'ordinateur peut gagner la partie de force.",
    });
    expect(detectDraughtsBlunder(pos, move, { scoreCp: 99_999, mateIn: 1 }, { scoreCp: -50 })).toEqual({
      blunder: true,
      message: 'Attention : tu pouvais gagner la partie, et ce coup laisse passer l’occasion.',
    });
  });

  it('donne une explication générale sans prise immédiate', () => {
    const start = draughtsAdapter.initial();
    expect(detectDraughtsBlunder(start, decodeDraughtsMove('32-28', start), { scoreCp: 0 }, { scoreCp: 480 })).toEqual({
      blunder: true,
      message: "Attention : l'ordinateur voit que ce coup te fait perdre l'équivalent d'environ 5 pions.",
    });
  });

  it('ne prévient pas quand la partie est déjà perdue', () => {
    expect(detectDraughtsBlunder(pos, move, { scoreCp: -99_997, mateIn: -2 }, { scoreCp: 99_998, mateIn: 1 })).toEqual({ blunder: false });
  });
});
