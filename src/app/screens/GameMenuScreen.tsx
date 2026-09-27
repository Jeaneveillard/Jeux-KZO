import { useState } from 'preact/hooks';
import { LEVELS_ORDER, type GameId, type Level } from '../../core/types';
import { LEVEL_LABELS } from '../labels';
import { COLOR_CHOICES, resolveColor, type ColorChoice } from '../menu';
import type { Route } from '../router';

interface GameMenuScreenProps {
  readonly game: GameId;
  readonly title: string;
  readonly onNavigate: (route: Route) => void;
  readonly hasSavedGame: boolean;
  readonly completedCount: number;
  readonly totalLessons: number;
  readonly notice: string | null;
}

export function GameMenuScreen({ game, title, onNavigate, hasSavedGame, completedCount, totalLessons, notice }: GameMenuScreenProps) {
  const [level, setLevel] = useState<Level>('faible');
  const [color, setColor] = useState<ColorChoice>('white');

  return (
    <section class="screen">
      <header class="topbar">
        <button type="button" class="back" aria-label="Retour à l'accueil" onClick={() => onNavigate({ name: 'home' })}>
          ←
        </button>
        <h1>{title}</h1>
      </header>
      {notice && (
        <p class="feedback feedback-info" role="status">
          {notice}
        </p>
      )}
      {hasSavedGame && (
        <button type="button" class="btn btn-primary" onClick={() => onNavigate({ name: 'resume', game })}>
          Reprendre la partie
        </button>
      )}
      <button type="button" class="btn" onClick={() => onNavigate({ name: 'lessons', game })}>
        Apprendre à jouer
        <span class="sub">
          {completedCount} / {totalLessons} leçons terminées
        </span>
      </button>
      <div class="card">
        <h2>Contre l'ordinateur</h2>
        <div class="choices" role="group" aria-label="Niveau">
          {LEVELS_ORDER.map((value) => (
            <button type="button" key={value} class="choice" aria-pressed={level === value} onClick={() => setLevel(value)}>
              {LEVEL_LABELS[value].name}
            </button>
          ))}
        </div>
        <p class="muted">{LEVEL_LABELS[level].description}</p>
        <div class="choices" role="group" aria-label="Couleur">
          {COLOR_CHOICES.map((choice) => (
            <button type="button" key={choice.value} class="choice" aria-pressed={color === choice.value} onClick={() => setColor(choice.value)}>
              {choice.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          class="btn btn-primary"
          onClick={() => onNavigate({ name: 'play', setup: { game, mode: 'ai', level, playerColor: resolveColor(color) } })}
        >
          Jouer
        </button>
      </div>
      <button
        type="button"
        class="btn"
        onClick={() => onNavigate({ name: 'play', setup: { game, mode: 'local', level: null, playerColor: 'white' } })}
      >
        2 joueurs sur ce téléphone
        <span class="sub">Chacun son tour, sur le même écran</span>
      </button>
      <button type="button" class="btn" onClick={() => onNavigate({ name: 'online', game })}>
        En ligne
        <span class="sub">Contre un ami, avec un code ou un lien</span>
      </button>
    </section>
  );
}
