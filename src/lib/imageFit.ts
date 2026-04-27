export type ImageFit = 'contain' | 'cover';

export function fitClass(fit: ImageFit | undefined, fallback: ImageFit = 'cover'): string {
  return (fit ?? fallback) === 'contain' ? 'object-contain' : 'object-cover';
}
