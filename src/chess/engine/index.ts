import { ChessEngine } from './chess-engine';
import { StockfishClient } from './stockfish-client';
import { createWorkerTransport } from './transport';

export const STOCKFISH_URL = `${import.meta.env.BASE_URL}stockfish/stockfish-19-lite-single.js`;

let engine: ChessEngine | null = null;

/** Moteur partagé par toute l'app ; Stockfish n'est chargé qu'à la première demande. */
export function getChessEngine(): ChessEngine {
  if (!engine) {
    engine = new ChessEngine(new StockfishClient(() => createWorkerTransport(STOCKFISH_URL)));
  }
  return engine;
}
