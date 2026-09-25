import { describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS, createStorage, detectBackend, type KeyValueBackend } from '../../../src/app/storage';

function memoryBackend(): KeyValueBackend {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

const brokenBackend: KeyValueBackend = {
  getItem: () => {
    throw new Error('refusé');
  },
  setItem: () => {
    throw new Error('plein');
  },
  removeItem: () => {
    throw new Error('refusé');
  },
};

const asNumber = (value: unknown) => (typeof value === 'number' ? value : null);

describe('stockage local', () => {
  it('écrit, relit et efface une valeur', () => {
    const storage = createStorage(memoryBackend());
    storage.write('cle', 42);
    expect(storage.read('cle', asNumber)).toBe(42);
    storage.remove('cle');
    expect(storage.read('cle', asNumber)).toBeNull();
    expect(storage.available).toBe(true);
  });

  it('rejette une valeur invalide ou illisible', () => {
    const backend = memoryBackend();
    backend.setItem('texte', '"bonjour"');
    backend.setItem('casse', '{pas du json');
    const storage = createStorage(backend);
    expect(storage.read('texte', asNumber)).toBeNull();
    expect(storage.read('casse', asNumber)).toBeNull();
  });

  it('ne plante jamais si le stockage refuse', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const storage = createStorage(brokenBackend);
    expect(() => storage.write('cle', 1)).not.toThrow();
    expect(storage.read('cle', asNumber)).toBeNull();
    expect(() => storage.remove('cle')).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('fonctionne sans stockage (navigation privée)', () => {
    const storage = createStorage(null);
    expect(storage.available).toBe(false);
    storage.write('cle', 1);
    expect(storage.read('cle', asNumber)).toBeNull();
    storage.remove('cle');
  });

  it('détecte le localStorage du navigateur', () => {
    expect(detectBackend()).toBe(window.localStorage);
    expect(STORAGE_KEYS.chessSavedGame).toBe('jeux.echecs.partie');
  });
});
