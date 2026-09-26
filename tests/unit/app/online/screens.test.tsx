import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { chessKit } from '../../../../src/app/games/chess';
import { JoinScreen } from '../../../../src/app/online/JoinScreen';
import { OnlineGameScreen } from '../../../../src/app/online/OnlineGameScreen';
import { OnlineMenuScreen } from '../../../../src/app/online/OnlineMenuScreen';
import type { OnlineConnection } from '../../../../src/app/online/useOnlineApi';
import { OnlineError } from '../../../../src/online/errors';
import { onlineGame } from '../../online/fixtures';
import { fakeApi } from './fake-api';

type Fake = ReturnType<typeof fakeApi>;

function connected(fake: Fake = fakeApi()): OnlineConnection {
  return { api: fake.api, userId: 'moi', error: null, retry: vi.fn() };
}

function menu(fake: Fake, pseudo: string | null, onNavigate = vi.fn()) {
  render(<OnlineMenuScreen game="chess" title="Échecs" connection={connected(fake)} pseudo={pseudo} onPseudo={vi.fn()} onNavigate={onNavigate} />);
  return onNavigate;
}

function gameScreen(fake: Fake, onNavigate = vi.fn()) {
  render(<OnlineGameScreen kit={chessKit} api={fake.api} userId="moi" code="K7M2QX" sound={false} onNavigate={onNavigate} />);
  return onNavigate;
}

afterEach(() => {
  delete (navigator as { clipboard?: unknown }).clipboard;
});

describe('écran « En ligne »', () => {
  it('demande d’abord un pseudo', () => {
    const onPseudo = vi.fn();
    render(<OnlineMenuScreen game="chess" title="Échecs" connection={connected()} pseudo={null} onPseudo={onPseudo} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.getByRole('alert').textContent).toBe('Le pseudo doit faire de 1 à 20 caractères.');
    fireEvent.input(screen.getByLabelText('Ton pseudo'), { target: { value: ' Alice ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(onPseudo).toHaveBeenCalledWith('Alice');
  });

  it('explique une panne et propose de réessayer', () => {
    const connection: OnlineConnection = { api: null, userId: null, error: 'Le jeu en ligne est momentanément indisponible.', retry: vi.fn() };
    render(<OnlineMenuScreen game="chess" title="Échecs" connection={connection} pseudo="Alice" onPseudo={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByRole('alert').textContent).toContain('momentanément indisponible');
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(connection.retry).toHaveBeenCalled();
  });

  it('crée une partie avec la couleur choisie', async () => {
    const fake = fakeApi(onlineGame({ status: 'attente', black: { id: null, pseudo: null } }));
    const onNavigate = menu(fake, 'Alice');
    fireEvent.click(screen.getByRole('button', { name: 'Noirs' }));
    fireEvent.click(screen.getByRole('button', { name: 'Créer la partie' }));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith({ name: 'onlineGame', game: 'chess', code: 'K7M2QX' }));
    expect(fake.api.createGame).toHaveBeenCalledWith('chess', 'black', 'Alice');
  });

  it('rejoint avec un code et refuse un code mal formé', async () => {
    const fake = fakeApi();
    const onNavigate = menu(fake, 'Bob');
    const input = screen.getByLabelText('Code de la partie');
    fireEvent.input(input, { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre' }));
    expect(screen.getByRole('alert').textContent).toBe('Le code fait 6 caractères (lettres et chiffres).');
    fireEvent.input(input, { target: { value: 'k7m 2qx' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre' }));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith({ name: 'onlineGame', game: 'chess', code: 'K7M2QX' }));
    expect(fake.api.joinGame).toHaveBeenCalledWith('K7M2QX', 'Bob');
  });

  it('affiche le refus du serveur', async () => {
    const fake = fakeApi();
    fake.api.joinGame.mockRejectedValueOnce(new OnlineError('partie_complete'));
    menu(fake, 'Bob');
    fireEvent.input(screen.getByLabelText('Code de la partie'), { target: { value: 'K7M2QX' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Cette partie a déjà ses deux joueurs.'));
  });

  it('liste mes parties, à mon tour d’abord', async () => {
    const fake = fakeApi();
    fake.api.listGames.mockResolvedValueOnce([onlineGame({ code: 'CCCCCC', moves: ['e2e4'] }), onlineGame({ code: 'BBBBBB' })]);
    const onNavigate = menu(fake, 'Alice');
    const [first, second] = await screen.findAllByRole('button', { name: /Contre Bob/ });
    expect(first.textContent).toContain('À toi de jouer');
    expect(second.textContent).toContain("C'est à Bob de jouer");
    fireEvent.click(first);
    expect(onNavigate).toHaveBeenCalledWith({ name: 'onlineGame', game: 'chess', code: 'BBBBBB' });
  });
});

describe('lien d’invitation', () => {
  it('rejoint la partie dès que le pseudo est connu', async () => {
    const fake = fakeApi();
    const onJoined = vi.fn();
    const onPseudo = vi.fn();
    const props = { code: 'K7M2QX', onPseudo, onJoined, onHome: vi.fn() };
    const view = render(<JoinScreen {...props} connection={connected(fake)} pseudo={null} />);
    fireEvent.input(screen.getByLabelText('Ton pseudo'), { target: { value: 'Bob' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre la partie' }));
    expect(onPseudo).toHaveBeenCalledWith('Bob');
    expect(fake.api.joinGame).not.toHaveBeenCalled();
    view.rerender(<JoinScreen {...props} connection={connected(fake)} pseudo="Bob" />);
    await waitFor(() => expect(onJoined).toHaveBeenCalledWith(onlineGame()));
    expect(fake.api.joinGame).toHaveBeenCalledWith('K7M2QX', 'Bob');
  });

  it('explique un code inconnu', async () => {
    const fake = fakeApi();
    fake.api.joinGame.mockRejectedValueOnce(new OnlineError('code_inconnu'));
    const onHome = vi.fn();
    render(<JoinScreen code="ZZZZZZ" connection={connected(fake)} pseudo="Bob" onPseudo={vi.fn()} onJoined={vi.fn()} onHome={onHome} />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Ce code ne correspond à aucune partie.'));
    fireEvent.click(screen.getByRole('button', { name: 'Accueil' }));
    expect(onHome).toHaveBeenCalled();
  });
});

describe('partie en ligne', () => {
  it('attend l’ami : code, partage du lien et annulation', async () => {
    const fake = fakeApi(onlineGame({ status: 'attente', black: { id: null, pseudo: null } }));
    const writeText = vi.fn(async () => undefined);
    (navigator as { clipboard?: unknown }).clipboard = { writeText };
    const onNavigate = gameScreen(fake);
    expect((await screen.findByText('K7M2QX')).className).toBe('invite-code');
    expect(screen.getByRole('status').textContent).toBe('En attente de ton ami…');
    fireEvent.click(screen.getByRole('button', { name: 'Partager le lien' }));
    await screen.findByText('Lien copié : colle-le dans un message à ton ami.');
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/#\/rejoindre\/K7M2QX$/));
    fireEvent.click(screen.getByRole('button', { name: 'Annuler la partie' }));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith({ name: 'online', game: 'chess' }));
  });

  it('montre les joueurs, la présence de l’ami et à qui est le tour', async () => {
    const fake = fakeApi(onlineGame({ moves: ['e2e4'] }));
    gameScreen(fake);
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe("C'est à Bob de jouer (hors ligne pour l'instant)"));
    expect(screen.getByRole('img', { name: "Bob n'est pas en ligne" })).toBeTruthy();
    await waitFor(() => expect(fake.watching()).toBe(true));
    act(() => fake.presence(['moi', 'ami']));
    expect(screen.getByRole('status').textContent).toBe("C'est à Bob de jouer");
    expect(screen.getByRole('img', { name: 'Bob est en ligne' })).toBeTruthy();
    expect(screen.getByText('⚪ Alice (toi)')).toBeTruthy();
  });

  it('accepte la nulle proposée par l’ami', async () => {
    const fake = fakeApi(onlineGame({ drawOfferedBy: 'black' }));
    gameScreen(fake);
    expect(await screen.findByText('Bob propose la nulle.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Accepter' }));
    expect(await screen.findByRole('dialog', { name: 'Partie nulle' })).toBeTruthy();
    expect(fake.api.answerDraw).toHaveBeenCalledWith(onlineGame().id, true);
  });

  it('abandonne après confirmation', async () => {
    const fake = fakeApi();
    gameScreen(fake);
    fireEvent.click(await screen.findByRole('button', { name: 'Abandonner' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Abandonner' }));
    await waitFor(() => expect(fake.api.resign).toHaveBeenCalledWith(onlineGame().id));
  });

  it('rejoint la revanche lancée par l’ami', async () => {
    const fake = fakeApi(onlineGame({ status: 'terminee', result: { kind: 'win', winner: 'black', reason: 'resign' }, rematchCode: 'REVAN2' }));
    const onNavigate = gameScreen(fake);
    expect(await screen.findByText('Bob lance une revanche !')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Jouer la revanche' }));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith({ name: 'onlineGame', game: 'chess', code: 'REVAN2' }));
  });

  it('explique une partie introuvable', async () => {
    const onNavigate = gameScreen(fakeApi(null));
    expect((await screen.findByRole('alert')).textContent).toBe("Cette partie n'existe plus, ou ce n'est pas la tienne.");
    fireEvent.click(screen.getByRole('button', { name: 'Mes parties en ligne' }));
    expect(onNavigate).toHaveBeenCalledWith({ name: 'online', game: 'chess' });
  });
});
