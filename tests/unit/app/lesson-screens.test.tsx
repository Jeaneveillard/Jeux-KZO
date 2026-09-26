import { act, fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { chessKit } from '../../../src/app/games/chess';
import { LessonListScreen } from '../../../src/app/screens/LessonListScreen';
import { LessonScreen } from '../../../src/app/screens/LessonScreen';
import { CHESS_LESSONS, findChessLesson } from '../../../src/chess/lessons';

function tapSquare(container: Element, square: string): void {
  const rect = container.querySelector(`[data-square="${square}"]`) as Element;
  act(() => {
    rect.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
  });
  act(() => {
    rect.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
  });
}

describe('liste des leçons', () => {
  it('affiche les 17 leçons numérotées et la progression', () => {
    const onOpen = vi.fn();
    render(<LessonListScreen lessons={CHESS_LESSONS} progress={{ completed: ['plateau'] }} onOpen={onOpen} onBack={vi.fn()} />);
    expect(screen.getByText('1 / 17 leçons terminées')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^\d+\. / })).toHaveLength(17);
    expect(screen.getByRole('button', { name: /1\. Le plateau et le but du jeu/ }).textContent).toContain('✓');
    fireEvent.click(screen.getByRole('button', { name: /2\. La tour/ }));
    expect(onOpen).toHaveBeenCalledWith('tour');
  });
});

describe('écran de leçon', () => {
  it('explique, fait jouer l’exercice puis termine la leçon', () => {
    const onComplete = vi.fn();
    const lesson = findChessLesson('plateau');
    if (!lesson) throw new Error('leçon manquante');
    const { container } = render(
      <LessonScreen kit={chessKit} lesson={lesson} nextLesson={findChessLesson('tour')} sound={false} onComplete={onComplete} onOpen={vi.fn()} onBack={vi.fn()} />,
    );
    expect(screen.getByText(/L'échiquier a 64 cases/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
    expect(screen.getByText(/Amène la tour sur l'étoile/)).toBeTruthy();
    expect(container.querySelectorAll('.star')).toHaveLength(1);
    tapSquare(container, 'e1');
    tapSquare(container, 'e8');
    expect(screen.getByText('Bravo, exercice réussi !')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Terminer la leçon' }));
    expect(onComplete).toHaveBeenCalledWith('plateau');
    expect(screen.getByText('Leçon terminée ! 🎉')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Leçon suivante : La tour' })).toBeTruthy();
  });

  it('explique un mauvais coup puis permet de recommencer', () => {
    const lesson = findChessLesson('pion');
    if (!lesson) throw new Error('leçon manquante');
    const { container } = render(<LessonScreen kit={chessKit} lesson={lesson} sound={false} onComplete={vi.fn()} onOpen={vi.fn()} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
    tapSquare(container, 'e2');
    tapSquare(container, 'e4');
    tapSquare(container, 'e4');
    tapSquare(container, 'e5');
    fireEvent.click(screen.getByRole('button', { name: 'Exercice suivant' }));
    tapSquare(container, 'e3');
    tapSquare(container, 'e4');
    expect(screen.getByText('Le pion ne prend jamais tout droit : il prend en diagonale.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Recommencer' }));
    expect(screen.queryByText('Le pion ne prend jamais tout droit : il prend en diagonale.')).toBeNull();
  });
});
