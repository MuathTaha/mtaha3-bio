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
        {book.status === 'read' && book.rating !== null && (
          <p className="mono text-xs text-yellow-300">{'⭐'.repeat(book.rating)}</p>
        )}
        {book.status === 'read' && book.takeaway !== null && (
          <p className="text-xs text-white/70 line-clamp-3">{book.takeaway}</p>
        )}
      </div>
    </div>
  );
}
