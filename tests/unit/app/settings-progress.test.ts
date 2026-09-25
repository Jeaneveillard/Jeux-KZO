import { describe, expect, it } from 'vitest';
import { EMPTY_PROGRESS, isCompleted, markCompleted, validateProgress } from '../../../src/app/progress';
import { DEFAULT_SETTINGS, validateSettings } from '../../../src/app/settings';

describe('réglages', () => {
  it('active le son par défaut', () => {
    expect(DEFAULT_SETTINGS).toEqual({ sound: true });
  });

  it('valide les réglages enregistrés', () => {
    expect(validateSettings({ sound: false })).toEqual({ sound: false });
    expect(validateSettings({ sound: 'oui' })).toBeNull();
    expect(validateSettings(null)).toBeNull();
  });
});

describe('progression des leçons', () => {
  it('marque une leçon terminée sans doublon ni mutation', () => {
    const once = markCompleted(EMPTY_PROGRESS, 'tour');
    const twice = markCompleted(once, 'tour');
    expect(once).toEqual({ completed: ['tour'] });
    expect(twice).toBe(once);
    expect(EMPTY_PROGRESS.completed).toEqual([]);
    expect(isCompleted(once, 'tour')).toBe(true);
    expect(isCompleted(once, 'fou')).toBe(false);
  });

  it('valide la progression enregistrée', () => {
    expect(validateProgress({ completed: ['tour', 'fou'] })).toEqual({ completed: ['tour', 'fou'] });
    expect(validateProgress({ completed: [1] })).toBeNull();
    expect(validateProgress({ completed: 'tour' })).toBeNull();
    expect(validateProgress(undefined)).toBeNull();
  });
});
