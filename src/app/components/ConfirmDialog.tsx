interface ConfirmDialogProps {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  return (
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div class="modal">
        <h2 id="confirm-title">{props.title}</h2>
        <p>{props.message}</p>
        <button type="button" class="btn btn-primary" onClick={props.onCancel}>
          {props.cancelLabel}
        </button>
        <button type="button" class="btn btn-small btn-danger" onClick={props.onConfirm}>
          {props.confirmLabel}
        </button>
      </div>
    </div>
  );
}
