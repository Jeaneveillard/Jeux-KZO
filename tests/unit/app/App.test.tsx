import { render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../../../src/app/App';

describe('App', () => {
  it("affiche le titre de l'application", () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Échecs & Dames' })).toBeTruthy();
  });

  it('affiche le menu des échecs à l’adresse #/echecs', () => {
    window.location.hash = '#/echecs';
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Échecs' })).toBeTruthy();
  });

  it('affiche la liste des leçons', () => {
    window.location.hash = '#/echecs/lecons';
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Apprendre à jouer' })).toBeTruthy();
  });

  it('démarre une partie à deux joueurs', () => {
    window.location.hash = '#/echecs/partie/deux-joueurs';
    render(<App />);
    expect(screen.getByRole('heading', { name: '2 joueurs' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Au tour des Blancs');
  });
});
