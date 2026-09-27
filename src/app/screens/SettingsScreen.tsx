import { PSEUDO_MAX_LENGTH, cleanPseudo, type Settings } from '../settings';

interface SettingsScreenProps {
  readonly settings: Settings;
  readonly onChange: (settings: Settings) => void;
  readonly onBack: () => void;
}

export const SOURCE_CODE_URL = 'https://github.com/Jeaneveillard/Jeux-KZO';

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
      <label class="card" for="pseudo-reglages">
        <span>Pseudo pour le jeu en ligne</span>
        <input
          id="pseudo-reglages"
          class="text-input"
          type="text"
          maxLength={PSEUDO_MAX_LENGTH}
          value={settings.pseudo ?? ''}
          placeholder="Ton pseudo"
          onChange={(event) => onChange({ ...settings, pseudo: cleanPseudo(event.currentTarget.value) })}
        />
      </label>
      <div class="card">
        <h2>À propos</h2>
        <p class="muted">
          Moteur d'échecs : Stockfish (licence GPL-3.0). Pièces d'échecs : « cburnett » (licence GPLv2+). Moteur de dames : écrit
          pour cette application. Cette application est un logiciel libre sous licence GPL-3.0.
        </p>
        <a href={SOURCE_CODE_URL} target="_blank" rel="noopener noreferrer">
          Code source sur GitHub
        </a>
      </div>
    </section>
  );
}
