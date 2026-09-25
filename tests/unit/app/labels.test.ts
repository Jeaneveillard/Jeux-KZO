import { describe, expect, it } from 'vitest';
import { LEVEL_LABELS, modeTitle } from '../../../src/app/labels';

describe('libellés', () => {
  it('décrit les trois niveaux', () => {
    expect(LEVEL_LABELS.faible.name).toBe('Faible');
    expect(LEVEL_LABELS.faible.description).toContain('aide');
    expect(LEVEL_LABELS.moyen.name).toBe('Moyen');
    expect(LEVEL_LABELS.expert.name).toBe('Expert');
  });

  it('titre l’écran de partie', () => {
    expect(modeTitle({ game: 'chess', mode: 'ai', level: 'expert', playerColor: 'white' })).toBe("Contre l'ordinateur · Expert");
    expect(modeTitle({ game: 'chess', mode: 'local', level: null, playerColor: 'white' })).toBe('2 joueurs');
  });
});
