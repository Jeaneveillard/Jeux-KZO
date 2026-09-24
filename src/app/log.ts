// Journalisation des erreurs non bloquantes, visible seulement en développement.
export function logWarning(message: string, error?: unknown): void {
  if (import.meta.env.DEV) {
    console.warn(message, error);
  }
}
