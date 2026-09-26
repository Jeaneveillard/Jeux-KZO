/** Verdict de l'alerte de gaffe du niveau Faible, commun aux deux jeux. */
export type BlunderVerdict = { readonly blunder: false } | { readonly blunder: true; readonly message: string };

export const NO_BLUNDER: BlunderVerdict = { blunder: false };
