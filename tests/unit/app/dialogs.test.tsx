import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { CapturedRow } from '../../../src/app/components/CapturedRow';
import { ConfirmDialog } from '../../../src/app/components/ConfirmDialog';
import { EndDialog } from '../../../src/app/components/EndDialog';

describe('boîtes de dialogue', () => {
  it('ConfirmDialog renvoie le choix', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog title="Attention !" message="Ta dame est en prise." confirmLabel="Jouer quand même" cancelLabel="Choisir un autre coup" onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByRole('dialog', { name: 'Attention !' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Choisir un autre coup' }));
    fireEvent.click(screen.getByRole('button', { name: 'Jouer quand même' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('EndDialog propose de rejouer, revoir le plateau, annuler et revenir au menu', () => {
    const handlers = { onReplay: vi.fn(), onMenu: vi.fn(), onClose: vi.fn(), onUndo: vi.fn() };
    render(<EndDialog result={{ title: 'Défaite', detail: 'Échec et mat.' }} {...handlers} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rejouer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Annuler mon dernier coup' }));
    fireEvent.click(screen.getByRole('button', { name: 'Voir le plateau' }));
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    Object.values(handlers).forEach((handler) => expect(handler).toHaveBeenCalledTimes(1));
  });

  it('EndDialog masque l’annulation si elle est impossible', () => {
    render(<EndDialog result={{ title: 'Victoire !', detail: '' }} onReplay={vi.fn()} onMenu={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Annuler mon dernier coup' })).toBeNull();
  });

  it('CapturedRow affiche les pièces prises', () => {
    render(<CapturedRow color="black" pieces={['q', 'p']} />);
    expect(screen.getByAltText('Dame noire')).toBeTruthy();
    expect(screen.getByAltText('Pion noir')).toBeTruthy();
  });
});
