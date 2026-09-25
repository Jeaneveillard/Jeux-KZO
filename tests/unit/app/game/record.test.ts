import { describe, expect, it } from 'vitest';
import { RESUME_ERROR_MESSAGE, hasSavedChessGame, loadSavedChessGame } from '../../../../src/app/game/saved';
import { restoreSession, toRecord, validateRecord, validateSetup } from '../../../../src/app/game/record';
import { applyMove, createSession, type GameSetup } from '../../../../src/app/game/session';
import { STORAGE_KEYS, createStorage } from '../../../../src/app/storage';
import { START_FEN, chessAdapter, chessMoveCodec } from '../../../../src/chess/adapter';

const setup: GameSetup = { game: 'chess', mode: 'ai', level: 'moyen', playerColor: 'black' };

describe('sauvegarde des parties', () => {
  it('transforme une session en enregistrement et la restaure', () => {
    const s = applyMove(chessAdapter, createSession(chessAdapter, setup, chessAdapter.initial()), { from: 'e2', to: 'e4' });
    const record = toRecord(chessAdapter, chessMoveCodec, s);
    expect(record).toEqual({ setup, start: START_FEN, moves: ['e2e4'] });
    const restored = restoreSession(chessAdapter, chessMoveCodec, record);
    expect(restored.positions[1].fen).toBe(s.positions[1].fen);
    expect(restored.setup).toEqual(setup);
  });

  it('refuse un enregistrement contenant un coup illégal', () => {
    expect(() => restoreSession(chessAdapter, chessMoveCodec, { setup, start: START_FEN, moves: ['e2e5'] })).toThrow();
  });

  it('valide la forme d’un enregistrement', () => {
    expect(validateRecord({ setup, start: START_FEN, moves: ['e2e4'] })).toEqual({ setup, start: START_FEN, moves: ['e2e4'] });
    expect(validateRecord({ setup, start: START_FEN, moves: [1] })).toBeNull();
    expect(validateRecord({ setup: { ...setup, mode: 'ligne' }, start: START_FEN, moves: [] })).toBeNull();
    expect(validateRecord('x')).toBeNull();
    expect(validateSetup({ game: 'chess', mode: 'local', level: null, playerColor: 'white' })).not.toBeNull();
    expect(validateSetup({ game: 'chess', mode: 'ai', level: 'maitre', playerColor: 'white' })).toBeNull();
    expect(validateSetup({ game: 'dames', mode: 'ai', level: 'faible', playerColor: 'white' })).toBeNull();
  });

  it('charge la partie sauvegardée des échecs', () => {
    const storage = createStorage(window.localStorage);
    expect(loadSavedChessGame(storage)).toEqual({ kind: 'none' });
    expect(hasSavedChessGame(storage)).toBe(false);
    storage.write(STORAGE_KEYS.chessSavedGame, { setup, start: START_FEN, moves: ['e2e4', 'e7e5'] });
    const loaded = loadSavedChessGame(storage);
    expect(loaded.kind).toBe('ok');
    expect(loaded.kind === 'ok' && loaded.session.moves).toHaveLength(2);
    expect(hasSavedChessGame(storage)).toBe(true);
  });

  it('écarte proprement une sauvegarde abîmée', () => {
    const storage = createStorage(window.localStorage);
    storage.write(STORAGE_KEYS.chessSavedGame, { setup, start: START_FEN, moves: ['e2e5'] });
    expect(loadSavedChessGame(storage)).toEqual({ kind: 'error', message: RESUME_ERROR_MESSAGE });
    expect(window.localStorage.getItem(STORAGE_KEYS.chessSavedGame)).toBeNull();
    window.localStorage.setItem(STORAGE_KEYS.chessSavedGame, '{"setup":42}');
    expect(loadSavedChessGame(storage)).toEqual({ kind: 'error', message: RESUME_ERROR_MESSAGE });
  });
});
