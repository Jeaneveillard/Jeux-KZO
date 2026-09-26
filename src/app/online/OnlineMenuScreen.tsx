import { useEffect, useState } from 'preact/hooks';
import type { GameId } from '../../core/types';
import type { OnlineApi } from '../../online/api';
import { normalizeCode } from '../../online/code';
import { onlineErrorMessage } from '../../online/errors';
import type { OnlineGame } from '../../online/types';
import { COLOR_CHOICES, resolveColor, type ColorChoice } from '../menu';
import type { Route } from '../router';
import { ConnectionNotice, OnlineFrame } from './OnlineFrame';
import { PseudoForm } from './PseudoForm';
import type { OnlineConnection } from './useOnlineApi';
import { listEntries } from './view';

interface OnlineMenuScreenProps {
  readonly game: GameId;
  readonly title: string;
  readonly connection: OnlineConnection;
  readonly pseudo: string | null;
  readonly onPseudo: (pseudo: string) => void;
  readonly onNavigate: (route: Route) => void;
}

/** Écran « En ligne » d'un jeu : pseudo au premier passage, puis créer, rejoindre, reprendre. */
export function OnlineMenuScreen({ game, title, connection, pseudo, onPseudo, onNavigate }: OnlineMenuScreenProps) {
  const { api, userId } = connection;
  let content;
  if (pseudo === null) content = <PseudoForm submitLabel="Continuer" onSubmit={onPseudo} />;
  else if (api && userId) content = <OnlineMenu game={game} api={api} userId={userId} pseudo={pseudo} onNavigate={onNavigate} />;
  else content = <ConnectionNotice connection={connection} />;
  return (
    <OnlineFrame title={`${title} en ligne`} backLabel="Retour au menu" onBack={() => onNavigate({ name: 'menu', game })}>
      {content}
    </OnlineFrame>
  );
}

interface OnlineMenuProps {
  readonly game: GameId;
  readonly api: OnlineApi;
  readonly userId: string;
  readonly pseudo: string;
  readonly onNavigate: (route: Route) => void;
}

function OnlineMenu({ game, api, userId, pseudo, onNavigate }: OnlineMenuProps) {
  const [color, setColor] = useState<ColorChoice>('white');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<readonly OnlineGame[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .listGames(game)
      .then((found) => {
        if (alive) setGames(found);
      })
      .catch((failure: unknown) => {
        if (alive) setListError(onlineErrorMessage(failure));
      });
    return () => {
      alive = false;
    };
  }, [api, game]);

  const open = (target: OnlineGame) => onNavigate({ name: 'onlineGame', game: target.game, code: target.code });

  const run = (action: () => Promise<OnlineGame>) => {
    setBusy(true);
    setError(null);
    action()
      .then(open)
      .catch((failure: unknown) => {
        setError(onlineErrorMessage(failure));
        setBusy(false);
      });
  };

  const join = (event: Event) => {
    event.preventDefault();
    const normalized = normalizeCode(code);
    if (normalized) run(() => api.joinGame(normalized, pseudo));
    else setError('Le code fait 6 caractères (lettres et chiffres).');
  };

  return (
    <>
      <p class="muted">Tu joues sous le pseudo « {pseudo} » (modifiable dans les réglages).</p>
      {error && (
        <p class="feedback feedback-error" role="alert">
          {error}
        </p>
      )}
      <div class="card">
        <h2>Créer une partie</h2>
        <div class="choices" role="group" aria-label="Couleur">
          {COLOR_CHOICES.map((choice) => (
            <button type="button" key={choice.value} class="choice" aria-pressed={color === choice.value} onClick={() => setColor(choice.value)}>
              {choice.label}
            </button>
          ))}
        </div>
        <button type="button" class="btn btn-primary" disabled={busy} onClick={() => run(() => api.createGame(game, resolveColor(color), pseudo))}>
          Créer la partie
        </button>
      </div>
      <form class="card" onSubmit={join}>
        <h2>Rejoindre avec un code</h2>
        <label for="code-partie">Code de la partie</label>
        <input id="code-partie" class="text-input" type="text" maxLength={9} value={code} onInput={(event) => setCode(event.currentTarget.value)} />
        <button type="submit" class="btn btn-primary" disabled={busy}>
          Rejoindre
        </button>
      </form>
      <div class="card">
        <h2>Mes parties en ligne</h2>
        {listError && <p class="feedback feedback-error">{listError}</p>}
        {!listError && games === null && <p class="muted">Chargement…</p>}
        {games?.length === 0 && <p class="muted">Aucune partie pour l'instant.</p>}
        {games &&
          listEntries(games, userId).map((entry) => (
            <button type="button" key={entry.game.id + entry.game.code} class="btn" onClick={() => open(entry.game)}>
              {entry.label}
              <span class="sub">{entry.detail}</span>
            </button>
          ))}
      </div>
    </>
  );
}
