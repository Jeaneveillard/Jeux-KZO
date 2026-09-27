import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';

const url = process.env.VITE_SUPABASE_URL ?? '';
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

type Row = Record<string, unknown>;

async function player(): Promise<{ client: SupabaseClient; id: string }> {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) throw new Error(`Connexion anonyme impossible (réglage activé ?) : ${error?.message}`);
  return { client, id: data.user.id };
}

async function call(client: SupabaseClient, fn: string, args: Row): Promise<Row> {
  const { data, error } = await client.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as Row;
}

/** `rejoindre_partie` renvoie une liste : la partie rejointe, ou rien si le code est inconnu. */
async function join(client: SupabaseClient, code: unknown, pseudo: string): Promise<Row[]> {
  const { data, error } = await client.rpc('rejoindre_partie', { p_code: code, p_pseudo: pseudo });
  if (error) throw new Error(error.message);
  return data as Row[];
}

async function failure(client: SupabaseClient, fn: string, args: Row): Promise<string> {
  const { error } = await client.rpc(fn, args);
  return error?.message ?? 'aucune erreur';
}

describe('parties en ligne (vrai serveur)', () => {
  let alice: Awaited<ReturnType<typeof player>>;
  let bob: Awaited<ReturnType<typeof player>>;
  let eve: Awaited<ReturnType<typeof player>>;

  beforeAll(async () => {
    [alice, bob, eve] = await Promise.all([player(), player(), player()]);
  });

  async function started(jeu = 'chess'): Promise<Row> {
    const created = await call(alice.client, 'creer_partie', { p_jeu: jeu, p_couleur: 'white', p_pseudo: 'Alice' });
    const [joined] = await join(bob.client, created.code, 'Bob');
    return joined;
  }

  it('crée et rejoint une partie par son code', async () => {
    const created = await call(alice.client, 'creer_partie', { p_jeu: 'chess', p_couleur: 'white', p_pseudo: '  Alice ' });
    expect(created).toMatchObject({ statut: 'attente', pseudo_blancs: 'Alice', blancs: alice.id, noirs: null, coups: [] });
    expect(String(created.code)).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    const [joined] = await join(bob.client, ` ${String(created.code).toLowerCase()} `, 'Bob');
    expect(joined).toMatchObject({ id: created.id, statut: 'en_cours', noirs: bob.id, pseudo_noirs: 'Bob' });
    expect(await join(bob.client, created.code, 'Bob')).toMatchObject([{ id: created.id }]);
    expect(await failure(eve.client, 'rejoindre_partie', { p_code: created.code, p_pseudo: 'Eve' })).toBe('partie_complete');
    expect(await join(eve.client, 'ZZZZZZ', 'Eve')).toEqual([]);
  });

  it('arbitre les coups : tour, ordre et format', async () => {
    const game = await started();
    const move = (who: typeof alice, numero: number, coup: string, resultat: unknown = null) =>
      ({ who, args: { p_partie: game.id, p_numero: numero, p_coup: coup, p_resultat: resultat } });
    const play = ({ who, args }: ReturnType<typeof move>) => call(who.client, 'jouer_coup', args);
    const refuse = ({ who, args }: ReturnType<typeof move>) => failure(who.client, 'jouer_coup', args);
    expect(await refuse(move(bob, 0, 'e7e5'))).toBe('pas_ton_tour');
    expect(await play(move(alice, 0, 'e2e4'))).toMatchObject({ coups: ['e2e4'] });
    expect(await refuse(move(bob, 0, 'e7e5'))).toBe('conflit');
    expect(await refuse(move(bob, 1, 'e7e9'))).toBe('coup_invalide');
    expect(await refuse(move(bob, 1, 'e7e5', { kind: 'win', winner: 'black', reason: 'resign' }))).toBe('resultat_invalide');
    expect(await play(move(bob, 1, 'e7e5'))).toMatchObject({ coups: ['e2e4', 'e7e5'], statut: 'en_cours' });
    const won = await play(move(alice, 2, 'd1h5', { kind: 'win', winner: 'white', reason: 'checkmate' }));
    expect(won).toMatchObject({ statut: 'terminee', resultat: { kind: 'win', winner: 'white', reason: 'checkmate' } });
    expect(await refuse(move(bob, 3, 'a7a6'))).toBe('partie_terminee');
  });

  it('cache les parties aux autres et interdit toute écriture directe', async () => {
    const game = await started('draughts');
    const { data } = await eve.client.from('parties').select('*').eq('id', game.id);
    expect(data).toEqual([]);
    expect(await failure(eve.client, 'jouer_coup', { p_partie: game.id, p_numero: 0, p_coup: '32-28', p_resultat: null })).toBe('partie_introuvable');
    const direct = await alice.client.from('parties').update({ statut: 'terminee' }).eq('id', game.id);
    expect(direct.error).not.toBeNull();
    expect(await failure(alice.client, 'ma_partie', { p_partie: game.id })).not.toBe('aucune erreur');
  });

  it('nulle proposée, refusée puis acceptée, et une seule revanche aux couleurs inversées', async () => {
    const game = await started();
    expect(await call(alice.client, 'proposer_nulle', { p_partie: game.id })).toMatchObject({ nulle_proposee_par: 'white' });
    expect(await failure(alice.client, 'repondre_nulle', { p_partie: game.id, p_accepte: true })).toBe('pas_de_proposition');
    expect(await call(bob.client, 'repondre_nulle', { p_partie: game.id, p_accepte: false })).toMatchObject({ nulle_proposee_par: null });
    await call(alice.client, 'proposer_nulle', { p_partie: game.id });
    const drawn = await call(bob.client, 'repondre_nulle', { p_partie: game.id, p_accepte: true });
    expect(drawn).toMatchObject({ statut: 'terminee', resultat: { kind: 'draw', reason: 'agreement' } });
    const [first, second] = await Promise.all([
      call(alice.client, 'lancer_revanche', { p_partie: game.id }),
      call(bob.client, 'lancer_revanche', { p_partie: game.id }),
    ]);
    expect(first.code).toBe(second.code);
    expect(first).toMatchObject({ statut: 'en_cours', blancs: bob.id, noirs: alice.id, pseudo_blancs: 'Bob' });
  });

  it('abandon, annulation et entrées invalides', async () => {
    const game = await started();
    expect(await call(bob.client, 'abandonner', { p_partie: game.id })).toMatchObject({
      statut: 'terminee',
      resultat: { kind: 'win', winner: 'white', reason: 'resign' },
    });
    const waiting = await call(alice.client, 'creer_partie', { p_jeu: 'draughts', p_couleur: 'black', p_pseudo: 'Alice' });
    expect(await failure(alice.client, 'abandonner', { p_partie: waiting.id })).toBe('adversaire_absent');
    await call(alice.client, 'annuler_partie', { p_partie: waiting.id });
    expect(await join(bob.client, waiting.code, 'Bob')).toEqual([]);
    expect(await failure(alice.client, 'annuler_partie', { p_partie: game.id })).toBe('partie_commencee');
    expect(await failure(alice.client, 'creer_partie', { p_jeu: 'chess', p_couleur: 'white', p_pseudo: '   ' })).toBe('entree_invalide');
    expect(await failure(alice.client, 'creer_partie', { p_jeu: 'chess', p_couleur: 'white', p_pseudo: 'x'.repeat(21) })).toBe('entree_invalide');
    expect(await failure(alice.client, 'creer_partie', { p_jeu: 'go', p_couleur: 'white', p_pseudo: 'Alice' })).toBe('entree_invalide');
  });

  it('limite les essais de codes inconnus', async () => {
    const guesser = await player();
    for (let attempt = 0; attempt < 20; attempt += 1) {
      expect(await join(guesser.client, 'ZZZZZZ', 'Mallory')).toEqual([]);
    }
    expect(await failure(guesser.client, 'rejoindre_partie', { p_code: 'ZZZZZZ', p_pseudo: 'Mallory' })).toBe('trop_d_essais');
  });
});
