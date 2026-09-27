import { isOneOf, isRecord } from '../core/guards';
import { DRAW_REASONS, GAME_IDS, WIN_REASONS, type GameStatus } from '../core/types';
import { normalizeCode } from './code';
import type { OnlineGame, OnlineSeat } from './types';

const COLORS = ['white', 'black'] as const;
const STATUSES = ['attente', 'en_cours', 'terminee'] as const;

/** Texte, null, ou undefined si la valeur n'est ni l'un ni l'autre. */
function optionalText(value: unknown): string | null | undefined {
  if (value === null) return null;
  return typeof value === 'string' ? value : undefined;
}

function seat(player: unknown, pseudo: unknown): OnlineSeat | null {
  const id = optionalText(player);
  const name = optionalText(pseudo);
  return id === undefined || name === undefined ? null : { id, pseudo: name };
}

export function parseResult(value: unknown): GameStatus | null {
  if (!isRecord(value)) return null;
  if (value.kind === 'win' && isOneOf(value.winner, COLORS) && isOneOf(value.reason, WIN_REASONS)) {
    return { kind: 'win', winner: value.winner, reason: value.reason };
  }
  if (value.kind === 'draw' && isOneOf(value.reason, DRAW_REASONS)) return { kind: 'draw', reason: value.reason };
  return null;
}

/** Ligne `parties` reçue du serveur → partie vérifiée, ou null si elle est mal formée. */
export function parseGameRow(value: unknown): OnlineGame | null {
  if (!isRecord(value)) return null;
  const { id, code, jeu, depart, coups, statut, resultat, nulle_proposee_par: drawOffer, revanche_code: rematch, maj_le: updatedAt } = value;
  if (typeof id !== 'string' || typeof code !== 'string' || normalizeCode(code) !== code) return null;
  if (!isOneOf(jeu, GAME_IDS) || typeof depart !== 'string' || !isOneOf(statut, STATUSES) || typeof updatedAt !== 'string') return null;
  if (!Array.isArray(coups)) return null;
  const moves: unknown[] = coups;
  if (!moves.every((move): move is string => typeof move === 'string')) return null;
  const white = seat(value.blancs, value.pseudo_blancs);
  const black = seat(value.noirs, value.pseudo_noirs);
  const drawOfferedBy = drawOffer === null ? null : isOneOf(drawOffer, COLORS) ? drawOffer : undefined;
  const rematchCode = optionalText(rematch);
  const result = resultat === null ? null : parseResult(resultat);
  if (!white || !black || drawOfferedBy === undefined || rematchCode === undefined) return null;
  if ((resultat !== null && result === null) || (statut === 'terminee' && result === null)) return null;
  return { id, code, game: jeu, start: depart, moves: [...moves], white, black, status: statut, result, drawOfferedBy, rematchCode, updatedAt };
}
