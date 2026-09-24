import { act, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { Board, type BoardPiece } from '../../../src/board/Board';
import { chessGeometry } from '../../../src/board/geometry';

const white = chessGeometry('white');
const pawn: BoardPiece = { square: 'e2', image: 'wP.svg', label: 'Pion blanc' };
const knight: BoardPiece = { square: 'd3', image: 'wN.svg', label: 'Cavalier blanc' };

// Événement de pointeur avec coordonnées (compatible jsdom).
function pointer(target: Element, type: string, x = 0, y = 0): void {
  act(() => {
    target.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
  });
}

describe('Board', () => {
  it('dessine 64 cases, a8 en haut à gauche pour les Blancs', () => {
    const { container } = render(<Board geometry={white} pieces={[]} />);
    const squares = container.querySelectorAll('rect[data-square]');
    expect(squares).toHaveLength(64);
    expect(squares[0].getAttribute('data-square')).toBe('a8');
  });

  it('commence par h1 quand le plateau est vu des Noirs', () => {
    const { container } = render(<Board geometry={chessGeometry('black')} pieces={[]} />);
    expect(container.querySelector('rect[data-square]')?.getAttribute('data-square')).toBe('h1');
  });

  it('affiche les pièces avec un libellé accessible', () => {
    render(<Board geometry={white} pieces={[pawn]} />);
    expect(screen.getByLabelText('Pion blanc').getAttribute('data-piece')).toBe('e2');
  });

  it('signale le toucher d’une case', () => {
    const onTap = vi.fn();
    const { container } = render(<Board geometry={white} pieces={[]} onSquareTap={onTap} />);
    const square = container.querySelector('[data-square="e4"]') as Element;
    pointer(square, 'pointerdown');
    pointer(square, 'pointerup');
    expect(onTap).toHaveBeenCalledWith('e4');
  });

  it('dessine points, anneaux, étoiles, flèche et surlignages', () => {
    const { container } = render(
      <Board
        geometry={white}
        pieces={[pawn, knight]}
        targets={['e3', 'd3']}
        stars={['a1', 'b2']}
        arrows={[{ from: 'e2', to: 'e4' }]}
        highlights={['e7', 'e5']}
        selected="e2"
        check="e1"
        animate={{ from: 'e2', to: 'd3' }}
      />,
    );
    expect(container.querySelectorAll('.target-dot')).toHaveLength(1);
    expect(container.querySelectorAll('.target-ring')).toHaveLength(1);
    expect(container.querySelectorAll('.star')).toHaveLength(2);
    expect(container.querySelectorAll('line.arrow')).toHaveLength(1);
    expect(container.querySelectorAll('polygon.arrow-head')).toHaveLength(1);
    expect(container.querySelectorAll('.hl-last')).toHaveLength(2);
    expect(container.querySelectorAll('.hl-selected')).toHaveLength(1);
    expect(container.querySelectorAll('.check')).toHaveLength(1);
    expect(container.querySelector('[data-piece="d3"]')?.getAttribute('class')).toBe('piece-move');
  });

  it('déplace une pièce par glisser-déposer', () => {
    const onDrop = vi.fn();
    const onTap = vi.fn();
    const { container } = render(
      <Board geometry={white} pieces={[pawn]} onDrop={onDrop} onSquareTap={onTap} canDrag={(sq) => sq === 'e2'} />,
    );
    const svg = container.querySelector('svg') as SVGSVGElement;
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 800, right: 800, bottom: 800, x: 0, y: 0, toJSON: () => ({}) });
    pointer(svg, 'pointerdown', 450, 650);
    pointer(svg, 'pointermove', 450, 450);
    pointer(svg, 'pointerup', 450, 450);
    expect(onDrop).toHaveBeenCalledWith('e2', 'e4');
    expect(onTap).not.toHaveBeenCalled();
  });
});
