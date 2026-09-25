import { describe, expect, it } from 'vitest';
import { ANALYSIS_OPTIONS, BLUNDER_DEPTH, HINT_DEPTH, LEVELS } from '../../../../src/chess/engine/levels';

describe('niveaux de l’IA', () => {
  it('Faible : recherche courte avec 4 variantes', () => {
    expect(LEVELS.faible.go).toBe('go depth 5');
    expect(LEVELS.faible.options).toMatchObject({ MultiPV: 4, UCI_LimitStrength: false });
    expect(LEVELS.faible.minDelayMs).toBe(600);
  });

  it('Moyen : force limitée à 1600 Elo, environ 1 seconde', () => {
    expect(LEVELS.moyen.go).toBe('go movetime 1000');
    expect(LEVELS.moyen.options).toMatchObject({ MultiPV: 1, UCI_LimitStrength: true, UCI_Elo: 1600 });
    expect(LEVELS.moyen.minDelayMs).toBe(600);
  });

  it('Expert : pleine puissance, 3 secondes', () => {
    expect(LEVELS.expert.go).toBe('go movetime 3000');
    expect(LEVELS.expert.options).toMatchObject({ MultiPV: 1, UCI_LimitStrength: false, 'Skill Level': 20 });
    expect(LEVELS.expert.timeoutMs).toBe(8000);
  });

  it('analyse à pleine puissance pour l’aide', () => {
    expect(ANALYSIS_OPTIONS).toMatchObject({ MultiPV: 1, UCI_LimitStrength: false });
    expect(HINT_DEPTH).toBe(12);
    expect(BLUNDER_DEPTH).toBe(10);
  });
});
