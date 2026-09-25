import type { Lesson } from '../../lessons/types';
import { isCompleted, type LessonProgress } from '../progress';

interface LessonListScreenProps {
  readonly lessons: readonly Lesson[];
  readonly progress: LessonProgress;
  readonly onOpen: (lessonId: string) => void;
  readonly onBack: () => void;
}

export function LessonListScreen({ lessons, progress, onOpen, onBack }: LessonListScreenProps) {
  const done = lessons.filter((lesson) => isCompleted(progress, lesson.id)).length;
  return (
    <section class="screen">
      <header class="topbar">
        <button type="button" class="back" aria-label="Retour" onClick={onBack}>
          ←
        </button>
        <h1>Apprendre à jouer</h1>
      </header>
      <p class="muted">
        {done} / {lessons.length} leçons terminées
      </p>
      <ol class="lesson-list">
        {lessons.map((lesson, index) => (
          <li key={lesson.id}>
            <button type="button" class="btn" onClick={() => onOpen(lesson.id)}>
              {index + 1}. {lesson.title}
              {isCompleted(progress, lesson.id) && <span class="lesson-done">✓</span>}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
