import { runSearch, type SearchRequest } from './search';

interface Incoming {
  readonly id: number;
  readonly request: SearchRequest;
}

/** Portée d'un Web Worker, réduite à ce qui sert ici (le projet compile avec les types du DOM). */
interface WorkerScope {
  onmessage: ((event: MessageEvent<Incoming>) => void) | null;
  postMessage(message: unknown): void;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = (event) => {
  const { id, request } = event.data;
  try {
    scope.postMessage({ id, result: runSearch(request) });
  } catch (error) {
    scope.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
