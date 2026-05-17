import type { Book, BookBuckets } from '@/types/book';

export function partitionBooks(books: Book[]): BookBuckets {
  const buckets: BookBuckets = { read: [], reading: [], want: [] };
  for (const book of books) {
    buckets[book.status].push(book);
  }

  buckets.read.sort((a, b) => {
    if (a.finishedAt === null && b.finishedAt === null) return 0;
    if (a.finishedAt === null) return 1;
    if (b.finishedAt === null) return -1;
    return b.finishedAt.localeCompare(a.finishedAt);
  });
  buckets.reading.sort((a, b) => a.order - b.order);
  buckets.want.sort((a, b) => a.order - b.order);

  return buckets;
}
