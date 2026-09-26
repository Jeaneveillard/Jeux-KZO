import type { GameAdapter, GameId } from '../../core/types';
import { logWarning } from '../log';
import type { AppStorage } from '../storage';
import { restoreSession, validateRecord, type MoveCodec } from './record';
import type { Session } from './session';

export const RESUME_ERROR_MESSAGE = "La partie précédente n'a pas pu être reprise.";

/** Ce qu'il faut savoir d'un jeu pour relire sa partie sauvegardée. */
export interface SavedGameSpec<Pos, Move> {
  readonly id: GameId;
  readonly adapter: GameAdapter<Pos, Move>;
  readonly codec: MoveCodec<Pos, Move>;
  readonly savedGameKey: string;
}

export type SavedGameResult<Pos, Move> =
  | { readonly kind: 'none' }
  | { readonly kind: 'ok'; readonly session: Session<Pos, Move> }
  | { readonly kind: 'error'; readonly message: string };

export function loadSavedGame<Pos, Move>(spec: SavedGameSpec<Pos, Move>, storage: AppStorage): SavedGameResult<Pos, Move> {
  const raw = storage.read(spec.savedGameKey, (value) => value);
  if (raw === null) return { kind: 'none' };
  const record = validateRecord(raw);
  try {
    if (!record || record.setup.game !== spec.id) throw new Error('Enregistrement invalide');
    return { kind: 'ok', session: restoreSession(spec.adapter, spec.codec, record) };
  } catch (error) {
    logWarning('[reprise] partie sauvegardée rejetée', error);
    storage.remove(spec.savedGameKey);
    return { kind: 'error', message: RESUME_ERROR_MESSAGE };
  }
}

export function hasSavedGame<Pos, Move>(spec: SavedGameSpec<Pos, Move>, storage: AppStorage): boolean {
  const record = validateRecord(storage.read(spec.savedGameKey, (value) => value));
  return record !== null && record.setup.game === spec.id;
}
