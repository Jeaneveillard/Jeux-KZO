import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { PromotionPicker } from '../../../src/app/components/PromotionPicker';
import type { ChessMove } from '../../../src/chess/types';

const choices: ChessMove[] = ['n', 'b', 'r', 'q'].map((p) => ({ from: 'e7', to: 'e8', promotion: p as ChessMove['promotion'] }));

describe('PromotionPicker', () => {
  it('propose dame, tour, fou, cavalier dans cet ordre', () => {
    render(<PromotionPicker color="white" choices={choices} onPick={vi.fn()} onCancel={vi.fn()} />);
    const labels = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent);
    expect(labels).toEqual(['Dame blanche', 'Tour blanche', 'Fou blanc', 'Cavalier blanc', 'Annuler']);
  });

  it('renvoie le coup choisi ou lannulation', () => {
    const onPick = vi.fn();
    const onCancel = vi.fn();
    render(<PromotionPicker color="white" choices={choices} onPick={onPick} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dame blanche' }));
    expect(onPick).toHaveBeenCalledWith({ from: 'e7', to: 'e8', promotion: 'q' });
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
