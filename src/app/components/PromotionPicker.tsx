import type { Color } from '../../core/types';
import { pieceLabel } from '../../chess/names';
import { pieceImage } from '../../chess/pieces';
import type { ChessMove, PromotionPiece } from '../../chess/types';

interface PromotionPickerProps {
  readonly color: Color;
  readonly choices: readonly ChessMove[];
  readonly onPick: (move: ChessMove) => void;
  readonly onCancel: () => void;
}

const ORDER: readonly PromotionPiece[] = ['q', 'r', 'b', 'n'];

export function PromotionPicker({ color, choices, onPick, onCancel }: PromotionPickerProps) {
  const options = ORDER.flatMap((piece) => {
    const move = choices.find((choice) => choice.promotion === piece);
    return move ? [{ piece, move }] : [];
  });
  return (
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="promotion-title">
      <div class="modal">
        <h2 id="promotion-title">Promotion : choisis ta pièce</h2>
        <div class="promotion">
          {options.map(({ piece, move }) => (
            <button type="button" key={piece} aria-label={pieceLabel(color, piece)} onClick={() => onPick(move)}>
              <img src={pieceImage(color, piece)} alt="" />
            </button>
          ))}
        </div>
        <button type="button" class="btn btn-small" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </div>
  );
}
