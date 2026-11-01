import { defineType, defineField } from 'sanity';

/**
 * A themed run of posts with its own page — "Managers to Leaders" is the first.
 *
 * Deliberately independent of a post's `type`: that field is single-choice, so
 * folding a series into it would mean a series post stopped being an Essay.
 * A post keeps its type and joins a series, and appears in both places.
 */
export const series = defineType({
  name: 'series',
  title: 'Series',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: (r) => r.required().max(80),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      description: 'Sets the URL: /series/<slug>.',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 3,
      description: 'One or two sentences, shown under the title on the series page.',
      validation: (r) => r.max(280),
    }),
    defineField({
      name: 'navLabel',
      type: 'string',
      description:
        'Optional shorter label for the nav bar, where space is tight. Falls back to the title.',
      validation: (r) => r.max(30),
    }),
    defineField({
      name: 'order',
      type: 'number',
      description: 'Sort order in the nav when there is more than one series (lower = earlier).',
      initialValue: 100,
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'description' },
  },
});
