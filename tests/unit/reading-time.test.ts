import { describe, it, expect } from 'vitest';
import { readingTime } from '@/lib/reading-time';

describe('readingTime', () => {
  it('returns 1 for very short text', () => {
    expect(readingTime('hello world')).toBe(1);
  });

  it('calculates minutes at 200 wpm', () => {
    const text = 'word '.repeat(600); // 600 words = 3 min
    expect(readingTime(text)).toBe(3);
  });

  it('extracts text from PortableText blocks', () => {
    const blocks = [
      { _type: 'block', children: [{ _type: 'span', text: 'hello world' }] },
      { _type: 'block', children: [{ _type: 'span', text: 'foo bar baz' }] },
    ];
    expect(readingTime(blocks)).toBe(1);
  });
});
