# Books Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public `/books` route on mtaha.bio with read/reading/want tabs, cover-grid layout, hover overlay, and a Sanity Studio action that auto-fills title/author/cover from OpenLibrary by ISBN.

**Architecture:** New Sanity `book` document type. One GROQ query fetches all books; a pure helper partitions and sorts by status. Server component renders the page shell + metadata; a client tree (`BooksPage` → `BookTabs` + `BookGrid` → `BookCover`) handles tab state via URL `?status=` param. A separate Sanity `DocumentActionComponent` hits OpenLibrary on ISBN to patch fields into the draft.

**Tech Stack:** Next.js 16.2.4 (App Router, Turbopack), Sanity 5.22 + next-sanity, vitest 4.1 (unit), Playwright 1.59 (E2E), Tailwind 4, React 19.

**Spec:** [docs/superpowers/specs/2026-05-17-books-section-design.md](../specs/2026-05-17-books-section-design.md)

---

## File Structure

**Create:**
- `src/types/book.ts` — `Book` interface + `BookStatus` union
- `src/lib/books.ts` — pure partition + sort helper (testable, no Sanity dependency)
- `src/sanity/schemas/book.ts` — Sanity schema definition
- `src/sanity/actions/lookupISBN.ts` — Studio DocumentAction for ISBN auto-fill
- `src/components/site/BookCover.tsx` — single cover with hover/tap overlay (client)
- `src/components/site/BookGrid.tsx` — responsive cover grid (client)
- `src/components/site/BookTabs.tsx` — 3-tab status switcher (client)
- `src/components/site/BooksPage.tsx` — client wrapper that reads `?status=` and stitches tabs + grid
- `src/app/(site)/books/page.tsx` — server component, page metadata + revalidate
- `tests/unit/books-partition.test.ts`
- `tests/unit/books-query.test.ts`
- `tests/unit/lookup-isbn.test.ts`
- `tests/e2e/books.spec.ts`

**Modify:**
- `src/sanity/schemas/index.ts` — register `book` schema
- `src/sanity/lib/queries.ts` — add `BOOKS_QUERY` + `getBooks()`
- `sanity.config.ts` — wire `lookupISBNAction` into `document.actions` for `book` type
- `src/components/site/Nav.tsx` — add Books link
- `src/app/sitemap.ts` — add `/books`

**Spec deviation note:** The spec defined `"coverUrl": cover.asset->url` in the GROQ. The plan returns the raw `cover` field instead so `urlFor()` can apply image transforms in `BookCover`. The `Book` type carries `cover: SanityImage | null`, not `coverUrl: string`. This is the cleaner Sanity pattern used elsewhere in the repo.

---

## Task 1: Types + partition helper

**Files:**
- Create: `src/types/book.ts`
- Create: `src/lib/books.ts`
- Test: `tests/unit/books-partition.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/books-partition.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { partitionBooks } from '@/lib/books';
import type { Book } from '@/types/book';

const mk = (overrides: Partial<Book>): Book => ({
  _id: 'b1',
  title: 'T',
  author: 'A',
  cover: null,
  status: 'read',
  rating: null,
  finishedAt: null,
  takeaway: null,
  order: 100,
  ...overrides,
});

describe('partitionBooks', () => {
  it('groups books by status', () => {
    const books: Book[] = [
      mk({ _id: 'a', status: 'read' }),
      mk({ _id: 'b', status: 'reading' }),
      mk({ _id: 'c', status: 'want' }),
      mk({ _id: 'd', status: 'read' }),
    ];
    const result = partitionBooks(books);
    expect(result.read).toHaveLength(2);
    expect(result.reading).toHaveLength(1);
    expect(result.want).toHaveLength(1);
  });

  it('sorts read by finishedAt desc, nulls last', () => {
    const books: Book[] = [
      mk({ _id: 'a', status: 'read', finishedAt: '2026-01-01' }),
      mk({ _id: 'b', status: 'read', finishedAt: null }),
      mk({ _id: 'c', status: 'read', finishedAt: '2026-05-01' }),
    ];
    const result = partitionBooks(books);
    expect(result.read.map((b) => b._id)).toEqual(['c', 'a', 'b']);
  });

  it('sorts reading and want by order asc', () => {
    const books: Book[] = [
      mk({ _id: 'a', status: 'reading', order: 30 }),
      mk({ _id: 'b', status: 'reading', order: 10 }),
      mk({ _id: 'c', status: 'want', order: 200 }),
      mk({ _id: 'd', status: 'want', order: 50 }),
    ];
    const result = partitionBooks(books);
    expect(result.reading.map((b) => b._id)).toEqual(['b', 'a']);
    expect(result.want.map((b) => b._id)).toEqual(['d', 'c']);
  });

  it('returns empty arrays for empty input', () => {
    const result = partitionBooks([]);
    expect(result).toEqual({ read: [], reading: [], want: [] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- books-partition`
Expected: FAIL with "Failed to load url @/lib/books" or "partitionBooks is not a function"

- [ ] **Step 3: Create the Book type**

Create `src/types/book.ts`:

```ts
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
```

- [ ] **Step 4: Write the partition helper**

Create `src/lib/books.ts`:

```ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- books-partition`
Expected: PASS, 4/4 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/types/book.ts src/lib/books.ts tests/unit/books-partition.test.ts
git commit -m "feat(books): Book type + partition/sort helper"
```

---

## Task 2: Sanity schema

**Files:**
- Create: `src/sanity/schemas/book.ts`
- Modify: `src/sanity/schemas/index.ts`

- [ ] **Step 1: Write the schema**

Create `src/sanity/schemas/book.ts`:

```ts
import { defineType, defineField } from 'sanity';

export const book = defineType({
  name: 'book',
  title: 'Book',
  type: 'document',
  fields: [
    defineField({
      name: 'isbn',
      type: 'string',
      description: 'Optional — used for OpenLibrary auto-fill action.',
    }),
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'author', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'cover',
      type: 'image',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })],
    }),
    defineField({
      name: 'status',
      type: 'string',
      options: {
        list: [
          { title: 'Read', value: 'read' },
          { title: 'Reading', value: 'reading' },
          { title: 'Want to read', value: 'want' },
        ],
        layout: 'radio',
      },
      initialValue: 'reading',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'rating',
      type: 'number',
      validation: (r) => r.min(1).max(5),
      description: 'Only meaningful for status=read.',
    }),
    defineField({
      name: 'finishedAt',
      type: 'date',
      description: 'Only meaningful for status=read.',
    }),
    defineField({
      name: 'takeaway',
      type: 'string',
      validation: (r) => r.max(240),
      description: '1–2 sentence "why this mattered". Shown on hover/tap.',
    }),
    defineField({
      name: 'order',
      type: 'number',
      description: 'Manual sort for reading and want lists (lower = earlier).',
      initialValue: 100,
    }),
  ],
  orderings: [
    {
      title: 'Finished (newest first)',
      name: 'finishedDesc',
      by: [{ field: 'finishedAt', direction: 'desc' }],
    },
    {
      title: 'Manual order',
      name: 'order',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],
  preview: {
    select: { title: 'title', subtitle: 'author', media: 'cover' },
  },
});
```

- [ ] **Step 2: Register the schema**

Modify `src/sanity/schemas/index.ts`:

```ts
import type { SchemaTypeDefinition } from 'sanity';
import { post } from './post';
import { tag } from './tag';
import { project } from './project';
import { experience } from './experience';
import { siteSettings } from './siteSettings';
import { book } from './book';

export const schemaTypes: SchemaTypeDefinition[] = [post, tag, project, experience, siteSettings, book];
```

- [ ] **Step 3: Verify Studio loads with new type**

Run: `npm run dev`, open `http://localhost:3000/studio`, confirm "Book" appears in the document list (left rail). Create one draft book to confirm fields render. Close dev server.

- [ ] **Step 4: Commit**

```bash
git add src/sanity/schemas/book.ts src/sanity/schemas/index.ts
git commit -m "feat(schema): add book document type"
```

---

## Task 3: GROQ query + getBooks

**Files:**
- Modify: `src/sanity/lib/queries.ts`
- Test: `tests/unit/books-query.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/books-query.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import type { SanityClient } from 'next-sanity';
import { getBooks } from '@/sanity/lib/queries';

describe('getBooks', () => {
  it('returns all books from Sanity', async () => {
    const fakeBooks = [
      { _id: 'a', title: 'A', author: 'X', cover: null, status: 'read', rating: 5, finishedAt: '2026-01-01', takeaway: 'good', order: 100 },
      { _id: 'b', title: 'B', author: 'Y', cover: null, status: 'reading', rating: null, finishedAt: null, takeaway: null, order: 10 },
    ];
    const fetch = vi.fn().mockResolvedValue(fakeBooks);
    const client = { fetch } as unknown as SanityClient;

    const result = await getBooks(client);

    expect(fetch).toHaveBeenCalledOnce();
    const groqArg = fetch.mock.calls[0][0] as string;
    expect(groqArg).toContain('_type == "book"');
    expect(result).toEqual(fakeBooks);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- books-query`
Expected: FAIL — `getBooks is not exported` or similar.

- [ ] **Step 3: Implement getBooks**

Modify `src/sanity/lib/queries.ts`. After the `getAllProjectSlugs` function (around line 90), add:

```ts
import type { Book } from '@/types/book';

export const BOOKS_QUERY = groq`
  *[_type == "book" && !(_id in path("drafts.**"))] {
    _id, title, author, cover, status, rating, finishedAt, takeaway, order
  }
`;

export async function getBooks(c: SanityClient = client): Promise<Book[]> {
  return c.fetch(BOOKS_QUERY);
}
```

Add the `Book` import alongside the existing `@/types/content` import at the top of the file:

```ts
import type { Experience, Post, Project, SiteSettings, Tag } from '@/types/content';
import type { Book } from '@/types/book';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- books-query`
Expected: PASS.

- [ ] **Step 5: Run full unit suite to confirm no regressions**

Run: `npm test`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/sanity/lib/queries.ts tests/unit/books-query.test.ts
git commit -m "feat(books): GROQ query + getBooks fetcher"
```

---

## Task 4: BookCover component

**Files:**
- Create: `src/components/site/BookCover.tsx`

- [ ] **Step 1: Implement BookCover**

Create `src/components/site/BookCover.tsx`:

```tsx
'use client';

import Image from 'next/image';
import { useState } from 'react';
import { urlFor } from '@/sanity/lib/image';
import type { Book } from '@/types/book';

interface BookCoverProps {
  book: Book;
}

export function BookCover({ book }: BookCoverProps) {
  const [revealed, setRevealed] = useState(false);
  const showRating = book.status === 'read' && book.rating !== null;
  const showTakeaway = book.status === 'read' && book.takeaway !== null;
  const firstLetter = book.title.charAt(0).toUpperCase();

  return (
    <div
      className="group relative aspect-[2/3] overflow-hidden rounded-sm bg-[var(--color-bg-elev)]"
      onClick={() => setRevealed((v) => !v)}
    >
      {book.cover ? (
        <Image
          src={urlFor(book.cover).width(400).fit('crop').url()}
          alt={`${book.title} cover`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="mono text-5xl text-[var(--color-fg-faint)]">{firstLetter}</span>
        </div>
      )}

      <div
        className={`absolute inset-0 flex flex-col justify-end gap-1 bg-black/75 p-3 text-[var(--color-bg)] transition-opacity ${
          revealed ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <p className="font-medium leading-tight line-clamp-2">{book.title}</p>
        <p className="text-xs leading-tight text-white/80 line-clamp-1">{book.author}</p>
        {showRating && (
          <p className="mono text-xs text-yellow-300">{'⭐'.repeat(book.rating!)}</p>
        )}
        {showTakeaway && (
          <p className="text-xs text-white/70 line-clamp-3">{book.takeaway}</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Smoke verify component compiles**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/site/BookCover.tsx
git commit -m "feat(books): BookCover with hover overlay + missing-cover fallback"
```

---

## Task 5: BookGrid component

**Files:**
- Create: `src/components/site/BookGrid.tsx`

- [ ] **Step 1: Implement BookGrid**

Create `src/components/site/BookGrid.tsx`:

```tsx
'use client';

import { BookCover } from './BookCover';
import type { Book } from '@/types/book';

interface BookGridProps {
  books: Book[];
  emptyMessage: string;
}

export function BookGrid({ books, emptyMessage }: BookGridProps) {
  if (books.length === 0) {
    return (
      <p className="mono text-xs uppercase tracking-[0.12em] text-[var(--color-fg-faint)]">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {books.map((book) => (
        <li key={book._id}>
          <BookCover book={book} />
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/site/BookGrid.tsx
git commit -m "feat(books): BookGrid responsive cover grid"
```

---

## Task 6: BookTabs component

**Files:**
- Create: `src/components/site/BookTabs.tsx`

- [ ] **Step 1: Implement BookTabs**

Create `src/components/site/BookTabs.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import type { BookStatus } from '@/types/book';

interface BookTabsProps {
  active: BookStatus;
  counts: Record<BookStatus, number>;
}

const TABS: { value: BookStatus; label: string }[] = [
  { value: 'read', label: 'Read' },
  { value: 'reading', label: 'Reading' },
  { value: 'want', label: 'Want to Read' },
];

export function BookTabs({ active, counts }: BookTabsProps) {
  const router = useRouter();

  return (
    <ul className="mb-8 flex gap-6 border-b border-[var(--color-border)] pb-4">
      {TABS.map((tab) => {
        const isActive = tab.value === active;
        return (
          <li key={tab.value}>
            <button
              type="button"
              onClick={() => router.replace(`/books?status=${tab.value}`, { scroll: false })}
              className={`mono text-xs uppercase tracking-[0.12em] transition-colors ${
                isActive
                  ? 'text-[var(--color-fg)]'
                  : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.label} <span className="text-[var(--color-fg-faint)]">({counts[tab.value]})</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/site/BookTabs.tsx
git commit -m "feat(books): BookTabs status switcher"
```

---

## Task 7: BooksPage client wrapper

**Files:**
- Create: `src/components/site/BooksPage.tsx`

- [ ] **Step 1: Implement BooksPage**

Create `src/components/site/BooksPage.tsx`:

```tsx
'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookGrid } from './BookGrid';
import { BookTabs } from './BookTabs';
import { partitionBooks } from '@/lib/books';
import type { Book, BookStatus } from '@/types/book';

interface BooksPageProps {
  books: Book[];
}

const VALID: BookStatus[] = ['read', 'reading', 'want'];
const EMPTY: Record<BookStatus, string> = {
  read: 'Nothing finished yet.',
  reading: 'Not reading anything right now.',
  want: 'No queue yet.',
};

function resolveStatus(value: string | null): BookStatus {
  return VALID.includes(value as BookStatus) ? (value as BookStatus) : 'read';
}

export function BooksPage({ books }: BooksPageProps) {
  const params = useSearchParams();
  const active = resolveStatus(params.get('status'));
  const buckets = useMemo(() => partitionBooks(books), [books]);

  const counts = {
    read: buckets.read.length,
    reading: buckets.reading.length,
    want: buckets.want.length,
  };

  return (
    <section>
      <h1 className="mono mb-6 text-xs uppercase tracking-[0.14em] text-[var(--color-fg-faint)]">
        Books
      </h1>
      <BookTabs active={active} counts={counts} />
      <BookGrid books={buckets[active]} emptyMessage={EMPTY[active]} />
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/site/BooksPage.tsx
git commit -m "feat(books): BooksPage client wrapper with URL-state tabs"
```

---

## Task 8: /books server route

**Files:**
- Create: `src/app/(site)/books/page.tsx`

- [ ] **Step 1: Implement the route**

Create `src/app/(site)/books/page.tsx`:

```tsx
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
      <BooksPage books={books} />
    </Container>
  );
}
```

- [ ] **Step 2: Smoke verify**

Run: `npm run dev`, hit `http://localhost:3000/books`. With no books in dataset, page renders with empty-state copy under the Read tab. Close dev server.

- [ ] **Step 3: Commit**

```bash
git add src/app/(site)/books/page.tsx
git commit -m "feat(books): /books server route"
```

---

## Task 9: Nav + sitemap

**Files:**
- Modify: `src/components/site/Nav.tsx`
- Modify: `src/app/sitemap.ts`

- [ ] **Step 1: Add Books to Nav**

Modify `src/components/site/Nav.tsx`. Change the `links` array (lines 4–11) to:

```ts
const links = [
  { href: '/essays', label: 'Essays' },
  { href: '/notes', label: 'Notes' },
  { href: '/books', label: 'Books' },
  { href: '/work', label: 'Work' },
  { href: '/projects', label: 'Projects' },
  { href: '/about', label: 'About Me' },
  { href: '/search', label: 'Search' },
];
```

- [ ] **Step 2: Add /books to sitemap**

Modify `src/app/sitemap.ts`. After the `/notes` line (around line 16), add:

```ts
    { url: `${siteUrl}/books`, lastModified: now, priority: 0.7 },
```

- [ ] **Step 3: Smoke verify nav**

Run: `npm run dev`, hit `http://localhost:3000/`, confirm "BOOKS" appears in the nav between "NOTES" and "WORK". Click it → /books renders. Close dev server.

- [ ] **Step 4: Commit**

```bash
git add src/components/site/Nav.tsx src/app/sitemap.ts
git commit -m "feat(books): nav entry + sitemap"
```

---

## Task 10: ISBN lookup action

**Files:**
- Create: `src/sanity/actions/lookupISBN.ts`
- Modify: `sanity.config.ts`
- Test: `tests/unit/lookup-isbn.test.ts`

The action has two concerns: (a) the OpenLibrary fetch + result-parsing logic (pure, testable), and (b) the Sanity Studio integration (`useDocumentOperation`, toasts). Split the pure logic into a helper so we can unit-test it.

- [ ] **Step 1: Write the failing test for the OpenLibrary helper**

Create `tests/unit/lookup-isbn.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchBookByIsbn } from '@/sanity/actions/lookupISBN';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchBookByIsbn', () => {
  it('returns title, author, and cover URL on success', async () => {
    const body = {
      'ISBN:9780553573404': {
        title: 'A Game of Thrones',
        authors: [{ name: 'George R. R. Martin' }],
        cover: { large: 'https://covers.openlibrary.org/b/id/1.jpg', medium: 'https://covers.openlibrary.org/b/id/2.jpg' },
      },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(body),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchBookByIsbn('9780553573404');

    expect(result).toEqual({
      kind: 'ok',
      title: 'A Game of Thrones',
      author: 'George R. R. Martin',
      coverUrl: 'https://covers.openlibrary.org/b/id/1.jpg',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://openlibrary.org/api/books?bibkeys=ISBN:9780553573404&jscmd=data&format=json'
    );
  });

  it('falls back to cover.medium when large is missing', async () => {
    const body = {
      'ISBN:1': {
        title: 'X',
        authors: [{ name: 'Y' }],
        cover: { medium: 'https://covers.openlibrary.org/b/id/2.jpg' },
      },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) }));

    const result = await fetchBookByIsbn('1');

    expect(result).toEqual({
      kind: 'ok',
      title: 'X',
      author: 'Y',
      coverUrl: 'https://covers.openlibrary.org/b/id/2.jpg',
    });
  });

  it('returns title and author when no cover at all', async () => {
    const body = {
      'ISBN:1': {
        title: 'X',
        authors: [{ name: 'Y' }],
      },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) }));

    const result = await fetchBookByIsbn('1');

    expect(result).toEqual({ kind: 'ok', title: 'X', author: 'Y', coverUrl: null });
  });

  it('returns not-found when OpenLibrary has no record', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));

    const result = await fetchBookByIsbn('0000000000');

    expect(result).toEqual({ kind: 'not-found' });
  });

  it('returns error on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));

    const result = await fetchBookByIsbn('1');

    expect(result.kind).toBe('error');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lookup-isbn`
Expected: FAIL — `fetchBookByIsbn` not found.

- [ ] **Step 3: Implement the action file**

Create `src/sanity/actions/lookupISBN.ts`:

```ts
import type { DocumentActionComponent } from 'sanity';
import { useDocumentOperation, useToast, useClient } from 'sanity';

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lookup-isbn`
Expected: PASS, all 5 tests green.

- [ ] **Step 5: Register the action in sanity.config.ts**

Modify `sanity.config.ts`. After the `readingTimeAction` import (line 11), add:

```ts
import { lookupISBNAction } from './src/sanity/actions/lookupISBN';
```

Change the `document.actions` block to also append `lookupISBNAction` for the `book` schema type. Replace the existing block (lines 37–46) with:

```ts
  document: {
    actions: (input, context) => {
      const filtered = singletons.includes(context.schemaType)
        ? input.filter(({ action }) => action && !['duplicate', 'delete'].includes(action))
        : input;
      if (context.schemaType === 'post') return [...filtered, readingTimeAction];
      if (context.schemaType === 'book') return [...filtered, lookupISBNAction];
      return filtered;
    },
  },
```

- [ ] **Step 6: Smoke verify the action in Studio**

Run: `npm run dev`. Open `http://localhost:3000/studio`. Create a new Book draft, paste ISBN `9780553573404` into the ISBN field, then open the ⋮ menu on the action bar — confirm "Look up by ISBN" appears. Click it. Confirm a success toast and that title, author, cover get populated. Close dev server.

- [ ] **Step 7: Commit**

```bash
git add src/sanity/actions/lookupISBN.ts sanity.config.ts tests/unit/lookup-isbn.test.ts
git commit -m "feat(books): ISBN auto-fill action via OpenLibrary"
```

---

## Task 11: E2E test for /books

**Files:**
- Create: `tests/e2e/books.spec.ts`

This test mirrors the pattern in `tests/e2e/home.spec.ts` — it assumes seed data exists in the connected Sanity dataset. Before running, manually seed 3 books in Studio: one with `status=read` (set a rating + finishedAt), one with `status=reading`, one with `status=want`.

- [ ] **Step 1: Seed test data in Sanity Studio**

Run: `npm run dev`. Open `http://localhost:3000/studio`. Create and publish:
1. A book with `status=read`, title "Read Book", author "Read Author", rating 5, finishedAt set to today.
2. A book with `status=reading`, title "Reading Book", author "Reading Author".
3. A book with `status=want`, title "Wanted Book", author "Wanted Author".

Close dev server. (These records will live in the dev dataset — fine.)

- [ ] **Step 2: Write the E2E test**

Create `tests/e2e/books.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('/books', () => {
  test('renders the books page with read tab active by default', async ({ page }) => {
    await page.goto('/books');
    await expect(page.getByRole('heading', { name: 'Books' })).toBeVisible();
    const readTab = page.getByRole('button', { name: /^Read/ });
    await expect(readTab).toHaveAttribute('aria-current', 'page');
  });

  test('switches tab via URL state', async ({ page }) => {
    await page.goto('/books');
    await page.getByRole('button', { name: /^Reading/ }).click();
    await expect(page).toHaveURL(/\/books\?status=reading/);
    await expect(page.getByRole('button', { name: /^Reading/ })).toHaveAttribute('aria-current', 'page');
  });

  test('deep-links to want tab via ?status=want', async ({ page }) => {
    await page.goto('/books?status=want');
    await expect(page.getByRole('button', { name: /^Want to Read/ })).toHaveAttribute('aria-current', 'page');
  });

  test('book cover reveals title on hover', async ({ page }) => {
    await page.goto('/books?status=read');
    const firstCover = page.locator('ul > li').first();
    await firstCover.hover();
    await expect(firstCover.getByText(/Book$/)).toBeVisible();
  });
});
```

- [ ] **Step 3: Run the E2E suite**

Run: `npm run test:e2e -- books.spec.ts`
Expected: 4/4 pass (assumes dev server is running OR Playwright's web server config starts it — check `playwright.config.ts`; existing tests use the same pattern).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/books.spec.ts
git commit -m "test(books): e2e coverage for tabs and hover overlay"
```

---

## Task 12: Final integration smoke + typecheck

**Files:** none

- [ ] **Step 1: Full typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors (or pre-existing only).

- [ ] **Step 3: Full unit suite**

Run: `npm test`
Expected: all green, including pre-existing `feed`, `reading-time`, `search`, `smoke` plus 3 new suites.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: clean Next.js build. `/books` listed in the route table.

- [ ] **Step 5: Final commit (only if there's anything outstanding)**

If any auto-formatting changes show up, commit them:

```bash
git status
# if dirty:
git add -A
git commit -m "chore(books): post-implementation formatting"
```

---

## Self-Review (for the plan author)

**Spec coverage:**
- Schema: Task 2 ✓
- ISBN action: Task 10 ✓
- GROQ + types: Tasks 1, 3 ✓
- Page + 4 components: Tasks 4–8 ✓
- Nav + sitemap: Task 9 ✓
- Unit tests for partition, query, ISBN action: Tasks 1, 3, 10 ✓
- E2E tests: Task 11 ✓
- Edge cases (missing cover, empty tabs, OpenLibrary failures, long titles, ISBN-10/13): handled in component code (BookCover muted-letter fallback), BookGrid empty-state, lookupISBN action (toast taxonomy), CSS `line-clamp` in BookCover ✓
- Out-of-scope items explicitly not in plan: detail page, RSS, year-in-review, tag filter, homepage callout — confirmed absent ✓

**Spec deviation note (Task File Structure header):** The `cover` field is returned as the raw Sanity image (not `coverUrl: cover.asset->url`) so `urlFor()` can transform per-DPR. Flagged in the plan header.

**Placeholder scan:** No TBDs, no "implement later", no "add appropriate error handling" without spec. ✓

**Type consistency:** `Book.cover: Image | null`, `BookStatus` union, `BookBuckets` interface used consistently across helpers, query, components. ✓

**No unused imports flagged.**
