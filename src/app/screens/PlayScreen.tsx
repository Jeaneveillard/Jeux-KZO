import { useEffect, useMemo, useState } from 'preact/hooks';
import { Board } from '../../board/Board';
import { chessGeometry } from '../../board/geometry';
import { targetsOf } from '../../board/move-input';
import { checkedKingSquare, turnOf } from '../../chess/adapter';
import { getChessEngine } from '../../chess/engine';
import { explainResult } from '../../chess/explain';
import { capturedPieces, chessBoardPieces } from '../../chess/view';
import { opposite } from '../../core/types';
import { CapturedRow } from '../components/CapturedRow';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EndDialog } from '../components/EndDialog';
import { PromotionPicker } from '../components/PromotionPicker';
import { lastMove } from '../game/session';
import { useChessGame, type ChessGame, type ChessSession } from '../game/useChessGame';
import { modeTitle } from '../labels';
import type { AppStorage } from '../storage';

interface PlayScreenProps {
  readonly initial: ChessSession;
  readonly storage: AppStorage;
  readonly sound: boolean;
  readonly notice?: string | null;
  readonly onExit: () => void;
  readonly onNewGame: () => void;
}

function statusText(game: ChessGame): string {
  const { session, position } = game;
  const viewer = session.setup.mode === 'ai' ? session.setup.playerColor : null;
  if (session.result.kind !== 'ongoing') return explainResult(session.result, viewer).title;
  if (game.thinking) return "L'ordinateur réfléchit…";
  if (game.checking) return 'Un instant…';
  const inCheck = checkedKingSquare(position) !== null;
  if (session.setup.mode === 'local') {
    return `Au tour des ${turnOf(position) === 'white' ? 'Blancs' : 'Noirs'}${inCheck ? ' : échec !' : ''}`;
  }
  return inCheck ? 'À toi de jouer : ton roi est en échec !' : 'À toi de jouer';
}

export function PlayScreen(props: PlayScreenProps) {
  const game = useChessGame(props.initial, { engine: getChessEngine, storage: props.storage, sound: props.sound });
  const { session, position } = game;
  const [confirmResign, setConfirmResign] = useState(false);
  const [endDismissed, setEndDismissed] = useState(false);
  const bottom = session.setup.mode === 'ai' ? session.setup.playerColor : 'white';
  const geometry = useMemo(() => chessGeometry(bottom), [bottom]);
  const last = lastMove(session);
  const captured = capturedPieces(position);
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
      <CapturedRow color={bottom} pieces={captured[bottom]} />
      <div class="board-wrap">
        <Board
          geometry={geometry}
          pieces={chessBoardPieces(position)}
          selected={game.input.selected}
          targets={targetsOf(game.input.selected, game.legal)}
          highlights={last ? [last.from, last.to] : []}
          check={checkedKingSquare(position)}
          arrows={game.hint ? [game.hint.move] : []}
          animate={last}
          onSquareTap={game.tap}
          onDrop={game.drop}
          canDrag={(square) => game.legal.some((move) => move.from === square)}
        />
      </div>
      <CapturedRow color={opposite(bottom)} pieces={captured[opposite(bottom)]} />
      <p class="status-line" role="status">
        {statusText(game)}
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
          <button type="button" class="btn btn-small btn-danger" onClick={() => setConfirmResign(true)}>
            Abandonner
          </button>
        )}
        <button type="button" class="btn btn-small" onClick={props.onNewGame}>
          Nouvelle partie
        </button>
      </div>
      {game.promotionChoices && (
        <PromotionPicker color={turnOf(position)} choices={game.promotionChoices} onPick={game.choosePromotion} onCancel={game.cancelPromotion} />
      )}
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
          result={explainResult(session.result, viewer)}
          onReplay={props.onNewGame}
          onMenu={props.onExit}
          onClose={() => setEndDismissed(true)}
          onUndo={game.undoAvailable ? game.undo : undefined}
        />
      )}
    </section>
  );
}
