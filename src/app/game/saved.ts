import { chessAdapter, chessMoveCodec } from '../../chess/adapter';
import type { ChessMove, ChessPos } from '../../chess/types';
import { logWarning } from '../log';
import { STORAGE_KEYS, type AppStorage } from '../storage';
import { restoreSession, validateRecord } from './record';
import type { Session } from './session';

export const RESUME_ERROR_MESSAGE = "La partie précédente n'a pas pu être reprise.";

export type SavedGameResult =
  | { readonly kind: 'none' }
  | { readonly kind: 'ok'; readonly session: Session<ChessPos, ChessMove> }
  | { readonly kind: 'error'; readonly message: string };

export function loadSavedChessGame(storage: AppStorage): SavedGameResult {
  const raw = storage.read(STORAGE_KEYS.chessSavedGame, (value) => value);
  if (raw === null) return { kind: 'none' };
  const record = validateRecord(raw);
  try {
    if (!record) throw new Error('Enregistrement invalide');
    return { kind: 'ok', session: restoreSession(chessAdapter, chessMoveCodec, record) };
  } catch (error) {
    logWarning('[reprise] partie sauvegardée rejetée', error);
    storage.remove(STORAGE_KEYS.chessSavedGame);
    return { kind: 'error', message: RESUME_ERROR_MESSAGE };
  }
}

export function hasSavedChessGame(storage: AppStorage): boolean {
  return validateRecord(storage.read(STORAGE_KEYS.chessSavedGame, (value) => value)) !== null;
}
