import { defineType, defineField } from 'sanity';

export const book = defineType({
  name: 'book',
  title: 'Book',
  type: 'document',
  fields: [
    defineField({
      name: 'isbn',
      type: 'string',
      description: 'Optional — used for OpenLibrary auto-fill action.',
    }),
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'author', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'cover',
      type: 'image',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })],
    }),
    defineField({
      name: 'status',
      type: 'string',
      options: {
        list: [
          { title: 'Read', value: 'read' },
          { title: 'Reading', value: 'reading' },
          { title: 'Want to read', value: 'want' },
        ],
        layout: 'radio',
      },
      initialValue: 'reading',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'rating',
      type: 'number',
      validation: (r) => r.min(1).max(5),
      description: 'Only meaningful for status=read.',
    }),
    defineField({
      name: 'finishedAt',
      type: 'date',
      description: 'Only meaningful for status=read.',
    }),
    defineField({
      name: 'takeaway',
      type: 'string',
      validation: (r) => r.max(240),
      description: '1–2 sentence "why this mattered". Shown on hover/tap.',
    }),
    defineField({
      name: 'order',
      type: 'number',
      description: 'Manual sort for reading and want lists (lower = earlier).',
      initialValue: 100,
    }),
  ],
  orderings: [
    {
      title: 'Finished (newest first)',
      name: 'finishedDesc',
      by: [{ field: 'finishedAt', direction: 'desc' }],
    },
    {
      title: 'Manual order',
      name: 'order',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],
  preview: {
    select: { title: 'title', subtitle: 'author', media: 'cover' },
  },
});
