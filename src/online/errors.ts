import { isOneOf } from '../core/guards';

/** Messages d'erreur levés par les fonctions du serveur (migration `parties`). */
export const SERVER_ERROR_CODES = [
  'non_connecte',
  'entree_invalide',
  'trop_de_parties',
  'code_inconnu',
  'trop_d_essais',
  'partie_complete',
  'partie_introuvable',
  'adversaire_absent',
  'partie_terminee',
  'conflit',
  'pas_ton_tour',
  'coup_invalide',
  'resultat_invalide',
  'pas_de_proposition',
  'partie_commencee',
  'partie_en_cours',
] as const;

export type ServerErrorCode = (typeof SERVER_ERROR_CODES)[number];
export type OnlineErrorCode = ServerErrorCode | 'non_configure' | 'indisponible' | 'reponse_invalide' | 'hors_ligne';

const MESSAGES: Readonly<Record<OnlineErrorCode, string>> = {
  non_connecte: 'La connexion au jeu en ligne a échoué. Réessaie dans un instant.',
  entree_invalide: 'Le pseudo doit faire de 1 à 20 caractères.',
  trop_de_parties: "Tu as déjà 20 parties en cours : termines-en ou annules-en une avant d'en créer une autre.",
  code_inconnu: 'Ce code ne correspond à aucune partie.',
  trop_d_essais: 'Trop de codes essayés : attends quelques minutes avant de réessayer.',
  partie_complete: 'Cette partie a déjà ses deux joueurs.',
  partie_introuvable: "Cette partie n'existe plus, ou ce n'est pas la tienne.",
  adversaire_absent: "Ton ami n'a pas encore rejoint la partie.",
  partie_terminee: 'La partie est terminée.',
  conflit: 'La partie a changé : rejoue ton coup.',
  pas_ton_tour: "Ce n'est pas ton tour.",
  coup_invalide: 'Le serveur a refusé ce coup.',
  resultat_invalide: 'Le serveur a refusé le résultat de la partie.',
  pas_de_proposition: "Il n'y a plus de nulle à accepter.",
  partie_commencee: 'Ton ami a déjà rejoint la partie : elle ne peut plus être annulée.',
  partie_en_cours: "La revanche n'est possible qu'à la fin de la partie.",
  non_configure: "Le jeu en ligne n'est pas disponible dans cette version de l'app.",
  indisponible: 'Le jeu en ligne est momentanément indisponible.',
  reponse_invalide: 'Le serveur a envoyé une réponse inattendue.',
  hors_ligne: "Pas de connexion internet : le jeu en ligne a besoin du réseau.",
};

export class OnlineError extends Error {
  readonly code: OnlineErrorCode;

  constructor(code: OnlineErrorCode, cause?: unknown) {
    super(MESSAGES[code], { cause });
    this.name = 'OnlineError';
    this.code = code;
  }

  /** Erreur du serveur : son message est un code connu, sinon le serveur est injoignable ou en panne. */
  static fromServer(message: string | undefined): OnlineError {
    return new OnlineError(isOneOf(message, SERVER_ERROR_CODES) ? message : 'indisponible', message);
  }
}

export function onlineErrorMessage(error: unknown): string {
  return error instanceof OnlineError ? error.message : MESSAGES.indisponible;
}

export function isOnlineError(error: unknown, code: OnlineErrorCode): boolean {
  return error instanceof OnlineError && error.code === code;
}
