import { useState } from 'preact/hooks';
import { PSEUDO_MAX_LENGTH, cleanPseudo } from '../settings';

interface PseudoFormProps {
  readonly submitLabel: string;
  readonly onSubmit: (pseudo: string) => void;
}

/** Premier passage en ligne : le pseudo que verra l'ami (gardé ensuite dans les réglages). */
export function PseudoForm({ submitLabel, onSubmit }: PseudoFormProps) {
  const [value, setValue] = useState('');
  const [invalid, setInvalid] = useState(false);

  const submit = (event: Event) => {
    event.preventDefault();
    const pseudo = cleanPseudo(value);
    if (pseudo) onSubmit(pseudo);
    else setInvalid(true);
  };

  return (
    <form class="card" onSubmit={submit}>
      <label for="pseudo-en-ligne">Ton pseudo</label>
      <p class="muted">Ton ami le verra pendant la partie. Tu pourras le changer dans les réglages.</p>
      <input
        id="pseudo-en-ligne"
        class="text-input"
        type="text"
        maxLength={PSEUDO_MAX_LENGTH}
        value={value}
        onInput={(event) => {
          setValue(event.currentTarget.value);
          setInvalid(false);
        }}
      />
      {invalid && (
        <p class="feedback feedback-error" role="alert">
          Le pseudo doit faire de 1 à 20 caractères.
        </p>
      )}
      <button type="submit" class="btn btn-primary">
        {submitLabel}
      </button>
    </form>
  );
}
