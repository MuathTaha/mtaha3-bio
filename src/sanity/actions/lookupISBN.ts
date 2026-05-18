import type { DocumentActionComponent } from 'sanity';
import { useDocumentOperation, useClient } from 'sanity';
import { useToast } from '@sanity/ui';

export type LookupResult =
  | { kind: 'ok'; title: string; author: string; coverUrl: string | null }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string };

interface OpenLibraryAuthor {
  name: string;
}
interface OpenLibraryBook {
  title?: string;
  authors?: OpenLibraryAuthor[];
  cover?: { large?: string; medium?: string; small?: string };
}

export async function fetchBookByIsbn(isbn: string): Promise<LookupResult> {
  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { kind: 'error', message: `OpenLibrary returned ${res.status}` };
    const data = (await res.json()) as Record<string, OpenLibraryBook>;
    const book = data[`ISBN:${isbn}`];
    if (!book || !book.title) return { kind: 'not-found' };
    const author = book.authors?.[0]?.name ?? 'Unknown';
    const coverUrl = book.cover?.large ?? book.cover?.medium ?? null;
    return { kind: 'ok', title: book.title, author, coverUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { kind: 'error', message };
  }
}

export const lookupISBNAction: DocumentActionComponent = (props) => {
  const { id, type, draft, published, onComplete } = props;
  const { patch } = useDocumentOperation(id, type);
  const toast = useToast();
  const sanityClient = useClient({ apiVersion: '2024-01-01' });
  const doc = draft || published;

  if (!doc || type !== 'book') return null;

  return {
    label: 'Look up by ISBN',
    onHandle: async () => {
      const isbn = (doc as { isbn?: string }).isbn?.trim();
      if (!isbn) {
        toast.push({ status: 'warning', title: 'Enter an ISBN first.' });
        onComplete();
        return;
      }

      const result = await fetchBookByIsbn(isbn);

      if (result.kind === 'not-found') {
        toast.push({
          status: 'error',
          title: `No record found for ISBN ${isbn}. Enter manually.`,
        });
        onComplete();
        return;
      }
      if (result.kind === 'error') {
        toast.push({ status: 'error', title: 'OpenLibrary error', description: result.message });
        onComplete();
        return;
      }

      const patches: Record<string, unknown> = {
        title: result.title,
        author: result.author,
      };

      if (result.coverUrl) {
        try {
          const imgRes = await fetch(result.coverUrl);
          const blob = await imgRes.blob();
          const asset = await sanityClient.assets.upload('image', blob, {
            filename: `${isbn}.jpg`,
          });
          patches.cover = {
            _type: 'image',
            asset: { _type: 'reference', _ref: asset._id },
            alt: `${result.title} cover`,
          };
        } catch {
          toast.push({
            status: 'warning',
            title: `Found ${result.title} — no cover available.`,
          });
        }
      } else {
        toast.push({
          status: 'info',
          title: `Found ${result.title} — no cover available.`,
        });
      }

      patch.execute([{ set: patches }]);
      toast.push({ status: 'success', title: `Filled from OpenLibrary: ${result.title}` });
      onComplete();
    },
  };
};
