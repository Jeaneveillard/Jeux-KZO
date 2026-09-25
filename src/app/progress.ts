import { isRecord } from '../core/guards';

export interface LessonProgress {
  readonly completed: readonly string[];
}

export const EMPTY_PROGRESS: LessonProgress = { completed: [] };

export function validateProgress(value: unknown): LessonProgress | null {
  if (!isRecord(value) || !Array.isArray(value.completed)) return null;
  const ids: unknown[] = value.completed;
  return ids.every((id): id is string => typeof id === 'string') ? { completed: [...ids] } : null;
}

export function isCompleted(progress: LessonProgress, lessonId: string): boolean {
  return progress.completed.includes(lessonId);
}

export function markCompleted(progress: LessonProgress, lessonId: string): LessonProgress {
  return isCompleted(progress, lessonId) ? progress : { completed: [...progress.completed, lessonId] };
}
