// Extrait les 12 pièces SVG « cburnett » du CSS de chessground vers src/chess/pieces/.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cssPath = join(root, 'node_modules', '@lichess-org', 'chessground', 'assets', 'chessground.cburnett.css');
const outDir = join(root, 'src', 'chess', 'pieces');
const ROLES = { pawn: 'P', knight: 'N', bishop: 'B', rook: 'R', queen: 'Q', king: 'K' };
const RULE = /piece\.(\w+)\.(white|black)\s*\{\s*background-image:\s*url\('data:image\/svg\+xml;base64,([^']+)'\)/g;

const css = readFileSync(cssPath, 'utf8');
mkdirSync(outDir, { recursive: true });
let count = 0;
for (const [, role, color, base64] of css.matchAll(RULE)) {
  const name = `${color === 'white' ? 'w' : 'b'}${ROLES[role]}.svg`;
  writeFileSync(join(outDir, name), Buffer.from(base64, 'base64').toString('utf8'));
  count += 1;
}
if (count !== 12) {
  throw new Error(`12 pièces attendues, ${count} trouvées dans ${cssPath}`);
}
console.info('[extract-pieces] 12 pièces écrites dans src/chess/pieces/');
