import { DraughtsEngine } from './draughts-engine';
import { WorkerSearcher } from './worker-searcher';

let engine: DraughtsEngine | null = null;

/** Moteur de dames partagé par toute l'app ; son Web Worker n'est créé qu'à la première recherche. */
export function getDraughtsEngine(): DraughtsEngine {
  if (!engine) {
    engine = new DraughtsEngine(new WorkerSearcher(() => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })));
  }
  return engine;
}
