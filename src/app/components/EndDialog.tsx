import type { ResultText } from '../../core/explain';

interface EndDialogProps {
  readonly result: ResultText;
  readonly onReplay: () => void;
  readonly onMenu: () => void;
  readonly onClose: () => void;
  readonly onUndo?: () => void;
  readonly replayLabel?: string;
  /** Information en plus (ex. « Marie lance une revanche ! »). */
  readonly note?: string;
}

export function EndDialog({ result, onReplay, onMenu, onClose, onUndo, replayLabel = 'Rejouer', note }: EndDialogProps) {
  return (
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="end-title">
      <div class="modal">
        <h2 id="end-title">{result.title}</h2>
        {result.detail && <p>{result.detail}</p>}
        {note && <p class="feedback feedback-info">{note}</p>}
        <button type="button" class="btn btn-primary" onClick={onReplay}>
          {replayLabel}
        </button>
        {onUndo && (
          <button type="button" class="btn btn-small" onClick={onUndo}>
            Annuler mon dernier coup
          </button>
        )}
        <div class="actions">
          <button type="button" class="btn btn-small" onClick={onClose}>
            Voir le plateau
          </button>
          <button type="button" class="btn btn-small" onClick={onMenu}>
            Menu
          </button>
        </div>
      </div>
    </div>
  );
}
