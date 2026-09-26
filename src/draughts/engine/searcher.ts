import { EngineAbortError } from '../../core/engine-errors';
import { runSearch, type SearchRequest, type SearchResult } from './search';

export interface DraughtsSearcher {
  search(request: SearchRequest, timeoutMs: number, signal?: AbortSignal): Promise<SearchResult>;
}

/** Recherche dans le fil courant : tests et matchs de force dans Node. */
export function createInlineSearcher(now?: () => number): DraughtsSearcher {
  return {
    search: async (request, _timeoutMs, signal) => {
      if (signal?.aborted) throw new EngineAbortError();
      const result = runSearch(request, now);
      if (signal?.aborted) throw new EngineAbortError();
      return result;
    },
  };
}
