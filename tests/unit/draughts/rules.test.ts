import { describe, expect, it } from 'vitest';
import {
  decodeDraughtsMove, draughtsAdapter, draughtsLessonRules, draughtsMoveCodec, draughtsMoveId, endgameRule, legalMoves,
  parseDraughts, play, setTurn, status,
} from '../../../src/draughts/rules';
import type { DraughtsMove, DraughtsPos } from '../../../src/draughts/types';

const byId = (pos: DraughtsPos, id: string): DraughtsMove => decodeDraughtsMove(id, pos);
const playAll = (pos: DraughtsPos, ids: readonly string[]) => ids.reduce((current, id) => play(current, byId(current, id)), pos);

describe('règles des dames', () => {
  it('commence avec 20 pions chacun, les Blancs au trait', () => {
    const start = draughtsAdapter.initial();
    expect(draughtsAdapter.id).toBe('draughts');
    expect(draughtsAdapter.turn(start)).toBe('white');
    expect(legalMoves(start)).toHaveLength(9);
    expect(status(start)).toEqual({ kind: 'ongoing' });
    expect(draughtsAdapter.parse(draughtsAdapter.serialize(start)).board).toBe(start.board);
  });

  it('joue un coup sans modifier la position d’origine', () => {
    const start = draughtsAdapter.initial();
    const next = play(start, byId(start, '32-28'));
    expect(start.board[27]).toBe('.');
    expect(next.board[27]).toBe('w');
    expect(next.turn).toBe('black');
    expect(() => play(start, { from: '32', to: '23', steps: ['23'], captures: [], promotes: false })).toThrow('Coup illégal : 32-23');
  });

  it('décrit les prises et les promotions, et les encode', () => {
    const [rafle] = legalMoves(parseDraughts('W:W32:B28,19'));
    expect(rafle).toEqual({ from: '32', to: '14', steps: ['23', '14'], captures: ['28', '19'], promotes: false });
    expect(draughtsMoveId(rafle)).toBe('32x23x14');
    const promotion = byId(parseDraughts('W:W7:B45'), '7-1');
    expect(promotion.promotes).toBe(true);
    expect(draughtsLessonRules.isPromotion(promotion)).toBe(true);
    expect(draughtsMoveCodec.encode(promotion)).toBe('7-1');
    expect(play(parseDraughts('W:W7:B45'), promotion).board[0]).toBe('W');
    expect(() => decodeDraughtsMove('7-3', parseDraughts('W:W7:B45'))).toThrow('Coup illégal');
  });

  it('fait gagner le camp qui prend toutes les pièces adverses', () => {
    const won = playAll(parseDraughts('W:WK46:BK28'), ['46x23']);
    expect(status(won)).toEqual({ kind: 'win', winner: 'white', reason: 'no-moves' });
  });

  it('fait perdre le camp dont les pièces sont bloquées', () => {
    expect(status(parseDraughts('B:W41,47:B36'))).toEqual({ kind: 'win', winner: 'white', reason: 'no-moves' });
  });

  it('déclare nulle une position revenue trois fois', () => {
    const shuffle = ['1-7', '50-44', '7-1', '44-50'];
    const pos = playAll(parseDraughts('W:WK1:BK50'), [...shuffle, ...shuffle]);
    expect(status(pos)).toEqual({ kind: 'draw', reason: 'repetition' });
  });

  it('déclare nulle après 25 coups de dames de chaque côté', () => {
    const pos = playAll(parseDraughts('W:WK1,31:BK50'), ['1-7', '50-44']);
    expect(pos.kingPlies).toBe(2);
    expect(playAll(pos, ['31-26']).kingPlies).toBe(0);
    expect(status({ ...pos, kingPlies: 50 })).toEqual({ kind: 'draw', reason: 'king-moves' });
  });

  it('limite les fins de partie à 16 ou 5 coups', () => {
    expect(endgameRule(parseDraughts('W:WK1,K2,K3:BK50').board)).toBe(16);
    expect(endgameRule(parseDraughts('W:WK1,31,32:BK50').board)).toBe(16);
    expect(endgameRule(parseDraughts('W:WK1:BK50,K49').board)).toBe(5);
    expect(endgameRule(parseDraughts('W:W31,32,33:BK50').board)).toBeNull();
    expect(endgameRule(draughtsAdapter.initial().board)).toBeNull();
    const pos = parseDraughts('W:WK1,K2,K3:BK50');
    expect(pos.endgame).toEqual({ rule: 16, plies: 0 });
    expect(playAll(pos, ['1-6']).endgame).toEqual({ rule: 16, plies: 1 });
    expect(status({ ...pos, endgame: { rule: 16, plies: 32 } })).toEqual({ kind: 'draw', reason: 'endgame-limit' });
  });

  it('redonne le trait pour les exercices des leçons', () => {
    const pos = setTurn(parseDraughts('W:W32:B'), 'white');
    const move = byId(pos, '32-28');
    expect(draughtsLessonRules.turn(pos)).toBe('white');
    expect(draughtsLessonRules.moveId(move)).toBe('32-28');
    expect(draughtsLessonRules.destination(move)).toBe('28');
    expect(draughtsLessonRules.keepTurn(play(pos, move), 'white').turn).toBe('white');
    expect(draughtsLessonRules.parse('W:W32:B').board).toBe(pos.board);
  });
});
