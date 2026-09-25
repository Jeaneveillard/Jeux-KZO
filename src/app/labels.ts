import type { Level } from '../core/types';
import type { GameSetup } from './game/session';

export const LEVEL_LABELS: Readonly<Record<Level, { readonly name: string; readonly description: string }>> = {
  faible: { name: 'Faible', description: 'Débutant : aide activée (indices, alertes, annulation)' },
  moyen: { name: 'Moyen', description: 'Bon joueur de club' },
  expert: { name: 'Expert', description: 'Très fort : réfléchit plusieurs secondes' },
};

export function modeTitle(setup: GameSetup): string {
  return setup.mode === 'ai' && setup.level ? `Contre l'ordinateur · ${LEVEL_LABELS[setup.level].name}` : '2 joueurs';
}
