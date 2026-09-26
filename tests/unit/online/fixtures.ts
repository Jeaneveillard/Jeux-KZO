import type { OnlineGame } from '../../../src/online/types';

/** Ligne `parties` telle que le serveur la renvoie (colonnes en snake_case). */
export function row(overrides: Readonly<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    code: 'K7M2QX',
    jeu: 'chess',
    depart: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    coups: [],
    blancs: 'moi',
    noirs: 'ami',
    pseudo_blancs: 'Alice',
    pseudo_noirs: 'Bob',
    statut: 'en_cours',
    resultat: null,
    nulle_proposee_par: null,
    revanche_code: null,
    cree_le: '2026-09-26T10:00:00Z',
    maj_le: '2026-09-26T10:00:00Z',
    ...overrides,
  };
}

/** Partie en ligne vérifiée, pour les tests qui n'ont pas besoin de la ligne brute. */
export function onlineGame(overrides: Partial<OnlineGame> = {}): OnlineGame {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    code: 'K7M2QX',
    game: 'chess',
    start: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves: [],
    white: { id: 'moi', pseudo: 'Alice' },
    black: { id: 'ami', pseudo: 'Bob' },
    status: 'en_cours',
    result: null,
    drawOfferedBy: null,
    rematchCode: null,
    updatedAt: '2026-09-26T10:00:00Z',
    ...overrides,
  };
}
