import { render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../../../src/app/App';

describe('App', () => {
  it("affiche le titre de l'application", () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Échecs & Dames' })).toBeTruthy();
  });
});
