import type { SchemaTypeDefinition } from 'sanity';
import { post } from './post';
import { tag } from './tag';
import { project } from './project';
import { siteSettings } from './siteSettings';

export const schemaTypes: SchemaTypeDefinition[] = [post, tag, project, siteSettings];
