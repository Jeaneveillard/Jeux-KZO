import { render } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { Board } from '../../../src/board/Board';
import { draughtsGeometry } from '../../../src/draughts/geometry';

describe('plateau numéroté', () => {
  it('affiche le numéro des 50 cases foncées', () => {
    const { container } = render(<Board geometry={draughtsGeometry('white')} pieces={[]} />);
    const numbers = [...container.querySelectorAll('.sq-num')].map((node) => node.textContent);
    expect(numbers).toHaveLength(50);
    expect(numbers).toContain('46');
    expect(container.querySelectorAll('rect[data-square]')).toHaveLength(50);
  });
});
