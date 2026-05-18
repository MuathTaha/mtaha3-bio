import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getBooks } from '@/sanity/lib/queries';
import { Container } from '@/components/ui/Container';
import { BooksPage } from '@/components/site/BooksPage';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Books — mtaha.bio',
  description: "What I'm reading and what I've finished.",
};

export default async function Books() {
  const books = await getBooks();
  return (
    <Container measure="prose">
      <Suspense>
        <BooksPage books={books} />
      </Suspense>
    </Container>
  );
}
