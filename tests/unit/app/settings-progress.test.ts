import { describe, expect, it } from 'vitest';
import { EMPTY_PROGRESS, isCompleted, markCompleted, validateProgress } from '../../../src/app/progress';
import { DEFAULT_SETTINGS, cleanPseudo, validateSettings } from '../../../src/app/settings';

describe('réglages', () => {
  it('active le son par défaut, sans pseudo', () => {
    expect(DEFAULT_SETTINGS).toEqual({ sound: true, pseudo: null });
  });

  it('valide les réglages enregistrés, même anciens (sans pseudo)', () => {
    expect(validateSettings({ sound: false })).toEqual({ sound: false, pseudo: null });
    expect(validateSettings({ sound: true, pseudo: '  Marie ' })).toEqual({ sound: true, pseudo: 'Marie' });
    expect(validateSettings({ sound: true, pseudo: 'x'.repeat(21) })).toEqual({ sound: true, pseudo: null });
    expect(validateSettings({ sound: 'oui' })).toBeNull();
    expect(validateSettings(null)).toBeNull();
  });

  it('nettoie un pseudo', () => {
    expect(cleanPseudo(' Bob ')).toBe('Bob');
    expect(cleanPseudo('   ')).toBeNull();
    expect(cleanPseudo('x'.repeat(20))).toHaveLength(20);
    expect(cleanPseudo(42)).toBeNull();
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
