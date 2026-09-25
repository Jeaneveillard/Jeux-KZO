import { describe, expect, it } from 'vitest';
import { chessAdapter, parseChess } from '../../../../src/chess/adapter';
import { detectBlunder } from '../../../../src/chess/help/blunder';

describe('alerte de gaffe', () => {
  it('explique une dame laissée en prise gratuitement', () => {
    const pos = parseChess('4k3/8/8/3p4/8/3Q4/8/4K3 w - - 0 1');
    const verdict = detectBlunder(pos, { from: 'd3', to: 'c4' }, { scoreCp: 900 }, { scoreCp: 100 });
    expect(verdict).toEqual({
      blunder: true,
      message: 'Attention : après ce coup, ta dame en c4 peut être prise gratuitement par le pion en d5.',
    });
  });

  it('explique une pièce défendue mais attaquée par une pièce moins chère', () => {
    const pos = parseChess('4k3/8/8/3p4/8/1P6/8/2R1K3 w - - 0 1');
    const verdict = detectBlunder(pos, { from: 'c1', to: 'c4' }, { scoreCp: 500 }, { scoreCp: -100 });
    expect(verdict).toEqual({
      blunder: true,
      message: 'Attention : après ce coup, ta tour en c4 peut être prise par le pion en d5.',
    });
  });

  it('ne dit rien pour une petite perte', () => {
    const verdict = detectBlunder(chessAdapter.initial(), { from: 'a2', to: 'a3' }, { scoreCp: 20 }, { scoreCp: 30 });
    expect(verdict).toEqual({ blunder: false });
  });

  it('prévient d’un mat possible pour l’ordinateur', () => {
    const verdict = detectBlunder(chessAdapter.initial(), { from: 'f2', to: 'f3' }, { scoreCp: 20 }, { scoreCp: 99_998, mateIn: 2 });
    expect(verdict).toEqual({ blunder: true, message: "Attention : après ce coup, l'ordinateur peut faire échec et mat en 2 coups." });
  });

  it('prévient quand on laisse passer un mat', () => {
    const verdict = detectBlunder(chessAdapter.initial(), { from: 'a2', to: 'a3' }, { scoreCp: 99_999, mateIn: 1 }, { scoreCp: -300 });
    expect(verdict).toEqual({ blunder: true, message: 'Attention : tu pouvais faire échec et mat, et ce coup laisse passer l’occasion.' });
  });

  it('donne une explication générale quand aucune pièce n’est en prise', () => {
    const verdict = detectBlunder(chessAdapter.initial(), { from: 'e2', to: 'e4' }, { scoreCp: 0 }, { scoreCp: 480 });
    expect(verdict).toEqual({
      blunder: true,
      message: "Attention : l'ordinateur voit que ce coup te fait perdre l'équivalent d'environ 5 pions.",
    });
  });

  it('ne prévient pas quand la partie est déjà perdue', () => {
    const verdict = detectBlunder(chessAdapter.initial(), { from: 'a2', to: 'a3' }, { scoreCp: -99_997, mateIn: -3 }, { scoreCp: 99_998, mateIn: 2 });
    expect(verdict).toEqual({ blunder: false });
  });
});
