import { describe, expect, it } from 'vitest';
import {
  START_FEN, attackersOf, chessAdapter, chessMoveCodec, checkedKingSquare, fromUci, isAttacked, legalMoves,
  listPieces, moveInfo, parseChess, pieceOn, play, positionKey, setTurn, status, toUci, turnOf,
} from '../../../src/chess/adapter';
import type { ChessPos } from '../../../src/chess/types';

const playAll = (pos: ChessPos, moves: string[]): ChessPos => moves.reduce((p, m) => play(p, fromUci(m)), pos);

describe('adaptateur des échecs', () => {
  it('part de la position initiale avec 20 coups pour les Blancs', () => {
    const pos = chessAdapter.initial();
    expect(pos.fen).toBe(START_FEN);
    expect(chessAdapter.turn(pos)).toBe('white');
    expect(legalMoves(pos)).toHaveLength(20);
    expect(status(pos)).toEqual({ kind: 'ongoing' });
  });

  it('joue un coup sans modifier la position de départ', () => {
    const start = chessAdapter.initial();
    const after = play(start, { from: 'e2', to: 'e4' });
    expect(start.fen).toBe(START_FEN);
    expect(start.keys).toHaveLength(1);
    expect(after.keys).toHaveLength(2);
    expect(turnOf(after)).toBe('black');
    expect(pieceOn(after, 'e4')).toEqual({ square: 'e4', color: 'white', type: 'p' });
    expect(pieceOn(after, 'e2')).toBeNull();
  });

  it('refuse un coup illégal', () => {
    expect(() => play(chessAdapter.initial(), { from: 'e2', to: 'e5' })).toThrow('Coup illégal : e2e5');
  });

  it('détecte le mat le plus rapide (mat du lion)', () => {
    const pos = playAll(chessAdapter.initial(), ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
    expect(status(pos)).toEqual({ kind: 'win', winner: 'black', reason: 'checkmate' });
    expect(checkedKingSquare(pos)).toBe('e1');
  });

  it('détecte le pat', () => {
    expect(status(parseChess('k7/8/1Q6/8/8/8/8/7K b - - 0 1'))).toEqual({ kind: 'draw', reason: 'stalemate' });
  });

  it('détecte le matériel insuffisant', () => {
    expect(status(parseChess('8/8/8/8/8/8/8/k6K w - - 0 1'))).toEqual({ kind: 'draw', reason: 'insufficient-material' });
  });

  it('détecte la répétition de la position trois fois', () => {
    const pos = playAll(chessAdapter.initial(), ['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1', 'f6g8']);
    expect(status(pos)).toEqual({ kind: 'draw', reason: 'repetition' });
  });

  it('détecte la règle des 50 coups', () => {
    expect(status(parseChess('4k3/8/8/8/8/8/8/4K2R w - - 100 80'))).toEqual({ kind: 'draw', reason: 'fifty-moves' });
  });

  it('refuse une position invalide, et une position sans roi sauf option', () => {
    expect(() => parseChess('pas une position')).toThrow(/Position invalide/);
    expect(() => parseChess('8/8/8/8/3R4/8/8/8 w - - 0 1')).toThrow(/Position invalide/);
    const lesson = parseChess('8/8/8/8/3R4/8/8/8 w - - 0 1', { allowMissingKings: true });
    expect(legalMoves(lesson)).toHaveLength(14);
  });

  it('convertit les coups en notation UCI et inversement', () => {
    expect(toUci({ from: 'e7', to: 'e8', promotion: 'q' })).toBe('e7e8q');
    expect(fromUci('e7e8n')).toEqual({ from: 'e7', to: 'e8', promotion: 'n' });
    expect(fromUci('g1f3')).toEqual({ from: 'g1', to: 'f3' });
    expect(() => fromUci('z9')).toThrow('Coup UCI invalide : z9');
    expect(chessMoveCodec.decode(chessMoveCodec.encode({ from: 'a2', to: 'a4' }))).toEqual({ from: 'a2', to: 'a4' });
  });

  it('liste les coups de promotion séparément', () => {
    const pos = parseChess('8/4P3/8/8/8/2k5/8/4K3 w - - 0 1');
    const promotions = legalMoves(pos).filter((m) => m.from === 'e7').map(toUci).sort();
    expect(promotions).toEqual(['e7e8b', 'e7e8n', 'e7e8q', 'e7e8r']);
  });

  it('liste les pièces et donne la clé de position', () => {
    expect(listPieces(chessAdapter.initial())).toHaveLength(32);
    expect(positionKey(START_FEN)).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -');
    expect(checkedKingSquare(chessAdapter.initial())).toBeNull();
  });

  it('change le trait pour les exercices sans adversaire', () => {
    const pos = play(parseChess('8/8/8/8/3R4/8/8/8 w - - 0 1', { allowMissingKings: true }), { from: 'd4', to: 'd8' });
    expect(turnOf(pos)).toBe('black');
    expect(turnOf(setTurn(pos, 'white'))).toBe('white');
  });

  it('indique les attaques sur une case', () => {
    const pos = parseChess('4k3/8/8/3p4/8/1P1Q4/8/4K3 w - - 0 1');
    expect(isAttacked(pos, 'c4', 'black')).toBe(true);
    expect(attackersOf(pos, 'c4', 'black')).toEqual(['d5']);
    expect(attackersOf(pos, 'c4', 'white').sort()).toEqual(['b3', 'd3']);
  });

  it('décrit un coup : pièce, prise, échec', () => {
    const pos = parseChess('r3k3/8/8/8/8/8/1p6/Q3K3 w - - 0 1');
    expect(moveInfo(pos, { from: 'a1', to: 'a8' })).toEqual({ piece: 'q', captured: 'r', san: 'Qxa8+', givesCheck: true });
    expect(moveInfo(chessAdapter.initial(), { from: 'e2', to: 'e4' })).toEqual({ piece: 'p', captured: undefined, san: 'e4', givesCheck: false });
    expect(() => moveInfo(chessAdapter.initial(), { from: 'e2', to: 'e5' })).toThrow('Coup illégal');
  });

  it('sérialise et relit une position', () => {
    const pos = play(chessAdapter.initial(), { from: 'e2', to: 'e4' });
    expect(chessAdapter.parse(chessAdapter.serialize(pos)).fen).toBe(pos.fen);
  });
});
