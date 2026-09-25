// Fabrique public/icon.svg : un cavalier blanc et un pion de dames sur fond vert.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const knight = readFileSync(join(root, 'src', 'chess', 'pieces', 'wN.svg'), 'utf8');
const inner = knight.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#1f4e3d"/>
  <circle cx="360" cy="368" r="96" fill="#b3261e" stroke="#ffffff" stroke-width="10"/>
  <circle cx="360" cy="368" r="60" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="6"/>
  <g transform="translate(40 30) scale(7.2)">${inner}</g>
</svg>
`;
writeFileSync(join(root, 'public', 'icon.svg'), icon);
console.info('[make-icon] public/icon.svg écrit');
