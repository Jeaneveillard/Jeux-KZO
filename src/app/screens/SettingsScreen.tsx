import type { Settings } from '../settings';

interface SettingsScreenProps {
  readonly settings: Settings;
  readonly onChange: (settings: Settings) => void;
  readonly onBack: () => void;
}

export function SettingsScreen({ settings, onChange, onBack }: SettingsScreenProps) {
  return (
    <section class="screen">
      <header class="topbar">
        <button type="button" class="back" aria-label="Retour à l'accueil" onClick={onBack}>
          ←
        </button>
        <h1>Réglages</h1>
      </header>
      <label class="card toggle">
        <span>Sons</span>
        <input type="checkbox" checked={settings.sound} onChange={(event) => onChange({ ...settings, sound: event.currentTarget.checked })} />
      </label>
      <div class="card">
        <h2>À propos</h2>
        <p class="muted">
          Moteur d'échecs : Stockfish (licence GPL-3.0). Pièces : « cburnett » (licence GPLv2+). Cette application est un logiciel
          libre sous licence GPL-3.0.
        </p>
      </div>
    </section>
  );
}
