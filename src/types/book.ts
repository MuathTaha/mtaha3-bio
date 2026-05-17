import type { Image } from 'sanity';

export type BookStatus = 'read' | 'reading' | 'want';

export interface Book {
  _id: string;
  title: string;
  author: string;
  cover: Image | null;
  status: BookStatus;
  rating: number | null;
  finishedAt: string | null;
  takeaway: string | null;
  order: number;
}

export interface BookBuckets {
  read: Book[];
  reading: Book[];
  want: Book[];
}
