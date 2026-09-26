import { chessGeometry } from '../../board/geometry';
import { checkedKingSquare, chessAdapter, chessMoveCodec, moveInfo } from '../../chess/adapter';
import { getChessEngine } from '../../chess/engine';
import { BLUNDER_DEPTH, HINT_DEPTH } from '../../chess/engine/levels';
import { explainResult } from '../../chess/explain';
import { detectBlunder } from '../../chess/help/blunder';
import { hintText } from '../../chess/help/hint';
import { chessLessonRules } from '../../chess/lesson-rules';
import { CHESS_LESSONS } from '../../chess/lessons';
import { pieceLabel } from '../../chess/names';
import { pieceImage } from '../../chess/pieces';
import type { ChessMove, ChessPos, PieceType } from '../../chess/types';
import { capturedPieces, chessBoardPieces } from '../../chess/view';
import type { Color } from '../../core/types';
import { PromotionPicker } from '../components/PromotionPicker';
import { STORAGE_KEYS } from '../storage';
import type { GameKit, PieceIcon } from './kit';

const icons = (color: Color, types: readonly PieceType[]): PieceIcon[] =>
  types.map((type) => ({ image: pieceImage(color, type), label: pieceLabel(color, type) }));

export const chessKit: GameKit<ChessPos, ChessMove> = {
  id: 'chess',
  title: 'Échecs',
  adapter: chessAdapter,
  codec: chessMoveCodec,
  savedGameKey: STORAGE_KEYS.chessSavedGame,
  progressKey: STORAGE_KEYS.chessProgress,
  lessons: CHESS_LESSONS,
  lessonRules: chessLessonRules,
  help: { hintDepth: HINT_DEPTH, blunderDepth: BLUNDER_DEPTH, hintText, detectBlunder },
  engine: getChessEngine,
  geometry: chessGeometry,
  boardPieces: chessBoardPieces,
  capturedPieces: (pos) => {
    const lost = capturedPieces(pos);
    return { white: icons('white', lost.white), black: icons('black', lost.black) };
  },
  checkSquare: checkedKingSquare,
  moveSound: (pos, move) => {
    const info = moveInfo(pos, move);
    return info.givesCheck ? 'check' : info.captured ? 'capture' : 'move';
  },
  explainResult,
  ChoicePicker: PromotionPicker,
};
