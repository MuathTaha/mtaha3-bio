import { defineType, defineField, defineArrayMember } from 'sanity';

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
      fields: [
        defineField({ name: 'alt', type: 'string', title: 'Alt text' }),
        defineField({
          name: 'fit',
          type: 'string',
          title: 'Fit',
          description: 'How the image should fit its display frame.',
          options: {
            list: [
              { title: 'Contain — fits within frame, no crop', value: 'contain' },
              { title: 'Cover — fills frame, may crop', value: 'cover' },
            ],
            layout: 'radio',
          },
          initialValue: 'contain',
        }),
      ],
    }),
    defineField({
      name: 'writeup',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'Section heading', value: 'h3' },
            { title: 'Quote', value: 'blockquote' },
          ],
          marks: {
            decorators: [
              { title: 'Strong', value: 'strong' },
              { title: 'Emphasis', value: 'em' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [{ name: 'href', type: 'url' }],
              },
            ],
          },
        }),
        defineArrayMember({
          type: 'image',
          title: 'Inline photo',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              type: 'string',
              title: 'Alt text',
              description: 'Shown as caption underneath. Keep it short.',
            }),
            defineField({
              name: 'fit',
              type: 'string',
              title: 'Fit',
              description: 'How the image should fit its display frame.',
              options: {
                list: [
                  { title: 'Contain — fits within frame, no crop', value: 'contain' },
                  { title: 'Cover — fills frame, may crop', value: 'cover' },
                ],
                layout: 'radio',
              },
              initialValue: 'contain',
            }),
          ],
        }),
      ],
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
