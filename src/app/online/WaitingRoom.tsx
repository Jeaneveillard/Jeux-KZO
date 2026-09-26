import { useState } from 'preact/hooks';
import { inviteLink } from '../../online/code';
import { shareInvite, type ShareOutcome } from './share';

interface WaitingRoomProps {
  readonly code: string;
  readonly title: string;
  readonly onCancel: () => void;
}

const SHARE_FEEDBACK: Readonly<Record<ShareOutcome, string | null>> = {
  shared: null,
  cancelled: null,
  copied: 'Lien copié : colle-le dans un message à ton ami.',
  failed: "Le partage n'a pas marché : donne le code à ton ami.",
};

/** Partie créée, ami pas encore arrivé : le code, le lien à partager, l'annulation. */
export function WaitingRoom({ code, title, onCancel }: WaitingRoomProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const share = () => {
    void shareInvite(inviteLink(window.location.href, code), title).then((outcome) => setFeedback(SHARE_FEEDBACK[outcome]));
  };
  return (
    <div class="card">
      <h2>Invite ton ami</h2>
      <p class="muted">Donne-lui ce code, ou envoie-lui le lien :</p>
      <p class="invite-code">{code}</p>
      <button type="button" class="btn btn-primary" onClick={share}>
        Partager le lien
      </button>
      {feedback && (
        <p class="feedback feedback-info" aria-live="polite">
          {feedback}
        </p>
      )}
      <p class="muted">La partie commence dès que ton ami la rejoint.</p>
      <button type="button" class="btn btn-small btn-danger" onClick={onCancel}>
        Annuler la partie
      </button>
    </div>
  );
}
