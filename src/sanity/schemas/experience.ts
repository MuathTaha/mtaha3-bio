import { defineType, defineField } from 'sanity';

export const experience = defineType({
  name: 'experience',
  title: 'Experience',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Job title',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'company',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'companyUrl',
      title: 'Company URL',
      type: 'url',
    }),
    defineField({
      name: 'companyLogo',
      title: 'Company logo',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'location',
      type: 'string',
      description: 'e.g. "Paris, France" or "Remote"',
    }),
    defineField({
      name: 'startDate',
      type: 'date',
      options: { dateFormat: 'YYYY-MM' },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'endDate',
      type: 'date',
      options: { dateFormat: 'YYYY-MM' },
      description: 'Leave blank if current role.',
    }),
    defineField({
      name: 'summary',
      type: 'text',
      rows: 3,
      description: 'One- or two-sentence overview of the role. Shown on the list view.',
      validation: (r) => r.max(280),
    }),
    defineField({
      name: 'body',
      title: 'Achievements / details',
      type: 'array',
      of: [
        {
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
        },
      ],
    }),
    defineField({
      name: 'order',
      type: 'number',
      description: 'Manual sort override. Higher = appears first. Leave blank to sort by startDate desc.',
    }),
  ],
  preview: {
    select: { title: 'title', company: 'company', startDate: 'startDate', media: 'companyLogo' },
    prepare: ({ title, company, startDate }) => ({
      title: `${title} · ${company}`,
      subtitle: startDate ?? 'no date',
    }),
  },
  orderings: [
    {
      title: 'Most recent first',
      name: 'startDateDesc',
      by: [{ field: 'startDate', direction: 'desc' }],
    },
  ],
});
