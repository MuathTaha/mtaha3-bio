import { defineType, defineField } from 'sanity';

/**
 * A reader's comment, written by the public API route rather than in the Studio.
 *
 * Comments are created already published but with `approved` false, so they are
 * visible here for moderation while the site — which queries the published
 * perspective and filters on `approved` — never shows them. Approving one is a
 * field toggle plus a publish; spam is deleted instead.
 */
export const comment = defineType({
  name: 'comment',
  title: 'Comment',
  type: 'document',
  fields: [
    defineField({
      name: 'approved',
      type: 'boolean',
      description: 'Off until you approve it. Nothing is shown on the site while this is off.',
      initialValue: false,
    }),
    defineField({
      name: 'post',
      type: 'reference',
      to: [{ type: 'post' }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'name',
      type: 'string',
      validation: (r) => r.required().max(80),
    }),
    defineField({
      name: 'email',
      type: 'string',
      description: 'Never rendered on the site — only so you can reply privately.',
    }),
    defineField({
      name: 'body',
      type: 'text',
      rows: 5,
      validation: (r) => r.required().max(2000),
    }),
  ],
  orderings: [
    {
      title: 'Newest first',
      name: 'createdDesc',
      by: [{ field: '_createdAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: { name: 'name', post: 'post.title', approved: 'approved' },
    prepare: ({ name, post, approved }) => ({
      title: `${approved ? '' : '• '}${name ?? 'Anonymous'}`,
      subtitle: post ? `on “${post}”` : 'on a deleted post',
    }),
  },
});
