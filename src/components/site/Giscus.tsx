'use client';

import { useEffect, useRef } from 'react';

export function Giscus({ term }: { term: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO;
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID;
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID;

  useEffect(() => {
    const node = ref.current;
    if (!node || !repo || !repoId || !categoryId) return;

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-repo', repo);
    script.setAttribute('data-repo-id', repoId);
    script.setAttribute('data-category', 'General');
    script.setAttribute('data-category-id', categoryId);
    script.setAttribute('data-mapping', 'specific');
    script.setAttribute('data-term', term);
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-theme', 'dark');
    script.setAttribute('data-input-position', 'bottom');
    script.setAttribute('data-lang', 'en');
    script.setAttribute('data-loading', 'lazy');

    node.appendChild(script);

    return () => {
      node.innerHTML = '';
    };
  }, [term, repo, repoId, categoryId]);

  if (!repo) return null;
  return <div ref={ref} className="mt-12 border-t border-[var(--color-border)] pt-8" />;
}
