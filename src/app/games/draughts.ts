import type { Color } from '../../core/types';
import { getDraughtsEngine } from '../../draughts/engine';
import { DRAUGHTS_BLUNDER_DEPTH, DRAUGHTS_HINT_DEPTH } from '../../draughts/engine/levels';
import { explainDraughtsResult } from '../../draughts/explain';
import { draughtsGeometry } from '../../draughts/geometry';
import { detectDraughtsBlunder } from '../../draughts/help/blunder';
import { draughtsHintText } from '../../draughts/help/hint';
import { DRAUGHTS_LESSONS } from '../../draughts/lessons';
import { draughtsPieceImage, draughtsPieceLabel } from '../../draughts/pieces';
import { draughtsAdapter, draughtsLessonRules, draughtsMoveCodec } from '../../draughts/rules';
import type { DraughtsMove, DraughtsPos } from '../../draughts/types';
import { draughtsBoardPieces, lostPieceCounts } from '../../draughts/view';
import { CapturePicker } from '../components/CapturePicker';
import { STORAGE_KEYS } from '../storage';
import type { GameKit, PieceIcon } from './kit';

const lostIcons = (color: Color, count: number): PieceIcon[] =>
  Array.from({ length: count }, () => ({ image: draughtsPieceImage(color, 'man'), label: draughtsPieceLabel(color, 'man') }));

export const draughtsKit: GameKit<DraughtsPos, DraughtsMove> = {
  id: 'draughts',
  title: 'Dames',
  adapter: draughtsAdapter,
  codec: draughtsMoveCodec,
  savedGameKey: STORAGE_KEYS.draughtsSavedGame,
  progressKey: STORAGE_KEYS.draughtsProgress,
  lessons: DRAUGHTS_LESSONS,
  lessonRules: draughtsLessonRules,
  help: {
    hintDepth: DRAUGHTS_HINT_DEPTH,
    blunderDepth: DRAUGHTS_BLUNDER_DEPTH,
    hintText: draughtsHintText,
    detectBlunder: detectDraughtsBlunder,
  },
  engine: getDraughtsEngine,
  geometry: draughtsGeometry,
  boardPieces: draughtsBoardPieces,
  capturedPieces: (pos) => {
    const lost = lostPieceCounts(pos);
    return { white: lostIcons('white', lost.white), black: lostIcons('black', lost.black) };
  },
  checkSquare: () => null,
  moveSound: (_pos, move) => (move.captures.length > 0 ? 'capture' : 'move'),
  explainResult: explainDraughtsResult,
  ChoicePicker: CapturePicker,
};
