import type { Color } from '../../core/types';
import type { PieceIcon } from '../games/kit';

interface CapturedRowProps {
  /** Couleur des pièces perdues. */
  readonly color: Color;
  readonly pieces: readonly PieceIcon[];
}

export function CapturedRow({ color, pieces }: CapturedRowProps) {
  return (
    <div class="captured" aria-label={color === 'white' ? 'Pièces blanches prises' : 'Pièces noires prises'}>
      {pieces.map((piece, index) => (
        <img key={`${piece.label}-${index}`} src={piece.image} alt={piece.label} />
      ))}
    </div>
  );
}
