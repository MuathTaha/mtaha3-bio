import { defineType, defineField, defineArrayMember } from 'sanity';

export const post = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'meta', title: 'Meta' },
  ],
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      group: 'content',
      validation: (r) => r.required().min(4).max(140),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      group: 'content',
      options: { source: 'title', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'type',
      type: 'string',
      group: 'content',
      options: {
        list: [
          { title: 'Essay (long-form)', value: 'essay' },
          { title: 'Note (short-form)', value: 'note' },
        ],
        layout: 'radio',
      },
      initialValue: 'essay',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'excerpt',
      type: 'text',
      group: 'content',
      rows: 3,
      validation: (r) => r.required().max(180),
    }),
    defineField({
      name: 'coverImage',
      type: 'image',
      group: 'content',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string', title: 'Alt text' })],
    }),
    defineField({
      name: 'body',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'H2', value: 'h2' },
            { title: 'H3', value: 'h3' },
            { title: 'Quote', value: 'blockquote' },
          ],
          marks: {
            decorators: [
              { title: 'Strong', value: 'strong' },
              { title: 'Emphasis', value: 'em' },
              { title: 'Code', value: 'code' },
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
          options: { hotspot: true },
          fields: [defineField({ name: 'alt', type: 'string' })],
        }),
        defineArrayMember({
          type: 'object',
          name: 'codeBlock',
          title: 'Code',
          fields: [
            defineField({
              name: 'language',
              type: 'string',
              options: {
                list: ['ts', 'tsx', 'js', 'jsx', 'python', 'bash', 'json', 'html', 'css'],
              },
            }),
            defineField({ name: 'code', type: 'text', rows: 10 }),
          ],
        }),
        defineArrayMember({
          type: 'object',
          name: 'callout',
          title: 'Callout',
          fields: [
            defineField({
              name: 'tone',
              type: 'string',
              options: { list: ['note', 'warning', 'aside'] },
              initialValue: 'note',
            }),
            defineField({ name: 'body', type: 'text', rows: 4 }),
          ],
        }),
      ],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'tags',
      type: 'array',
      group: 'content',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'tag' }] })],
    }),
    defineField({
      name: 'publishedAt',
      type: 'datetime',
      group: 'meta',
      initialValue: () => new Date().toISOString(),
      validation: (r) => r.required(),
    }),
    defineField({ name: 'updatedAt', type: 'datetime', group: 'meta' }),
    defineField({
      name: 'readingTime',
      type: 'number',
      group: 'meta',
      description: 'Auto-calculated on save — do not edit.',
      readOnly: true,
    }),
    defineField({
      name: 'ogImage',
      type: 'image',
      group: 'meta',
      description: 'Optional override; falls back to coverImage.',
    }),
  ],
  preview: {
    select: { title: 'title', type: 'type', publishedAt: 'publishedAt' },
    prepare: ({ title, type, publishedAt }) => ({
      title,
      subtitle: `${type?.toUpperCase()} · ${publishedAt?.slice(0, 10) ?? 'draft'}`,
    }),
  },
  orderings: [
    {
      title: 'Newest first',
      name: 'publishedAtDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
  ],
});
