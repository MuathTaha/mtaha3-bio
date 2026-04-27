import { defineType, defineField } from 'sanity';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'handle',
      type: 'string',
      initialValue: 'mtaha',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'shortBio',
      type: 'text',
      rows: 3,
      description: 'Used on home footer and /about top.',
      validation: (r) => r.required().max(240),
    }),
    defineField({
      name: 'longBio',
      type: 'array',
      of: [{ type: 'block' }],
      description: '/about page body.',
    }),
    defineField({
      name: 'cvPdf',
      type: 'file',
      options: { accept: 'application/pdf' },
      description: 'Downloadable CV.',
    }),
    defineField({
      name: 'socials',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'platform', type: 'string' }),
            defineField({ name: 'url', type: 'url' }),
          ],
          preview: { select: { title: 'platform', subtitle: 'url' } },
        },
      ],
    }),
    defineField({
      name: 'newsletterCta',
      type: 'string',
      initialValue: 'Get new posts in your inbox.',
    }),
  ],
  preview: { prepare: () => ({ title: 'Site Settings' }) },
});
