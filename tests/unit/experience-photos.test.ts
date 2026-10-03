import { describe, it, expect } from 'vitest';
import { hasAsset, withAsset } from '@/lib/imageRef';
import type { ImageRef } from '@/types/content';

const withRef = (key: string): ImageRef => ({
  _type: 'image',
  _key: key,
  asset: { _ref: `image-${key}-100x100-jpg`, _type: 'reference' },
});

/** What the Studio writes when an image field is added but no file is picked. */
const emptySlot = { _type: 'image' } as unknown as ImageRef;

describe('hasAsset', () => {
  it('accepts an image with a real asset reference', () => {
    expect(hasAsset(withRef('a'))).toBe(true);
  });

  it.each([
    ['an empty image object', emptySlot],
    ['an asset object with no _ref', { _type: 'image', asset: {} }],
    ['an empty _ref string', { _type: 'image', asset: { _ref: '' } }],
    ['undefined', undefined],
    ['null', null],
    ['a string', 'image-abc'],
  ])('rejects %s, which would otherwise throw in urlFor and fail the build', (_label, value) => {
    expect(hasAsset(value)).toBe(false);
  });
});

describe('withAsset', () => {
  it('drops entries with no asset and keeps the rest in order', () => {
    const photos = [withRef('a'), emptySlot, withRef('b')];
    expect(withAsset(photos).map((p: ImageRef) => p._key)).toEqual(['a', 'b']);
  });

  it('returns an empty array for undefined', () => {
    expect(withAsset(undefined)).toEqual([]);
  });

  it('returns nothing when every entry is empty', () => {
    expect(withAsset([emptySlot, emptySlot])).toEqual([]);
  });
});
