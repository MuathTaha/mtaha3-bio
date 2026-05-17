import type { SchemaTypeDefinition } from 'sanity';
import { post } from './post';
import { tag } from './tag';
import { project } from './project';
import { experience } from './experience';
import { siteSettings } from './siteSettings';
import { book } from './book';

export const schemaTypes: SchemaTypeDefinition[] = [post, tag, project, experience, siteSettings, book];
