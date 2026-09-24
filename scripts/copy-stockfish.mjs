// Copie la version « lite single-thread » de Stockfish dans public/stockfish/
// pour qu'elle soit servie telle quelle au Web Worker (et mise en cache hors ligne).
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'node_modules', 'stockfish', 'bin');
const target = join(root, 'public', 'stockfish');
const files = ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm'];

if (!existsSync(source)) {
  console.warn('[copy-stockfish] node_modules/stockfish absent : copie ignorée.');
  process.exit(0);
}

mkdirSync(target, { recursive: true });
for (const file of files) {
  copyFileSync(join(source, file), join(target, file));
}
console.info(`[copy-stockfish] ${files.length} fichiers copiés dans public/stockfish/`);
