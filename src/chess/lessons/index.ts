import type { Lesson } from '../../lessons/types';
import { PIECE_LESSONS } from './pieces';
import { RULE_LESSONS } from './rules';
import { STRATEGY_LESSONS } from './strategy';

export const CHESS_LESSONS: readonly Lesson[] = [...PIECE_LESSONS, ...RULE_LESSONS, ...STRATEGY_LESSONS];

export function findChessLesson(id: string): Lesson | undefined {
  return CHESS_LESSONS.find((lesson) => lesson.id === id);
}
