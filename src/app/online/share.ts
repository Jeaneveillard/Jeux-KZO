export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

/** Menu de partage du téléphone (WhatsApp, SMS…), sinon copie du lien. */
export async function shareInvite(url: string, title: string): Promise<ShareOutcome> {
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title, text: `${title} : rejoins ma partie !`, url });
      return 'shared';
    }
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch (error) {
    return error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}
