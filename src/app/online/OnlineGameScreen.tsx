import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import type { MoveShape } from '../../board/move-input';
import { opposite, type Color } from '../../core/types';
import type { OnlineApi } from '../../online/api';
import type { OnlineGame } from '../../online/types';
import { BoardView } from '../components/BoardView';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EndDialog } from '../components/EndDialog';
import { currentPosition, lastMove } from '../game/session';
import type { GameKit } from '../games/kit';
import type { Route } from '../router';
import { OnlineFrame } from './OnlineFrame';
import { useOnlineGame, type OnlineGameController } from './useOnlineGame';
import { onlineStatusText } from './view';
import { WaitingRoom } from './WaitingRoom';

interface OnlineGameScreenProps<Pos, Move extends MoveShape> {
  readonly kit: GameKit<Pos, Move>;
  readonly api: OnlineApi;
  readonly userId: string;
  readonly code: string;
  readonly sound: boolean;
  readonly onNavigate: (route: Route) => void;
}

interface PlayersProps {
  readonly game: OnlineGame;
  readonly myColor: Color | null;
  readonly opponentOnline: boolean;
}

/** « ⚪ Alice (toi) … ● ⚫ Bob » : le point vert indique que l'ami a l'app ouverte sur cette partie. */
function Players({ game, myColor, opponentOnline }: PlayersProps) {
  const opponent = opposite(myColor ?? 'white');
  const seat = (color: Color) => (color === 'white' ? game.white : game.black);
  const name = (color: Color) => seat(color).pseudo ?? '…';
  return (
    <p class="players">
      {(['white', 'black'] as const).map((color) => (
        <span key={color}>
          {color === opponent && seat(color).id !== null && (
            <span
              class={opponentOnline ? 'presence presence-on' : 'presence'}
              role="img"
              aria-label={opponentOnline ? `${name(color)} est en ligne` : `${name(color)} n'est pas en ligne`}
            />
          )}
          {`${color === 'white' ? '⚪' : '⚫'} ${name(color)}${color === myColor ? ' (toi)' : ''}`}
        </span>
      ))}
    </p>
  );
}

function statusLine<Pos, Move extends MoveShape>(kit: GameKit<Pos, Move>, online: OnlineGameController<Pos, Move>): string {
  const { game, view } = online;
  if (!game || !view) return '';
  const text = onlineStatusText(game, view, { connected: online.connected, opponentOnline: online.opponentOnline });
  if (text === 'Partie terminée') return kit.explainResult(view.result, view.myColor).title;
  const inCheck = text === 'À toi de jouer' && kit.checkSquare(currentPosition(view.session)) !== null;
  return inCheck ? 'À toi de jouer : ton roi est en échec !' : text;
}

export function OnlineGameScreen<Pos, Move extends MoveShape>(props: OnlineGameScreenProps<Pos, Move>) {
  const { kit, onNavigate } = props;
  const online = useOnlineGame(kit, props.api, props.userId, props.code, props.sound);
  const [confirmResign, setConfirmResign] = useState(false);
  const [endDismissed, setEndDismissed] = useState(false);
  const { game, view } = online;
  const toList = () => onNavigate({ name: 'online', game: kit.id });
  const frame = (content: ComponentChildren) => (
    <OnlineFrame title={`${kit.title} en ligne`} backLabel="Retour à mes parties" onBack={toList}>
      {content}
    </OnlineFrame>
  );

  if (online.error) {
    return frame(
      <>
        <p class="feedback feedback-error" role="alert">
          {online.error}
        </p>
        <button type="button" class="btn" onClick={toList}>
          Mes parties en ligne
        </button>
      </>,
    );
  }
  if (!game || !view) {
    return frame(
      <p class="status-line" role="status">
        Chargement de la partie…
      </p>,
    );
  }

  const finished = game.status === 'terminee';
  const dialogOpen = finished && !endDismissed;
  const playing = game.status === 'en_cours';
  const offerFromFriend = playing && game.drawOfferedBy !== null && game.drawOfferedBy !== view.myColor;
  const rematch = () => {
    void online.rematch().then((code) => {
      if (code) onNavigate({ name: 'onlineGame', game: kit.id, code });
    });
  };
  const cancel = () => {
    void online.cancel().then((done) => {
      if (done) toList();
    });
  };
  const status = (
    <p class="status-line" role="status">
      {statusLine(kit, online)}
    </p>
  );

  if (game.status === 'attente') {
    return frame(
      <>
        {status}
        <WaitingRoom code={game.code} title={kit.title} onCancel={cancel} />
      </>,
    );
  }

  return frame(
    <>
      <Players game={game} myColor={view.myColor} opponentOnline={online.opponentOnline} />
      <BoardView
        kit={kit}
        position={currentPosition(view.session)}
        bottom={view.myColor ?? 'white'}
        legal={online.legal}
        input={online.input.input}
        last={lastMove(view.session)}
        choices={online.input.choices}
        onTap={online.input.tap}
        onDrop={online.input.drop}
        onChoose={online.input.choose}
        onCancelChoice={online.input.cancelChoice}
      />
      {status}
      {online.notice && (
        <p class="feedback feedback-info" role="alert">
          {online.notice}
        </p>
      )}
      {offerFromFriend && (
        <div class="card">
          <p>{view.opponentName} propose la nulle.</p>
          <div class="actions">
            <button type="button" class="btn btn-small btn-primary" disabled={online.busy} onClick={() => online.answerDraw(true)}>
              Accepter
            </button>
            <button type="button" class="btn btn-small" disabled={online.busy} onClick={() => online.answerDraw(false)}>
              Refuser
            </button>
          </div>
        </div>
      )}
      {playing && game.drawOfferedBy === view.myColor && (
        <p class="feedback feedback-info">Nulle proposée : {view.opponentName} peut accepter ou refuser.</p>
      )}
      {!dialogOpen && (
        <div class="actions">
          {playing && (
            <button
              type="button"
              class="btn btn-small"
              onClick={online.offerDraw}
              disabled={online.busy || !online.connected || game.drawOfferedBy !== null || view.invalidMove}
            >
              Proposer la nulle
            </button>
          )}
          {playing && (
            <button type="button" class="btn btn-small btn-danger" onClick={() => setConfirmResign(true)} disabled={online.busy || !online.connected}>
              Abandonner
            </button>
          )}
          {finished && (
            <button type="button" class="btn btn-small btn-primary" onClick={rematch}>
              {game.rematchCode ? 'Jouer la revanche' : 'Revanche'}
            </button>
          )}
          <button type="button" class="btn btn-small" onClick={toList}>
            Menu
          </button>
        </div>
      )}
      {confirmResign && (
        <ConfirmDialog
          title="Abandonner ?"
          message="Tu perdras la partie."
          confirmLabel="Abandonner"
          cancelLabel="Continuer à jouer"
          onConfirm={() => {
            setConfirmResign(false);
            online.resign();
          }}
          onCancel={() => setConfirmResign(false)}
        />
      )}
      {dialogOpen && (
        <EndDialog
          result={kit.explainResult(view.result, view.myColor)}
          replayLabel={game.rematchCode ? 'Jouer la revanche' : 'Revanche'}
          note={game.rematchCode ? `${view.opponentName} lance une revanche !` : undefined}
          onReplay={rematch}
          onMenu={toList}
          onClose={() => setEndDismissed(true)}
        />
      )}
    </>,
  );
}
