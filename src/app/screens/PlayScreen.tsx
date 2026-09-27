import { useEffect, useState } from 'preact/hooks';
import type { MoveShape } from '../../board/move-input';
import { BoardView } from '../components/BoardView';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EndDialog } from '../components/EndDialog';
import { lastMove, type Session } from '../game/session';
import { useGame, type GameController } from '../game/useGame';
import type { GameKit } from '../games/kit';
import { modeTitle } from '../labels';
import type { AppStorage } from '../storage';

interface PlayScreenProps<Pos, Move extends MoveShape> {
  readonly kit: GameKit<Pos, Move>;
  readonly initial: Session<Pos, Move>;
  readonly storage: AppStorage;
  readonly sound: boolean;
  readonly notice?: string | null;
  readonly onExit: () => void;
  readonly onNewGame: () => void;
}

function statusText<Pos, Move extends MoveShape>(kit: GameKit<Pos, Move>, game: GameController<Pos, Move>): string {
  const { session, position } = game;
  const viewer = session.setup.mode === 'ai' ? session.setup.playerColor : null;
  if (session.result.kind !== 'ongoing') return kit.explainResult(session.result, viewer).title;
  if (game.thinking) return "L'ordinateur réfléchit…";
  if (game.checking) return 'Un instant…';
  const inCheck = kit.checkSquare(position) !== null;
  if (session.setup.mode === 'local') {
    return `Au tour des ${kit.adapter.turn(position) === 'white' ? 'Blancs' : 'Noirs'}${inCheck ? ' : échec !' : ''}`;
  }
  return inCheck ? 'À toi de jouer : ton roi est en échec !' : 'À toi de jouer';
}

export function PlayScreen<Pos, Move extends MoveShape>(props: PlayScreenProps<Pos, Move>) {
  const { kit } = props;
  const game = useGame(props.initial, kit, { engine: kit.engine, storage: props.storage, sound: props.sound });
  const { session, position } = game;
  const [confirmResign, setConfirmResign] = useState(false);
  const [endDismissed, setEndDismissed] = useState(false);
  const bottom = session.setup.mode === 'ai' ? session.setup.playerColor : 'white';
  const last = lastMove(session);
  const finished = session.result.kind !== 'ongoing';
  const viewer = session.setup.mode === 'ai' ? session.setup.playerColor : null;

  useEffect(() => {
    if (!finished) setEndDismissed(false);
  }, [finished]);

  return (
    <section class="screen">
      <header class="topbar">
        <button type="button" class="back" aria-label="Retour au menu" onClick={props.onExit}>
          ←
        </button>
        <h1>{modeTitle(session.setup)}</h1>
      </header>
      {props.notice && <p class="feedback feedback-info">{props.notice}</p>}
      <BoardView
        kit={kit}
        position={position}
        bottom={bottom}
        legal={game.legal}
        input={game.input}
        last={last}
        arrow={game.hint?.move ?? null}
        choices={game.choices}
        onTap={game.tap}
        onDrop={game.drop}
        onChoose={game.choose}
        onCancelChoice={game.cancelChoice}
      />
      <p class="status-line" role="status">
        {statusText(kit, game)}
      </p>
      {game.hint && <p class="feedback feedback-info">💡 {game.hint.text}</p>}
      {game.engineError && (
        <div class="banner" role="alert">
          <span>{game.engineError}</span>
          <button type="button" class="btn btn-small" onClick={game.retryEngine}>
            Réessayer
          </button>
        </div>
      )}
      <div class="actions">
        {game.faibleHelp && (
          <button type="button" class="btn btn-small" onClick={game.requestHint} disabled={!game.humanTurn || game.checking}>
            Indice
          </button>
        )}
        {game.faibleHelp && (
          <button type="button" class="btn btn-small" onClick={game.undo} disabled={!game.undoAvailable}>
            Annuler
          </button>
        )}
        {!finished && (
          <button type="button" class="btn btn-small btn-danger" onClick={() => setConfirmResign(true)} disabled={game.checking}>
            Abandonner
          </button>
        )}
        <button type="button" class="btn btn-small" onClick={props.onNewGame}>
          Nouvelle partie
        </button>
      </div>
      {game.blunder && (
        <ConfirmDialog
          title="Attention !"
          message={game.blunder.message}
          confirmLabel="Jouer quand même"
          cancelLabel="Choisir un autre coup"
          onConfirm={game.confirmBlunder}
          onCancel={game.cancelBlunder}
        />
      )}
      {confirmResign && (
        <ConfirmDialog
          title="Abandonner ?"
          message="Tu perdras la partie."
          confirmLabel="Abandonner"
          cancelLabel="Continuer à jouer"
          onConfirm={() => {
            setConfirmResign(false);
            game.resignGame();
          }}
          onCancel={() => setConfirmResign(false)}
        />
      )}
      {finished && !endDismissed && (
        <EndDialog
          result={kit.explainResult(session.result, viewer)}
          onReplay={props.onNewGame}
          onMenu={props.onExit}
          onClose={() => setEndDismissed(true)}
          onUndo={game.undoAvailable ? game.undo : undefined}
        />
      )}
    </section>
  );
}
