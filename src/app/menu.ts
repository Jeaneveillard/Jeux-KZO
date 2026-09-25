import type { Color } from '../core/types';

export type ColorChoice = Color | 'random';

export const COLOR_CHOICES: readonly { readonly value: ColorChoice; readonly label: string }[] = [
  { value: 'white', label: 'Blancs' },
  { value: 'black', label: 'Noirs' },
  { value: 'random', label: 'Au hasard' },
];

export const NO_SAVED_GAME_MESSAGE = 'Aucune partie à reprendre.';

export function resolveColor(choice: ColorChoice, rng: () => number = Math.random): Color {
  if (choice !== 'random') return choice;
  return rng() < 0.5 ? 'white' : 'black';
}
