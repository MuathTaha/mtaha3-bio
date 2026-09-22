import Image from 'next/image';
import { urlFor } from '@/sanity/lib/image';
import type { ImageRef } from '@/types/content';

/**
 * Gallery of snapshots from a single role, shown under the achievements.
 * Captions come from each photo's alt text.
 */
export function ExperiencePhotos({ photos }: { photos: ImageRef[] }) {
  if (photos.length === 0) return null;

  return (
    <section className="mt-8">
      <p className="kicker mb-3">Photos</p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo, i) => (
          <li key={photo._key ?? i}>
            <figure>
              <div className="group relative aspect-[4/3] overflow-hidden rounded-sm border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
                <Image
                  src={urlFor(photo).width(800).height(600).fit('crop').url()}
                  alt={photo.alt ?? ''}
                  fill
                  sizes="(max-width: 640px) 50vw, 240px"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              {photo.alt ? (
                <figcaption className="mono mt-2 text-[10px] uppercase leading-relaxed tracking-[0.1em] text-[var(--color-fg-faint)]">
                  {photo.alt}
                </figcaption>
              ) : null}
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
