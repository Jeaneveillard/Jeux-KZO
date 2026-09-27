import { useEffect, useState } from 'preact/hooks';
import { onlineErrorMessage } from '../../online/errors';
import type { OnlineGame } from '../../online/types';
import { ConnectionNotice, OnlineFrame } from './OnlineFrame';
import { PseudoForm } from './PseudoForm';
import type { OnlineConnection } from './useOnlineApi';

interface JoinScreenProps {
  readonly code: string;
  readonly connection: OnlineConnection;
  readonly pseudo: string | null;
  readonly onPseudo: (pseudo: string) => void;
  readonly onJoined: (game: OnlineGame) => void;
  readonly onHome: () => void;
}

/** Lien d'invitation : pseudo si besoin, puis arrivée dans la partie (ou dans la sienne si on y joue déjà). */
export function JoinScreen({ code, connection, pseudo, onPseudo, onJoined, onHome }: JoinScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const { api } = connection;

  useEffect(() => {
    if (!api || pseudo === null) return undefined;
    let alive = true;
    api
      .joinGame(code, pseudo)
      .then((game) => {
        if (alive) onJoined(game);
      })
      .catch((failure: unknown) => {
        if (alive) setError(onlineErrorMessage(failure));
      });
    return () => {
      alive = false;
    };
  }, [api, pseudo, code]);

  let content;
  if (pseudo === null) content = <PseudoForm submitLabel="Rejoindre la partie" onSubmit={onPseudo} />;
  else if (error) {
    content = (
      <>
        <p class="feedback feedback-error" role="alert">
          {error}
        </p>
        <button type="button" class="btn" onClick={onHome}>
          Accueil
        </button>
      </>
    );
  } else if (api) {
    content = (
      <p class="status-line" role="status">
        Arrivée dans la partie…
      </p>
    );
  } else content = <ConnectionNotice connection={connection} />;

  return (
    <OnlineFrame title="Rejoindre une partie" backLabel="Retour à l'accueil" onBack={onHome}>
      <p class="invite-code">{code}</p>
      {content}
    </OnlineFrame>
  );
}
