import { defineType, defineField } from 'sanity';

export const tag = defineType({
  name: 'tag',
  title: 'Tag',
  type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'name', maxLength: 60 },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'description', type: 'text', rows: 2 }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'slug.current' },
  },
});
