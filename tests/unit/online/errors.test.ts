import { describe, expect, it } from 'vitest';
import { OnlineError, isOnlineError, onlineErrorMessage } from '../../../src/online/errors';

describe('erreurs du jeu en ligne', () => {
  it('traduit les codes du serveur en messages', () => {
    const error = OnlineError.fromServer('code_inconnu');
    expect(error.code).toBe('code_inconnu');
    expect(error.message).toBe('Ce code ne correspond à aucune partie.');
    expect(isOnlineError(error, 'code_inconnu')).toBe(true);
    expect(isOnlineError(error, 'conflit')).toBe(false);
  });

  it('considère tout autre message comme une panne', () => {
    expect(OnlineError.fromServer('TypeError: Failed to fetch').code).toBe('indisponible');
    expect(OnlineError.fromServer(undefined).message).toBe('Le jeu en ligne est momentanément indisponible.');
  });

  it('donne un message pour n’importe quelle erreur', () => {
    expect(onlineErrorMessage(new OnlineError('conflit'))).toBe('La partie a changé : rejoue ton coup.');
    expect(onlineErrorMessage(new Error('boum'))).toBe('Le jeu en ligne est momentanément indisponible.');
  });
});
