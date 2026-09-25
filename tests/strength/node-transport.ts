import { createRequire } from 'node:module';
import type { UciTransport } from '../../src/chess/engine/transport';

interface NodeEngine {
  listener?: (line: string) => void;
  sendCommand(command: string): void;
}

type InitEngine = (variant: string) => Promise<NodeEngine>;

const require = createRequire(import.meta.url);

/** Stockfish « lite single » dans Node, derrière la même interface que le Web Worker. */
export function createNodeTransport(): UciTransport {
  const initEngine = require('stockfish') as InitEngine;
  const pending: string[] = [];
  let engine: NodeEngine | null = null;
  let lineListener: (line: string) => void = () => undefined;
  let errorListener: (error: Error) => void = () => undefined;

  initEngine('lite-single')
    .then((loaded) => {
      engine = loaded;
      loaded.listener = (line) => lineListener(line);
      pending.splice(0).forEach((command) => loaded.sendCommand(command));
    })
    .catch((error: unknown) => errorListener(error instanceof Error ? error : new Error(String(error))));

  return {
    send: (command) => {
      if (engine) engine.sendCommand(command);
      else pending.push(command);
    },
    onLine: (listener) => {
      lineListener = listener;
    },
    onError: (listener) => {
      errorListener = listener;
    },
    terminate: () => engine?.sendCommand('quit'),
  };
}
