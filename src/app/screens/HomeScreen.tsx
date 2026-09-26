import type { Route } from '../router';

interface HomeScreenProps {
  readonly onNavigate: (route: Route) => void;
  readonly storageAvailable: boolean;
}

export function HomeScreen({ onNavigate, storageAvailable }: HomeScreenProps) {
  return (
    <main class="screen">
      <h1>Échecs &amp; Dames</h1>
      <p class="muted">Apprends à jouer, puis affronte l'ordinateur ou un ami.</p>
      {!storageAvailable && (
        <p class="feedback feedback-info">
          Ton navigateur ne permet pas d'enregistrer : ta progression et tes parties ne seront pas sauvegardées.
        </p>
      )}
      <button type="button" class="btn" onClick={() => onNavigate({ name: 'menu', game: 'chess' })}>
        ♞ Échecs
        <span class="sub">Apprendre et jouer</span>
      </button>
      <button type="button" class="btn" onClick={() => onNavigate({ name: 'menu', game: 'draughts' })}>
        ⛂ Dames
        <span class="sub">Apprendre et jouer</span>
      </button>
      <button type="button" class="btn" onClick={() => onNavigate({ name: 'settings' })}>
        ⚙ Réglages
      </button>
    </main>
  );
}
