import type { UciTransport } from '../../../../src/chess/engine/transport';

export type Responder = (command: string) => readonly string[];

/** Faux Stockfish : répond aux commandes de façon asynchrone avec des lignes prévues. */
export class FakeTransport implements UciTransport {
  readonly sent: string[] = [];
  terminated = false;
  private respond: Responder;
  private lineListener: (line: string) => void = () => undefined;
  private errorListener: (error: Error) => void = () => undefined;

  constructor(respond: Responder) {
    this.respond = respond;
  }

  send(command: string): void {
    this.sent.push(command);
    const lines = this.respond(command);
    void Promise.resolve().then(() => lines.forEach((line) => this.lineListener(line)));
  }

  onLine(listener: (line: string) => void): void {
    this.lineListener = listener;
  }

  onError(listener: (error: Error) => void): void {
    this.errorListener = listener;
  }

  terminate(): void {
    this.terminated = true;
  }

  emitError(error: Error): void {
    this.errorListener(error);
  }
}

/** Répond « uciok » / « readyok », puis `goLines(commande)` à chaque « go ». */
export function standardResponder(goLines: (command: string) => readonly string[]): Responder {
  return (command) => {
    if (command === 'uci') return ['id name Faux', 'uciok'];
    if (command === 'isready') return ['readyok'];
    if (command.startsWith('go')) return goLines(command);
    return [];
  };
}
