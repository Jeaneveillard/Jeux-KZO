export interface OnlineConfig {
  readonly url: string;
  readonly key: string;
}

/** Adresse et clé publique du projet Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). */
export function readConfig(env: Readonly<Record<string, unknown>>): OnlineConfig | null {
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (typeof url !== 'string' || !url.startsWith('https://') || typeof key !== 'string' || key.length === 0) return null;
  return { url, key };
}
