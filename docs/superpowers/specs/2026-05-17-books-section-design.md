# Books section — design

**Date:** 2026-05-17
**Status:** Approved (sections 1–4)
**Project:** mtaha.bio
**Author:** Taha (designer/PM), Jarvis (specifier)

## Purpose

Add a public Books section to mtaha.bio at `/books`. A Goodreads-style reading life: what's been read, what's currently being read, what's queued. Cover-grid first, restrained metadata via hover overlay. Sanity-backed with ISBN auto-fill from OpenLibrary so adding a book takes seconds, not minutes.

## Scope

In scope:
- New Sanity `book` schema
- Sanity custom Document Action that hits OpenLibrary by ISBN and patches title/author/cover into the draft
- Single public route `/books` with tabs for `read | reading | want`
- Cover-grid layout, hover/tap overlay for metadata
- Nav entry, sitemap inclusion
- Unit tests (vitest) and E2E tests (playwright)

Out of scope (deliberately deferred):
- `/books/[slug]` detail pages with long-form reviews
- RSS feed for finished books
- Year-in-review page (`/books/2026`)
- Star-rating SVG component (use simple `⭐ × N` glyph for v1)
- Tag/genre filtering
- Currently-reading callout on the homepage

## Sanity schema: `book`

File: `src/sanity/schemas/book.ts`. Registered in `src/sanity/schemas/index.ts` alongside `post`, `tag`, `project`, `experience`, `siteSettings`.

```ts
{
  name: 'book',
  type: 'document',
  fields: [
    isbn:        string  // optional; used as OpenLibrary lookup key
    title:       string  // required
    author:      string  // required
    cover:       image   // hotspot enabled, alt text field
    status:      string  // radio: 'read' | 'reading' | 'want'; required; default 'reading'
    rating:      number  // 1–5; only meaningful when status='read'
    finishedAt:  date    // only meaningful when status='read'
    takeaway:    string  // max 240 chars; 1–2 sentence "why this mattered"
    order:       number  // manual sort for reading/want lists; default 100
  ],
  orderings: [
    { name: 'finishedDesc', by: [{ field: 'finishedAt', direction: 'desc' }] },
    { name: 'order',         by: [{ field: 'order',      direction: 'asc'  }] },
  ],
  preview: { select: { title: 'title', subtitle: 'author', media: 'cover' } }
}
```

Schema does NOT enforce conditional fields (e.g., `rating` on a `reading` book is allowed). Rendering layer handles this by only showing `rating` and `finishedAt` when `status === 'read'`. Self-correcting.

## ISBN lookup action

File: `src/sanity/actions/lookupISBN.ts`. Sanity custom Document Action, registered in `sanity.config.ts` document actions array, available only when document type is `book`.

Behavior:
1. Read `isbn` from the current draft. If empty, show toast `"Enter an ISBN first."` and no-op.
2. Call `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`.
3. On HTTP error or empty response, toast `"No record found for ISBN ${isbn}. Enter manually."` and no-op.
4. On success, patch:
   - `title` ← OpenLibrary `title`
   - `author` ← first entry from OpenLibrary `authors[].name` array
   - `cover` ← if OpenLibrary returns `cover.large` (or `cover.medium` fallback), fetch bytes, upload as Sanity asset, set `cover.asset._ref` and `cover.alt` to `"${title} cover"`
5. If cover fetch fails mid-action, patch title + author only and toast `"Found ${title} — no cover available."`

Accepts both ISBN-10 and ISBN-13 (OpenLibrary handles both). No client-side ISBN format validation beyond non-empty.

## GROQ query + types

File: `src/sanity/lib/queries.ts` (extend existing file).

```ts
export const BOOKS_QUERY = groq`
  *[_type == "book"] {
    _id,
    title,
    author,
    "coverUrl": cover.asset->url,
    "coverAlt": cover.alt,
    status,
    rating,
    finishedAt,
    takeaway,
    order
  }
`;
export async function getBooks(): Promise<Book[]>;
```

One fetch returns the full set. The page partitions into 3 status buckets in JS and sorts each. Cheaper than 3 separate Sanity queries.

File: `src/types/book.ts`.

```ts
export type BookStatus = 'read' | 'reading' | 'want';
export interface Book {
  _id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  coverAlt: string | null;
  status: BookStatus;
  rating: number | null;     // 1–5
  finishedAt: string | null; // ISO date
  takeaway: string | null;
  order: number;
}
```

## Page + components

File: `src/app/(site)/books/page.tsx`. Server component. Async. Calls `getBooks()`, passes the full array as a prop to `<BooksPage books={...} />`. `export const revalidate = 60` to match the rest of the site (`/`, `/projects`).

Page metadata: title `"Books — mtaha.bio"`, description `"What I'm reading and what I've finished."`.

Components live under `src/components/site/`:

| File | Type | Responsibility |
|---|---|---|
| `BooksPage.tsx` | client | Reads `?status=...` from URL via `useSearchParams`. Falls back to `read`. Renders `<BookTabs>` + active `<BookGrid>`. |
| `BookTabs.tsx` | client | The 3 tab chips (`Read | Reading | Want to Read`). On click, calls `router.replace('/books?status=' + next, { scroll: false })`. Highlights the active tab. |
| `BookGrid.tsx` | client | Pure presentation. Takes `Book[]` already filtered to one status. Renders the cover grid (responsive: 5-up desktop / 3-up tablet / 2-up mobile). |
| `BookCover.tsx` | client | Single cover with hover/tap overlay. Uses `next/image` with Sanity image URL builder for sharp covers across DPRs. Missing cover → muted background with first letter of title in large mono type. Overlay shows title + author always; rating + takeaway only when `status === 'read'`. Mobile: tap toggles overlay (sticky until next tap). |

## Sort within each tab

- `read` → `finishedAt desc` (most recently finished first; nulls last)
- `reading` → `order asc`
- `want` → `order asc`

## Nav

Update the site nav (existing component handles Essays, Notes, Projects, Work, About) to include "Books" between "Notes" and "Projects". Order is a small judgment call; pick wherever it feels most natural.

## Sitemap

Add `/books` to the static routes list in `src/app/sitemap.ts`.

## Rendering strategy

ISR with `revalidate = 60`. Matches existing site pattern. Sanity webhook + on-demand revalidation is overkill for a personal book log that changes a few times a month.

## Tests

Unit (vitest):
- `getBooks()` returns expected shape from a mocked Sanity client.
- A partition helper takes `Book[]` and returns `{ read: Book[]; reading: Book[]; want: Book[] }` with each bucket sorted per the rules above.
- ISBN lookup action with mocked OpenLibrary response → verify the Sanity patch shape (title, author, cover asset upload call).
- ISBN lookup action with mocked OpenLibrary 404 → action returns user-facing error, no patch issued.

E2E (playwright):
- Seed 1 book per status in the Sanity dataset.
- Hit `/books`, assert default tab is Read.
- Click each tab, assert URL updates with `?status=` query and visible cards match the expected status.
- Hover a cover, assert overlay reveals title + author.
- Empty-state — drop all books, hit `/books`, assert page renders without crash and empty-state copy is visible per tab.

## Edge cases

| Case | Handling |
|---|---|
| Book has no cover (OpenLibrary returned none, user didn't upload) | `BookCover` renders muted background with first letter of title in large mono type. No broken image. |
| ISBN field empty when user triggers "Look up by ISBN" action | Toast `"Enter an ISBN first."`, no-op. |
| OpenLibrary returns no result for valid-format ISBN | Toast `"No record found for ISBN {x}. Enter manually."`, no-op. |
| OpenLibrary returns book but no cover URL | Patch title + author only; leave cover empty. Toast `"Found {title} — no cover available."`. |
| Cover-fetch fails mid-action (network error) | Patch what we have (title, author); skip cover. Toast notes partial success. |
| Tab has zero entries | Render small empty-state: `"Nothing here yet."`. Keep tab visible so structure stays consistent. |
| Read tab grows to 100+ entries | Render all in one grid; `next/image` lazy loading handles performance. Pagination is a follow-up only if it becomes a real problem. |
| `rating` set on a `reading` or `want` book | Schema allows it; overlay only shows rating when `status === 'read'`. Self-correcting. |
| `finishedAt` set on a non-`read` book | Same — only used for sort/display in the Read tab. Hidden elsewhere. |
| ISBN-10 vs ISBN-13 | OpenLibrary accepts both. No client-side validation beyond non-empty. |
| Long title or long author name | CSS clamp: 2 lines for title, 1 line for author in the overlay. Truncate with ellipsis. |

## Rollout

1. Ship schema + Studio action behind no public route. Seed 3–5 books in Studio to confirm the ISBN-lookup flow works end-to-end.
2. Add `/books/page.tsx`, deploy to Vercel preview, eyeball the grid + overlay + tab switching.
3. Add the nav entry. Promote to production. No DB migration, no backwards-compat work (greenfield feature).
