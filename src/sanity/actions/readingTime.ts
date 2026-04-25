import type { DocumentActionComponent } from 'sanity';
import { useDocumentOperation } from 'sanity';
import { readingTime } from '../../lib/reading-time';

export const readingTimeAction: DocumentActionComponent = (props) => {
  const { id, type, draft, published, onComplete } = props;
  const { patch } = useDocumentOperation(id, type);
  const doc = draft || published;

  if (!doc || type !== 'post') return null;

  return {
    label: 'Recompute reading time',
    onHandle: () => {
      const body = (doc as { body?: unknown[] }).body ?? [];
      const minutes = readingTime(body as never);
      patch.execute([{ set: { readingTime: minutes } }]);
      onComplete();
    },
  };
};
