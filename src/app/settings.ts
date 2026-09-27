import { isRecord } from '../core/guards';

export const PSEUDO_MAX_LENGTH = 20;

export interface Settings {
  readonly sound: boolean;
  /** Pseudo du jeu en ligne ; null tant qu'il n'a pas été choisi. */
  readonly pseudo: string | null;
}

export const DEFAULT_SETTINGS: Settings = { sound: true, pseudo: null };

/** Pseudo sans espaces aux bords, ou null s'il est vide, trop long ou absent. */
export function cleanPseudo(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const pseudo = value.trim();
  return pseudo.length >= 1 && pseudo.length <= PSEUDO_MAX_LENGTH ? pseudo : null;
}

export function validateSettings(value: unknown): Settings | null {
  if (!isRecord(value) || typeof value.sound !== 'boolean') return null;
  return { sound: value.sound, pseudo: cleanPseudo(value.pseudo) };
}
