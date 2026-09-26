import { useMemo, useState } from 'preact/hooks';
import type { MoveShape } from '../board/move-input';
import type { GameId } from '../core/types';
import { hasSavedGame } from './game/saved';
import { withKit } from './games';
import type { GameKit } from './games/kit';
import { navigate, useRoute } from './navigation';
import { EMPTY_PROGRESS, isCompleted, markCompleted, validateProgress, type LessonProgress } from './progress';
import type { Route } from './router';
import { GameMenuScreen } from './screens/GameMenuScreen';
import { NewGame, ResumeGame } from './screens/GameRoutes';
import { HomeScreen } from './screens/HomeScreen';
import { LessonListScreen } from './screens/LessonListScreen';
import { LessonScreen } from './screens/LessonScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { DEFAULT_SETTINGS, validateSettings, type Settings } from './settings';
import { STORAGE_KEYS, createStorage, detectBackend, type AppStorage } from './storage';

type GameRoute = Exclude<Route, { readonly name: 'home' } | { readonly name: 'settings' }>;
type ProgressByGame = Readonly<Record<GameId, LessonProgress>>;

function readProgress(storage: AppStorage): ProgressByGame {
  return {
    chess: storage.read(STORAGE_KEYS.chessProgress, validateProgress) ?? EMPTY_PROGRESS,
    draughts: storage.read(STORAGE_KEYS.draughtsProgress, validateProgress) ?? EMPTY_PROGRESS,
  };
}

export function App() {
  const storage = useMemo(() => createStorage(detectBackend()), []);
  const [settings, setSettings] = useState<Settings>(() => storage.read(STORAGE_KEYS.settings, validateSettings) ?? DEFAULT_SETTINGS);
  const [progress, setProgress] = useState<ProgressByGame>(() => readProgress(storage));
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

  const renderGame = <Pos, Move extends MoveShape>(kit: GameKit<Pos, Move>, current: GameRoute) => {
    const done = progress[kit.id];
    const openLesson = (lessonId: string) => go({ name: 'lesson', game: kit.id, lessonId });
    const completeLesson = (lessonId: string) => {
      const next = markCompleted(done, lessonId);
      setProgress({ ...progress, [kit.id]: next });
      storage.write(kit.progressKey, next);
    };
    const lessonList = (
      <LessonListScreen lessons={kit.lessons} progress={done} onOpen={openLesson} onBack={() => go({ name: 'menu', game: kit.id })} />
    );
    switch (current.name) {
      case 'menu':
        return (
          <GameMenuScreen
            game={kit.id}
            title={kit.title}
            onNavigate={go}
            hasSavedGame={hasSavedGame(kit, storage)}
            completedCount={kit.lessons.filter((lesson) => isCompleted(done, lesson.id)).length}
            totalLessons={kit.lessons.length}
            notice={menuNotice}
          />
        );
      case 'lessons':
        return lessonList;
      case 'lesson': {
        const index = kit.lessons.findIndex((lesson) => lesson.id === current.lessonId);
        if (index < 0) return lessonList;
        const lesson = kit.lessons[index];
        return (
          <LessonScreen
            key={`${lesson.id}-${version}`}
            kit={kit}
            lesson={lesson}
            nextLesson={kit.lessons[index + 1]}
            sound={settings.sound}
            onComplete={completeLesson}
            onOpen={openLesson}
            onBack={() => go({ name: 'lessons', game: kit.id })}
          />
        );
      }
      case 'play':
        return <NewGame key={version} kit={kit} setup={current.setup} storage={storage} sound={settings.sound} />;
      case 'resume':
        return (
          <ResumeGame
            key={version}
            kit={kit}
            storage={storage}
            sound={settings.sound}
            onFailure={(message) => {
              setMenuNotice(message);
              navigate({ name: 'menu', game: kit.id });
            }}
          />
        );
    }
  };

  const home = <HomeScreen onNavigate={go} storageAvailable={storage.available} />;
  if (route.name === 'home') return home;
  if (route.name === 'settings') {
    return <SettingsScreen settings={settings} onChange={updateSettings} onBack={() => go({ name: 'home' })} />;
  }
  const game = route.name === 'play' ? route.setup.game : route.game;
  return withKit(game, <Pos, Move extends MoveShape>(kit: GameKit<Pos, Move>) => renderGame(kit, route)) ?? home;
}
