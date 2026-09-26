import { describe, expect, it } from 'vitest';
import { chessKit } from '../../../../src/app/games/chess';
import { draughtsKit } from '../../../../src/app/games/draughts';
import { buildOnlineView, colorOf, listEntries, newerGame, onlineStatusText, resultAfter, turnOf } from '../../../../src/app/online/view';
import { parseChess } from '../../../../src/chess/adapter';
import { onlineGame } from '../../online/fixtures';

const online = { connected: true, opponentOnline: true };

describe('vue d’une partie en ligne', () => {
  it('rejoue les coups et sait à qui est le tour', () => {
    const view = buildOnlineView(chessKit, onlineGame({ moves: ['e2e4'] }), 'ami');
    expect(view.myColor).toBe('black');
    expect(view.myTurn).toBe(true);
    expect(view.session.moves).toEqual([{ from: 'e2', to: 'e4' }]);
    expect(view.opponentName).toBe('Alice');
    expect(view.opponentId).toBe('moi');
    expect(buildOnlineView(chessKit, onlineGame({ moves: ['e2e4'] }), 'moi').myTurn).toBe(false);
  });

  it('marque un coup reçu illégal', () => {
    const view = buildOnlineView(chessKit, onlineGame({ moves: ['e2e4', 'e7e4'] }), 'moi');
    expect(view.invalidMove).toBe(true);
    expect(view.myTurn).toBe(false);
    expect(view.session.moves).toHaveLength(1);
    expect(onlineStatusText(onlineGame(), view, online)).toBe('Coup invalide reçu : la partie ne peut pas continuer.');
  });

  it('rejoue aussi les dames', () => {
    const view = buildOnlineView(draughtsKit, onlineGame({ game: 'draughts', start: 'W:W31-50:B1-20', moves: ['32-28'] }), 'ami');
    expect(view.myTurn).toBe(true);
    expect(view.session.moves[0]).toMatchObject({ from: '32', to: '28' });
  });

  it('prend le résultat officiel d’une partie terminée', () => {
    const resigned = onlineGame({ status: 'terminee', result: { kind: 'win', winner: 'black', reason: 'resign' } });
    expect(buildOnlineView(chessKit, resigned, 'moi').result).toEqual({ kind: 'win', winner: 'black', reason: 'resign' });
    expect(buildOnlineView(chessKit, onlineGame(), 'moi').result).toEqual({ kind: 'ongoing' });
  });

  it('calcule le résultat à envoyer avec un coup', () => {
    const pos = parseChess('rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2');
    expect(resultAfter(chessKit, pos, { from: 'd8', to: 'h4' })).toEqual({ kind: 'win', winner: 'black', reason: 'checkmate' });
    expect(resultAfter(chessKit, chessKit.adapter.initial(), { from: 'e2', to: 'e4' })).toBeNull();
  });

  it('décrit la situation en une phrase', () => {
    const game = onlineGame({ moves: ['e2e4'] });
    const mine = buildOnlineView(chessKit, game, 'ami');
    const theirs = buildOnlineView(chessKit, game, 'moi');
    expect(onlineStatusText(game, mine, online)).toBe('À toi de jouer');
    expect(onlineStatusText(game, theirs, online)).toBe("C'est à Bob de jouer");
    expect(onlineStatusText(game, theirs, { connected: true, opponentOnline: false })).toBe("C'est à Bob de jouer (hors ligne pour l'instant)");
    expect(onlineStatusText(game, theirs, { connected: false, opponentOnline: true })).toBe('Connexion perdue, reconnexion…');
    expect(onlineStatusText(onlineGame({ status: 'attente' }), theirs, online)).toBe('En attente de ton ami…');
  });

  it('trie « Mes parties en ligne »', () => {
    const waiting = onlineGame({ code: 'AAAAAA', status: 'attente', black: { id: null, pseudo: null } });
    const myTurn = onlineGame({ code: 'BBBBBB', moves: [] });
    const theirTurn = onlineGame({ code: 'CCCCCC', moves: ['e2e4'] });
    const finished = onlineGame({ code: 'DDDDDD', status: 'terminee', result: { kind: 'draw', reason: 'agreement' } });
    const entries = listEntries([finished, waiting, theirTurn, myTurn], 'moi');
    expect(entries.map((entry) => entry.game.code)).toEqual(['BBBBBB', 'CCCCCC', 'AAAAAA', 'DDDDDD']);
    expect(entries.map((entry) => entry.detail)).toEqual(['À toi de jouer', "C'est à Bob de jouer", 'En attente de ton ami', 'Partie terminée']);
    expect(entries[0].label).toBe('Contre Bob');
    expect(entries[2].label).toBe('Partie AAAAAA');
  });

  it('déduit couleur et trait', () => {
    expect(colorOf(onlineGame(), 'moi')).toBe('white');
    expect(colorOf(onlineGame(), 'intrus')).toBeNull();
    expect(turnOf(onlineGame({ moves: ['e2e4'] }))).toBe('black');
  });

  it('garde la version la plus récente d’une même partie', () => {
    const older = onlineGame({ updatedAt: '2026-09-26T10:00:00Z' });
    const newer = onlineGame({ moves: ['e2e4'], updatedAt: '2026-09-26T10:00:05.123+00:00' });
    expect(newerGame(null, older)).toBe(older);
    expect(newerGame(older, newer)).toBe(newer);
    expect(newerGame(newer, older)).toBe(newer);
    const other = onlineGame({ id: '22222222-2222-4222-8222-222222222222', updatedAt: '2026-09-26T09:00:00Z' });
    expect(newerGame(newer, other)).toBe(other);
  });
});
