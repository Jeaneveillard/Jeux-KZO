import { isRecord } from '../core/guards';

export interface Settings {
  readonly sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = { sound: true };

export function validateSettings(value: unknown): Settings | null {
  if (!isRecord(value) || typeof value.sound !== 'boolean') return null;
  return { sound: value.sound };
}
