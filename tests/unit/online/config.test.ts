import { describe, expect, it } from 'vitest';
import { readConfig } from '../../../src/online/config';

describe('configuration du jeu en ligne', () => {
  it('lit l’adresse et la clé publique du projet', () => {
    expect(readConfig({ VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x' })).toEqual({
      url: 'https://abc.supabase.co',
      key: 'sb_publishable_x',
    });
  });

  it('refuse une configuration absente ou douteuse', () => {
    expect(readConfig({})).toBeNull();
    expect(readConfig({ VITE_SUPABASE_URL: 'http://abc.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'k' })).toBeNull();
    expect(readConfig({ VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: '' })).toBeNull();
  });
});
