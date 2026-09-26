export class EngineLoadError extends Error {
  constructor(cause?: unknown) {
    super("L'ordinateur n'a pas pu démarrer.", { cause });
    this.name = 'EngineLoadError';
  }
}

export class EngineTimeoutError extends Error {
  constructor() {
    super("L'ordinateur a mis trop de temps à répondre.");
    this.name = 'EngineTimeoutError';
  }
}

export class EngineAbortError extends Error {
  constructor() {
    super('Recherche annulée.');
    this.name = 'AbortError';
  }
}

export class EngineUnavailableError extends Error {
  constructor() {
    super("L'ordinateur ne répond plus. Touche « Réessayer » ou reprends la partie plus tard.");
    this.name = 'EngineUnavailableError';
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof EngineAbortError;
}

export function engineErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "L'ordinateur a rencontré un problème.";
}
