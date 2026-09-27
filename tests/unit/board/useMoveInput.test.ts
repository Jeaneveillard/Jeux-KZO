import { act, renderHook } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { useMoveInput } from '../../../src/board/useMoveInput';

const legal = [
  { from: 'e7', to: 'e8', promotion: 'q' },
  { from: 'e7', to: 'e8', promotion: 'n' },
  { from: 'a2', to: 'a3' },
];

describe('saisie d’un coup', () => {
  it('joue un coup en deux touchers', () => {
    const onMove = vi.fn();
    const { result } = renderHook(() => useMoveInput(legal, onMove));
    act(() => result.current.tap('a2'));
    expect(result.current.input.selected).toBe('a2');
    act(() => result.current.tap('a3'));
    expect(onMove).toHaveBeenCalledWith({ from: 'a2', to: 'a3' });
    expect(result.current.input.selected).toBeNull();
  });

  it('demande de choisir entre plusieurs coups du même trajet', () => {
    const onMove = vi.fn();
    const { result } = renderHook(() => useMoveInput(legal, onMove));
    act(() => result.current.drop('e7', 'e8'));
    expect(result.current.choices).toHaveLength(2);
    act(() => result.current.tap('a2'));
    expect(onMove).not.toHaveBeenCalled();
    act(() => result.current.choose(legal[1]));
    expect(onMove).toHaveBeenCalledWith(legal[1]);
    expect(result.current.choices).toBeNull();
    act(() => result.current.drop('e7', 'e8'));
    act(() => result.current.cancelChoice());
    expect(result.current.choices).toBeNull();
    expect(result.current.input.selected).toBeNull();
  });
});
