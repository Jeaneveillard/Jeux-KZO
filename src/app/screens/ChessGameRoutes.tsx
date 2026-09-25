import { useEffect, useState } from 'preact/hooks';
import { chessAdapter } from '../../chess/adapter';
import { loadSavedChessGame } from '../game/saved';
import { createSession, type GameSetup } from '../game/session';
import { NO_SAVED_GAME_MESSAGE } from '../menu';
import { navigate, replaceHash } from '../navigation';
import type { AppStorage } from '../storage';
import { PlayScreen } from './PlayScreen';

interface GameRouteProps {
  readonly storage: AppStorage;
  readonly sound: boolean;
}

/** Nouvelle partie ; l'adresse devient « reprendre » pour qu'un rechargement retrouve cette partie. */
export function NewChessGame({ setup, storage, sound }: GameRouteProps & { readonly setup: GameSetup }) {
  const [initial] = useState(() => createSession(chessAdapter, setup, chessAdapter.initial()));
  useEffect(() => replaceHash({ name: 'chess-resume' }), []);
  return (
    <PlayScreen
      initial={initial}
      storage={storage}
      sound={sound}
      onExit={() => navigate({ name: 'chess-menu' })}
      onNewGame={() => navigate({ name: 'chess-play', setup })}
    />
  );
}

export function ChessResume({ storage, sound, onFailure }: GameRouteProps & { readonly onFailure: (message: string) => void }) {
  const [loaded] = useState(() => loadSavedChessGame(storage));
  useEffect(() => {
    if (loaded.kind !== 'ok') onFailure(loaded.kind === 'error' ? loaded.message : NO_SAVED_GAME_MESSAGE);
  }, []);
  if (loaded.kind !== 'ok') return null;
  const setup = loaded.session.setup;
  return (
    <PlayScreen
      initial={loaded.session}
      storage={storage}
      sound={sound}
      onExit={() => navigate({ name: 'chess-menu' })}
      onNewGame={() => navigate({ name: 'chess-play', setup })}
    />
  );
}
