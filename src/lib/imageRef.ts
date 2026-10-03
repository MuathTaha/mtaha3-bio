import type { ImageRef } from '@/types/content';

/**
 * Adding an image field in the Studio without picking a file leaves an image
 * object with no asset. `urlFor()` throws on those ("Unable to resolve image
 * URL from source"), and because the pages are prerendered that failure takes
 * down the whole build — one empty slot anywhere breaks the site.
 *
 * Truthiness is therefore never a sufficient guard before calling `urlFor()`:
 * use this instead.
 */
export function hasAsset(image: unknown): image is ImageRef {
  if (!image || typeof image !== 'object') return false;
  const asset = (image as { asset?: { _ref?: unknown } }).asset;
  return typeof asset?._ref === 'string' && asset._ref.length > 0;
}

/** The members of an image array that are safe to render. */
export function withAsset<T>(images: T[] | undefined): T[] {
  return (images ?? []).filter(hasAsset) as T[];
}
