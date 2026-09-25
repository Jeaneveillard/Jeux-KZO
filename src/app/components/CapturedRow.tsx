import type { Color } from '../../core/types';
import { pieceLabel } from '../../chess/names';
import { pieceImage } from '../../chess/pieces';
import type { PieceType } from '../../chess/types';

interface CapturedRowProps {
  /** Couleur des pièces perdues. */
  readonly color: Color;
  readonly pieces: readonly PieceType[];
}

export function CapturedRow({ color, pieces }: CapturedRowProps) {
  return (
    <div class="captured" aria-label={color === 'white' ? 'Pièces blanches prises' : 'Pièces noires prises'}>
      {pieces.map((type, index) => (
        <img key={`${type}-${index}`} src={pieceImage(color, type)} alt={pieceLabel(color, type)} />
      ))}
    </div>
  );
}
