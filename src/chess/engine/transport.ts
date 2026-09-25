/** Canal texte vers un moteur UCI (Web Worker dans le navigateur, module WASM dans Node). */
export interface UciTransport {
  send(command: string): void;
  onLine(listener: (line: string) => void): void;
  onError(listener: (error: Error) => void): void;
  terminate(): void;
}

export function createWorkerTransport(url: string): UciTransport {
  const worker = new Worker(url);
  let lineListener: (line: string) => void = () => undefined;
  let errorListener: (error: Error) => void = () => undefined;
  worker.onmessage = (event: MessageEvent) => {
    for (const line of String(event.data).split('\n')) {
      const trimmed = line.trim();
      if (trimmed) lineListener(trimmed);
    }
  };
  worker.onerror = (event: ErrorEvent) => {
    event.preventDefault();
    errorListener(new Error(event.message || 'Erreur du moteur'));
  };
  return {
    send: (command) => worker.postMessage(command),
    onLine: (listener) => {
      lineListener = listener;
    },
    onError: (listener) => {
      errorListener = listener;
    },
    terminate: () => worker.terminate(),
  };
}
