import type { StructureBuilder } from 'sanity/structure';

export const structure = (S: StructureBuilder) =>
  S.list()
    .title('Content')
    .items([
      S.documentTypeListItem('post').title('Posts'),
      S.documentTypeListItem('tag').title('Tags'),
      S.documentTypeListItem('project').title('Projects'),
    ]);
