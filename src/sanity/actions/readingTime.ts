import type { DocumentActionComponent } from 'sanity';
import { readingTime } from '../../lib/reading-time';

export const readingTimeAction: DocumentActionComponent = (props) => {
  const { draft, published } = props;
  const doc = draft || published;

  if (!doc || doc._type !== 'post') return null;

  return {
    label: 'Recompute reading time',
    onHandle: () => {
      const body = (doc as { body?: unknown[] }).body ?? [];
      const minutes = readingTime(body as never);
      // Note: In a real implementation, this would need to dispatch a patch
      // through the Sanity Studio's document API. For now, this is a placeholder.
      console.log(`Reading time for "${doc.title}": ${minutes} minutes`);
    },
  };
};
