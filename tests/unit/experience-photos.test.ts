import { describe, it, expect } from 'vitest';
import { withAsset } from '@/components/site/ExperiencePhotos';
import type { ImageRef } from '@/types/content';

const withRef = (key: string): ImageRef => ({
  _type: 'image',
  _key: key,
  asset: { _ref: `image-${key}-100x100-jpg`, _type: 'reference' },
});

/** What the Studio writes when an item is added to the grid but no file picked. */
const emptySlot = { _type: 'image', _key: 'empty' } as unknown as ImageRef;

describe('withAsset', () => {
  it('drops entries with no asset, which would otherwise crash the build', () => {
    expect(withAsset([withRef('a'), emptySlot, withRef('b')]).map((p) => p._key)).toEqual(['a', 'b']);
  });

  it('keeps every entry when all have assets', () => {
    const photos = [withRef('a'), withRef('b')];
    expect(withAsset(photos)).toEqual(photos);
  });

  it('returns nothing when every entry is empty', () => {
    expect(withAsset([emptySlot, emptySlot])).toEqual([]);
  });

  it('tolerates an asset object with no _ref', () => {
    const noRef = { _type: 'image', _key: 'x', asset: {} } as unknown as ImageRef;
    expect(withAsset([noRef])).toEqual([]);
  });
});
