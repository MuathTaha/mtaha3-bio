import { defineType, defineField } from 'sanity';

export const project = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'name', maxLength: 60 },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'tagline', type: 'string', validation: (r) => r.required().max(100) }),
    defineField({
      name: 'status',
      type: 'string',
      options: {
        list: ['live', 'shipped', 'archived', 'building'],
        layout: 'radio',
      },
      initialValue: 'shipped',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'url', type: 'url' }),
    defineField({ name: 'repo', type: 'url' }),
    defineField({
      name: 'logo',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'writeup',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'Optional — renders at /work/[slug] when present.',
    }),
    defineField({ name: 'year', type: 'string' }),
    defineField({
      name: 'order',
      type: 'number',
      description: 'Manual sort order (lower = earlier).',
      initialValue: 100,
    }),
  ],
  orderings: [
    { title: 'Order', name: 'order', by: [{ field: 'order', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'name', subtitle: 'status', media: 'logo' },
  },
});
