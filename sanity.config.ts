'use client';

import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { presentationTool } from 'sanity/presentation';

import { apiVersion, dataset, projectId } from './src/sanity/env';
import { schemaTypes } from './src/sanity/schemas';
import { structure } from './src/sanity/structure';
import { readingTimeAction } from './src/sanity/actions/readingTime';

const singletons = ['siteSettings'];

export default defineConfig({
  name: 'default',
  title: 'mtaha.bio',
  basePath: '/studio',
  projectId,
  dataset,
  plugins: [
    structureTool({ structure }),
    visionTool({ defaultApiVersion: apiVersion }),
    presentationTool({
      previewUrl: {
        draftMode: {
          enable: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/preview?secret=${process.env.SANITY_STUDIO_PREVIEW_SECRET}`,
        },
      },
    }),
  ],
  schema: {
    types: schemaTypes,
    templates: (templates) =>
      templates.filter(({ schemaType }) => !singletons.includes(schemaType)),
  },
  document: {
    actions: (input, context) => {
      const filtered = singletons.includes(context.schemaType)
        ? input.filter(({ action }) => action && !['duplicate', 'delete'].includes(action))
        : input;
      return context.schemaType === 'post'
        ? [...filtered, readingTimeAction]
        : filtered;
    },
  },
});
