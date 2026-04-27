import { PortableText as BasePortableText } from '@portabletext/react';
import Image from 'next/image';
import { urlFor } from '@/sanity/lib/image';
import { fitClass } from '@/lib/imageFit';
import type { PortableTextBlock } from '@portabletext/types';

export function PortableText({ value }: { value: PortableTextBlock[] }) {
  return (
    <BasePortableText
      value={value}
      components={{
        types: {
          image: ({ value }) => (
            <figure className="my-8">
              <Image
                src={urlFor(value).width(1400).url()}
                alt={value.alt ?? ''}
                width={1400}
                height={900}
                sizes="(max-width: 768px) 100vw, 700px"
                className={`h-auto w-full ${fitClass(value.fit, 'contain')}`}
              />
              {value.alt ? (
                <figcaption className="mono mt-2 text-xs uppercase tracking-[0.1em] text-[var(--color-fg-faint)]">
                  {value.alt}
                </figcaption>
              ) : null}
            </figure>
          ),
          codeBlock: ({ value }) => (
            <pre className="overflow-x-auto">
              <code className={`language-${value.language ?? 'text'}`}>{value.code}</code>
            </pre>
          ),
          callout: ({ value }) => (
            <aside className="my-8 border-l-2 border-[var(--color-accent)] pl-4">
              <p className="mono mb-1 text-[10px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
                {value.tone}
              </p>
              <p className="text-[var(--color-fg)]">{value.body}</p>
            </aside>
          ),
        },
        marks: {
          link: ({ children, value }) => (
            <a href={value.href} target="_blank" rel="noreferrer noopener">
              {children}
            </a>
          ),
        },
      }}
    />
  );
}
