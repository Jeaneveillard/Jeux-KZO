/** Alphabet des codes de partie : sans O/0 ni I/1, pour éviter les confusions à la lecture. */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

/** Code en majuscules, sans espaces ni tirets ; null s'il n'est pas valide. */
export function normalizeCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '');
  return code.length === CODE_LENGTH && [...code].every((char) => CODE_ALPHABET.includes(char)) ? code : null;
}

/** Lien d'invitation ; `base` est l'adresse de l'app (ex. `https://…/Jeux-KZO/`). */
export function inviteLink(base: string, code: string): string {
  return `${base.replace(/#.*$/, '')}#/rejoindre/${code}`;
}
