import { useMemo, useState } from 'preact/hooks';
import { CHESS_LESSONS, findChessLesson } from '../chess/lessons';
import { hasSavedChessGame } from './game/saved';
import { navigate, useRoute } from './navigation';
import { EMPTY_PROGRESS, isCompleted, markCompleted, validateProgress, type LessonProgress } from './progress';
import type { Route } from './router';
import { ChessMenuScreen } from './screens/ChessMenuScreen';
import { ChessResume, NewChessGame } from './screens/ChessGameRoutes';
import { HomeScreen } from './screens/HomeScreen';
import { LessonListScreen } from './screens/LessonListScreen';
import { LessonScreen } from './screens/LessonScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { DEFAULT_SETTINGS, validateSettings, type Settings } from './settings';
import { STORAGE_KEYS, createStorage, detectBackend } from './storage';

export function App() {
  const storage = useMemo(() => createStorage(detectBackend()), []);
  const [settings, setSettings] = useState<Settings>(() => storage.read(STORAGE_KEYS.settings, validateSettings) ?? DEFAULT_SETTINGS);
  const [progress, setProgress] = useState<LessonProgress>(() => storage.read(STORAGE_KEYS.chessProgress, validateProgress) ?? EMPTY_PROGRESS);
  const [menuNotice, setMenuNotice] = useState<string | null>(null);
  const { route, version } = useRoute();

  const go = (next: Route) => {
    setMenuNotice(null);
    navigate(next);
  };

  const updateSettings = (next: Settings) => {
    setSettings(next);
    storage.write(STORAGE_KEYS.settings, next);
  };

  const completeLesson = (lessonId: string) => {
    const next = markCompleted(progress, lessonId);
    setProgress(next);
    storage.write(STORAGE_KEYS.chessProgress, next);
  };

  switch (route.name) {
    case 'home':
      return <HomeScreen onNavigate={go} storageAvailable={storage.available} />;
    case 'settings':
      return <SettingsScreen settings={settings} onChange={updateSettings} onBack={() => go({ name: 'home' })} />;
    case 'chess-menu':
      return (
        <ChessMenuScreen
          onNavigate={go}
          hasSavedGame={hasSavedChessGame(storage)}
          completedCount={CHESS_LESSONS.filter((lesson) => isCompleted(progress, lesson.id)).length}
          totalLessons={CHESS_LESSONS.length}
          notice={menuNotice}
        />
      );
    case 'chess-lessons':
      return (
        <LessonListScreen
          lessons={CHESS_LESSONS}
          progress={progress}
          onOpen={(lessonId) => go({ name: 'chess-lesson', lessonId })}
          onBack={() => go({ name: 'chess-menu' })}
        />
      );
    case 'chess-lesson': {
      const lesson = findChessLesson(route.lessonId);
      if (!lesson) {
        return <LessonListScreen lessons={CHESS_LESSONS} progress={progress} onOpen={(lessonId) => go({ name: 'chess-lesson', lessonId })} onBack={() => go({ name: 'chess-menu' })} />;
      }
      const index = CHESS_LESSONS.indexOf(lesson);
      return (
        <LessonScreen
          key={`${lesson.id}-${version}`}
          lesson={lesson}
          nextLesson={CHESS_LESSONS[index + 1]}
          sound={settings.sound}
          onComplete={completeLesson}
          onOpen={(lessonId) => go({ name: 'chess-lesson', lessonId })}
          onBack={() => go({ name: 'chess-lessons' })}
        />
      );
    }
    case 'chess-play':
      return <NewChessGame key={version} setup={route.setup} storage={storage} sound={settings.sound} />;
    case 'chess-resume':
      return (
        <ChessResume
          key={version}
          storage={storage}
          sound={settings.sound}
          onFailure={(message) => {
            setMenuNotice(message);
            navigate({ name: 'chess-menu' });
          }}
        />
      );
  }
}
