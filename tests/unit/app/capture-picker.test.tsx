import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { CapturePicker } from '../../../src/app/components/CapturePicker';
import type { DraughtsMove } from '../../../src/draughts/types';

const choices: DraughtsMove[] = [
  { from: '5', to: '37', steps: ['23', '37'], captures: ['19', '32'], promotes: false },
  { from: '5', to: '37', steps: ['28', '37'], captures: ['19', '33'], promotes: false },
];

describe('CapturePicker', () => {
  it('propose chaque rafle et renvoie le choix', () => {
    const onPick = vi.fn();
    const onCancel = vi.fn();
    render(<CapturePicker color="white" choices={choices} onPick={onPick} onCancel={onCancel} />);
    expect(screen.getByRole('dialog', { name: 'Quelle rafle ?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Prendre en 19, 33' }));
    expect(onPick).toHaveBeenCalledWith(choices[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
