import { createOnlineApi, type OnlineApi } from './api';
import { readConfig } from './config';
import { OnlineError } from './errors';

let api: Promise<OnlineApi> | null = null;

/** Client du jeu en ligne, créé à la première demande : la bibliothèque Supabase n'est téléchargée qu'à ce moment. */
export function getOnlineApi(): Promise<OnlineApi> {
  api ??= (async () => {
    const config = readConfig(import.meta.env);
    if (!config) throw new OnlineError('non_configure');
    const { createSupabaseBackend } = await import('./client');
    return createOnlineApi(createSupabaseBackend(config));
  })().catch((error: unknown) => {
    api = null;
    throw error;
  });
  return api;
}
