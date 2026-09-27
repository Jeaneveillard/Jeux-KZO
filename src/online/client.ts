import { createClient } from '@supabase/supabase-js';
import type { GameId } from '../core/types';
import type { Backend } from './backend';
import type { OnlineConfig } from './config';
import { OnlineError } from './errors';

const LIST_LIMIT = 50;
const REQUEST_TIMEOUT_MS = 15_000;

/** Une requête sans réponse finit en panne (`indisponible`) au lieu de bloquer l'écran. */
function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new OnlineError('indisponible')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Serveur Supabase : session anonyme gardée sur le téléphone, fonctions `rpc`, lecture protégée par les règles d'accès. */
export function createSupabaseBackend(config: OnlineConfig): Backend {
  const supabase = createClient(config.url, config.key, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'jeux.en-ligne.session' },
  });
  let user: Promise<string> | null = null;

  const userId = (): Promise<string> => {
    user ??= (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) return data.session.user.id;
      const signed = await supabase.auth.signInAnonymously();
      if (signed.error || !signed.data.user) throw new OnlineError('non_connecte', signed.error);
      return signed.data.user.id;
    })().catch((error: unknown) => {
      user = null;
      throw error instanceof OnlineError ? error : OnlineError.fromServer(undefined);
    });
    return user;
  };

  /** Exécute une requête ; toute panne réseau ou absence de réponse devient une `OnlineError`. */
  const run = async <T>(request: () => PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> => {
    let response: { data: T; error: { message: string } | null };
    try {
      response = await withTimeout(
        (async () => {
          await userId();
          return request();
        })(),
        REQUEST_TIMEOUT_MS,
      );
    } catch (error) {
      throw error instanceof OnlineError ? error : new OnlineError('indisponible', error);
    }
    if (response.error) throw OnlineError.fromServer(response.error.message);
    return response.data;
  };

  return {
    userId,
    rpc: (fn, args) => run(() => supabase.rpc(fn, args)),
    listGames: async (game: GameId) =>
      (await run(() => supabase.from('parties').select('*').eq('jeu', game).order('maj_le', { ascending: false }).limit(LIST_LIMIT))) ?? [],
    findGame: (code) => run(() => supabase.from('parties').select('*').eq('code', code).maybeSingle()),
    watch: (gameId, me, handlers) => {
      // Un seul canal privé : changements de la ligne (règles d'accès de la table) et présence (règles sur realtime.messages).
      let stopped = false;
      const channel = supabase.channel(`partie:${gameId}`, { config: { private: true, presence: { key: me } } });
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'parties', filter: `id=eq.${gameId}` }, () => handlers.onChange())
        .on('presence', { event: 'sync' }, () => handlers.onPresence(Object.keys(channel.presenceState())))
        // L'écoute de la table démarre un peu après l'abonnement : on relit la partie pour ne rien manquer entre les deux.
        .on('system', {}, (payload: { extension?: string; status?: string }) => {
          if (!stopped && payload.extension === 'postgres_changes' && payload.status === 'ok') handlers.onChange();
        });
      void supabase.realtime.setAuth().then(() => {
        if (stopped) return;
        channel.subscribe(async (status) => {
          if (stopped) return;
          handlers.onConnection(status === 'SUBSCRIBED');
          if (status === 'SUBSCRIBED') await channel.track({ enLigne: true });
        });
      });
      return () => {
        stopped = true;
        void supabase.removeChannel(channel);
      };
    },
  };
}
