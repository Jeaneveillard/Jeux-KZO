import { describe, expect, it } from 'vitest';
import {
  applyMove, canUndo, createSession, currentPosition, isHumanTurn, lastMove, resign, undoLastHumanMove,
  type GameSetup,
} from '../../../../src/app/game/session';
import { chessAdapter, fromUci } from '../../../../src/chess/adapter';

const aiFaible: GameSetup = { game: 'chess', mode: 'ai', level: 'faible', playerColor: 'white' };
const local: GameSetup = { game: 'chess', mode: 'local', level: null, playerColor: 'white' };
const start = () => createSession(chessAdapter, aiFaible, chessAdapter.initial());
const playAll = (setup: GameSetup, moves: string[]) =>
  moves.reduce((s, m) => applyMove(chessAdapter, s, fromUci(m)), createSession(chessAdapter, setup, chessAdapter.initial()));

describe('session de partie', () => {
  it('commence en cours, sans coup', () => {
    const s = start();
    expect(s.result).toEqual({ kind: 'ongoing' });
    expect(lastMove(s)).toBeNull();
    expect(currentPosition(s)).toBe(s.positions[0]);
  });

  it('ajoute un coup sans modifier l’ancienne session', () => {
    const s0 = start();
    const s1 = applyMove(chessAdapter, s0, { from: 'e2', to: 'e4' });
    expect(s0.moves).toHaveLength(0);
    expect(s1.moves).toEqual([{ from: 'e2', to: 'e4' }]);
    expect(s1.positions).toHaveLength(2);
    expect(lastMove(s1)).toEqual({ from: 'e2', to: 'e4' });
  });

  it('détecte la fin de partie et refuse ensuite tout coup', () => {
    const s = playAll(local, ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
    expect(s.result).toEqual({ kind: 'win', winner: 'black', reason: 'checkmate' });
    expect(() => applyMove(chessAdapter, s, { from: 'a2', to: 'a3' })).toThrow('La partie est terminée.');
  });

  it('sait à qui est le tour de jouer', () => {
    const s = start();
    expect(isHumanTurn(chessAdapter, s)).toBe(true);
    expect(isHumanTurn(chessAdapter, applyMove(chessAdapter, s, { from: 'e2', to: 'e4' }))).toBe(false);
    expect(isHumanTurn(chessAdapter, playAll(local, ['e2e4']))).toBe(true);
  });

  it('permet d’abandonner', () => {
    const s = resign(start(), 'white');
    expect(s.result).toEqual({ kind: 'win', winner: 'black', reason: 'resign' });
    expect(resign(s, 'black')).toBe(s);
  });

  it('annule le dernier coup du joueur et la réponse de l’ordinateur', () => {
    const s = playAll(aiFaible, ['e2e4', 'e7e5', 'g1f3', 'b8c6']);
    expect(canUndo(chessAdapter, s)).toBe(true);
    const undone = undoLastHumanMove(chessAdapter, s);
    expect(undone.moves.map((m) => `${m.from}${m.to}`)).toEqual(['e2e4', 'e7e5']);
    expect(undone.positions).toHaveLength(3);
  });

  it('annule seulement le coup du joueur si l’ordinateur n’a pas encore répondu', () => {
    const undone = undoLastHumanMove(chessAdapter, playAll(aiFaible, ['e2e4']));
    expect(undone.moves).toHaveLength(0);
  });

  it('permet d’annuler un coup qui a mené au mat, mais pas un abandon', () => {
    const mated = playAll({ ...aiFaible }, ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
    expect(canUndo(chessAdapter, mated)).toBe(true);
    expect(undoLastHumanMove(chessAdapter, mated).result).toEqual({ kind: 'ongoing' });
    expect(canUndo(chessAdapter, resign(playAll(aiFaible, ['e2e4', 'e7e5']), 'white'))).toBe(false);
  });

  it('refuse l’annulation hors du niveau Faible ou sans coup joué', () => {
    expect(canUndo(chessAdapter, start())).toBe(false);
    expect(canUndo(chessAdapter, playAll({ ...aiFaible, level: 'moyen' }, ['e2e4', 'e7e5']))).toBe(false);
    expect(canUndo(chessAdapter, playAll(local, ['e2e4']))).toBe(false);
    const nothing = start();
    expect(undoLastHumanMove(chessAdapter, nothing)).toBe(nothing);
  });
});
