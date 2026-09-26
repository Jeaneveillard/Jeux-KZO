import { useEffect, useState } from 'preact/hooks';
import type { MoveShape } from '../../board/move-input';
import { loadSavedGame } from '../game/saved';
import { createSession, type GameSetup } from '../game/session';
import type { GameKit } from '../games/kit';
import { NO_SAVED_GAME_MESSAGE } from '../menu';
import { navigate, replaceHash } from '../navigation';
import type { AppStorage } from '../storage';
import { PlayScreen } from './PlayScreen';

interface GameRouteProps<Pos, Move extends MoveShape> {
  readonly kit: GameKit<Pos, Move>;
  readonly storage: AppStorage;
  readonly sound: boolean;
}

/** Nouvelle partie ; l'adresse devient « reprendre » pour qu'un rechargement retrouve cette partie. */
export function NewGame<Pos, Move extends MoveShape>({ kit, setup, storage, sound }: GameRouteProps<Pos, Move> & { readonly setup: GameSetup }) {
  const [initial] = useState(() => createSession(kit.adapter, setup, kit.adapter.initial()));
  useEffect(() => replaceHash({ name: 'resume', game: kit.id }), []);
  return (
    <PlayScreen
      kit={kit}
      initial={initial}
      storage={storage}
      sound={sound}
      onExit={() => navigate({ name: 'menu', game: kit.id })}
      onNewGame={() => navigate({ name: 'play', setup })}
    />
  );
}

export function ResumeGame<Pos, Move extends MoveShape>({
  kit,
  storage,
  sound,
  onFailure,
}: GameRouteProps<Pos, Move> & { readonly onFailure: (message: string) => void }) {
  const [loaded] = useState(() => loadSavedGame(kit, storage));
  useEffect(() => {
    if (loaded.kind !== 'ok') onFailure(loaded.kind === 'error' ? loaded.message : NO_SAVED_GAME_MESSAGE);
  }, []);
  if (loaded.kind !== 'ok') return null;
  const setup = loaded.session.setup;
  return (
    <PlayScreen
      kit={kit}
      initial={loaded.session}
      storage={storage}
      sound={sound}
      onExit={() => navigate({ name: 'menu', game: kit.id })}
      onNewGame={() => navigate({ name: 'play', setup })}
    />
  );
}
