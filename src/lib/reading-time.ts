type PortableTextBlock = {
  _type: string;
  children?: Array<{ _type: string; text?: string }>;
};

const WPM = 200;

export function readingTime(input: string | PortableTextBlock[]): number {
  const text = typeof input === 'string' ? input : extractText(input);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WPM));
}

function extractText(blocks: PortableTextBlock[]): string {
  return blocks
    .filter((b) => b._type === 'block')
    .flatMap((b) => b.children ?? [])
    .filter((c) => c._type === 'span' && typeof c.text === 'string')
    .map((c) => c.text)
    .join(' ');
}
