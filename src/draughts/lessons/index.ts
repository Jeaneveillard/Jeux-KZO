import type { Lesson } from '../../lessons/types';
import { ADVANCED_LESSONS } from './advanced';
import { BASIC_LESSONS } from './basics';

export const DRAUGHTS_LESSONS: readonly Lesson[] = [...BASIC_LESSONS, ...ADVANCED_LESSONS];

export function findDraughtsLesson(id: string): Lesson | undefined {
  return DRAUGHTS_LESSONS.find((lesson) => lesson.id === id);
}
