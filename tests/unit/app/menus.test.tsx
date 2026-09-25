import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { ChessMenuScreen } from '../../../src/app/screens/ChessMenuScreen';
import { HomeScreen } from '../../../src/app/screens/HomeScreen';
import { SettingsScreen } from '../../../src/app/screens/SettingsScreen';

describe('accueil', () => {
  it('ouvre les échecs et annonce les dames pour bientôt', () => {
    const onNavigate = vi.fn();
    render(<HomeScreen onNavigate={onNavigate} storageAvailable={false} />);
    expect(screen.getByText(/ne seront pas sauvegardées/)).toBeTruthy();
    expect((screen.getByRole('button', { name: /Dames/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Échecs/ }));
    expect(onNavigate).toHaveBeenCalledWith({ name: 'chess-menu' });
  });
});

describe('menu des échecs', () => {
  it('lance une partie contre l’ordinateur au niveau et à la couleur choisis', () => {
    const onNavigate = vi.fn();
    render(<ChessMenuScreen onNavigate={onNavigate} hasSavedGame={false} completedCount={3} totalLessons={17} notice={null} />);
    expect(screen.getByText('3 / 17 leçons terminées')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reprendre la partie' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Expert' }));
    fireEvent.click(screen.getByRole('button', { name: 'Noirs' }));
    expect(screen.getByRole('button', { name: 'Expert' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Jouer' }));
    expect(onNavigate).toHaveBeenCalledWith({ name: 'chess-play', setup: { game: 'chess', mode: 'ai', level: 'expert', playerColor: 'black' } });
  });

  it('propose de reprendre, d’apprendre et de jouer à deux', () => {
    const onNavigate = vi.fn();
    render(<ChessMenuScreen onNavigate={onNavigate} hasSavedGame completedCount={0} totalLessons={17} notice="La partie précédente n'a pas pu être reprise." />);
    expect(screen.getByText("La partie précédente n'a pas pu être reprise.")).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre la partie' }));
    fireEvent.click(screen.getByRole('button', { name: /Apprendre à jouer/ }));
    fireEvent.click(screen.getByRole('button', { name: /2 joueurs sur ce téléphone/ }));
    expect(onNavigate.mock.calls.map(([route]) => route.name)).toEqual(['chess-resume', 'chess-lessons', 'chess-play']);
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
