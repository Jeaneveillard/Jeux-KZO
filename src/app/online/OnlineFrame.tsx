import type { ComponentChildren } from 'preact';
import type { OnlineConnection } from './useOnlineApi';

interface OnlineFrameProps {
  readonly title: string;
  readonly backLabel: string;
  readonly onBack: () => void;
  readonly children: ComponentChildren;
}

/** Cadre commun des écrans en ligne : barre du haut avec retour. */
export function OnlineFrame({ title, backLabel, onBack, children }: OnlineFrameProps) {
  return (
    <section class="screen">
      <header class="topbar">
        <button type="button" class="back" aria-label={backLabel} onClick={onBack}>
          ←
        </button>
        <h1>{title}</h1>
      </header>
      {children}
    </section>
  );
}

/** Tant que le serveur n'est pas prêt : « Connexion… », ou l'erreur avec « Réessayer ». */
export function ConnectionNotice({ connection }: { readonly connection: OnlineConnection }) {
  if (!connection.error) {
    return (
      <p class="status-line" role="status">
        Connexion au jeu en ligne…
      </p>
    );
  }
  return (
    <div class="banner" role="alert">
      <span>{connection.error}</span>
      <button type="button" class="btn btn-small" onClick={connection.retry}>
        Réessayer
      </button>
    </div>
  );
}
