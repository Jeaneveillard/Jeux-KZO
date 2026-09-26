import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { GameMenuScreen } from '../../../src/app/screens/GameMenuScreen';
import { HomeScreen } from '../../../src/app/screens/HomeScreen';
import { SettingsScreen } from '../../../src/app/screens/SettingsScreen';

describe('accueil', () => {
  it('ouvre les échecs et les dames', () => {
    const onNavigate = vi.fn();
    render(<HomeScreen onNavigate={onNavigate} storageAvailable={false} />);
    expect(screen.getByText(/ne seront pas sauvegardées/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Échecs/ }));
    fireEvent.click(screen.getByRole('button', { name: /Dames/ }));
    expect(onNavigate.mock.calls.map(([route]) => route)).toEqual([
      { name: 'menu', game: 'chess' },
      { name: 'menu', game: 'draughts' },
    ]);
  });
});

describe('menu d’un jeu', () => {
  it('lance une partie contre l’ordinateur au niveau et à la couleur choisis', () => {
    const onNavigate = vi.fn();
    render(<GameMenuScreen game="chess" title="Échecs" onNavigate={onNavigate} hasSavedGame={false} completedCount={3} totalLessons={17} notice={null} />);
    expect(screen.getByRole('heading', { name: 'Échecs' })).toBeTruthy();
    expect(screen.getByText('3 / 17 leçons terminées')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reprendre la partie' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Expert' }));
    fireEvent.click(screen.getByRole('button', { name: 'Noirs' }));
    expect(screen.getByRole('button', { name: 'Expert' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Jouer' }));
    expect(onNavigate).toHaveBeenCalledWith({ name: 'play', setup: { game: 'chess', mode: 'ai', level: 'expert', playerColor: 'black' } });
  });

  it('propose de reprendre, d’apprendre et de jouer à deux', () => {
    const onNavigate = vi.fn();
    render(<GameMenuScreen game="draughts" title="Dames" onNavigate={onNavigate} hasSavedGame completedCount={0} totalLessons={12} notice="La partie précédente n'a pas pu être reprise." />);
    expect(screen.getByText("La partie précédente n'a pas pu être reprise.")).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre la partie' }));
    fireEvent.click(screen.getByRole('button', { name: /Apprendre à jouer/ }));
    fireEvent.click(screen.getByRole('button', { name: /2 joueurs sur ce téléphone/ }));
    expect(onNavigate.mock.calls.map(([route]) => route)).toEqual([
      { name: 'resume', game: 'draughts' },
      { name: 'lessons', game: 'draughts' },
      { name: 'play', setup: { game: 'draughts', mode: 'local', level: null, playerColor: 'white' } },
    ]);
  });
});

describe('réglages', () => {
  it('active ou coupe le son', () => {
    const onChange = vi.fn();
    render(<SettingsScreen settings={{ sound: true }} onChange={onChange} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sons' }));
    expect(onChange).toHaveBeenCalledWith({ sound: false });
    expect(screen.getByText(/Stockfish/)).toBeTruthy();
  });
});
