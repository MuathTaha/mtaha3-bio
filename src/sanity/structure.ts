import type { StructureBuilder } from 'sanity/structure';
import { CogIcon, DocumentIcon, TagIcon, RocketIcon, CaseIcon } from '@sanity/icons';

export const structure = (S: StructureBuilder) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Site Settings')
        .icon(CogIcon)
        .child(
          S.document()
            .schemaType('siteSettings')
            .documentId('siteSettings')
        ),
      S.divider(),
      S.documentTypeListItem('post').title('Posts').icon(DocumentIcon),
      S.documentTypeListItem('tag').title('Tags').icon(TagIcon),
      S.documentTypeListItem('experience').title('Work — Experience').icon(CaseIcon),
      S.documentTypeListItem('project').title('Projects').icon(RocketIcon),
    ]);
