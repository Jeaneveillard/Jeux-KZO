import { logWarning } from './log';

export interface KeyValueBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface AppStorage {
  readonly available: boolean;
  read<T>(key: string, validate: (value: unknown) => T | null): T | null;
  write(key: string, value: unknown): void;
  remove(key: string): void;
}

export const STORAGE_KEYS = {
  settings: 'jeux.reglages',
  chessProgress: 'jeux.echecs.progression',
  chessSavedGame: 'jeux.echecs.partie',
  draughtsProgress: 'jeux.dames.progression',
  draughtsSavedGame: 'jeux.dames.partie',
} as const;

/** Renvoie le localStorage s'il accepte d'écrire, sinon null (navigation privée, stockage bloqué). */
export function detectBackend(): KeyValueBackend | null {
  try {
    const probe = '__jeux_test__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch (error) {
    logWarning('[stockage] indisponible', error);
    return null;
  }
}

export function createStorage(backend: KeyValueBackend | null): AppStorage {
  return {
    available: backend !== null,
    read<T>(key: string, validate: (value: unknown) => T | null): T | null {
      if (!backend) return null;
      try {
        const raw = backend.getItem(key);
        return raw === null ? null : validate(JSON.parse(raw));
      } catch (error) {
        logWarning(`[stockage] lecture impossible : ${key}`, error);
        return null;
      }
    },
    write(key: string, value: unknown): void {
      if (!backend) return;
      try {
        backend.setItem(key, JSON.stringify(value));
      } catch (error) {
        logWarning(`[stockage] écriture impossible : ${key}`, error);
      }
    },
    remove(key: string): void {
      if (!backend) return;
      try {
        backend.removeItem(key);
      } catch (error) {
        logWarning(`[stockage] suppression impossible : ${key}`, error);
      }
    },
  };
}
