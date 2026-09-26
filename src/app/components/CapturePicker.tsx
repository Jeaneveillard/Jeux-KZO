import type { DraughtsMove } from '../../draughts/types';
import type { ChoicePickerProps } from '../games/kit';

/** Plusieurs rafles mènent à la même case avec des pièces prises différentes : le joueur choisit. */
export function CapturePicker({ choices, onPick, onCancel }: ChoicePickerProps<DraughtsMove>) {
  return (
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="capture-title">
      <div class="modal">
        <h2 id="capture-title">Quelle rafle ?</h2>
        <p>Plusieurs prises mènent à cette case : choisis les pièces à prendre.</p>
        {choices.map((move) => (
          <button type="button" key={move.captures.join('-')} class="btn" onClick={() => onPick(move)}>
            Prendre en {move.captures.join(', ')}
          </button>
        ))}
        <button type="button" class="btn btn-small" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </div>
  );
}
