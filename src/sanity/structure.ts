import type { StructureBuilder } from 'sanity/structure';
import { CogIcon, DocumentIcon, TagIcon, RocketIcon, CaseIcon, BookIcon, CommentIcon } from '@sanity/icons';

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
      S.documentTypeListItem('book').title('Books').icon(BookIcon),
      S.divider(),
      // Split so the queue needing attention is one click away, rather than
      // hunting unapproved comments out of a single long list.
      S.listItem()
        .title('Comments')
        .icon(CommentIcon)
        .child(
          S.list()
            .title('Comments')
            .items([
              S.listItem()
                .title('Awaiting approval')
                .icon(CommentIcon)
                .child(
                  S.documentList()
                    .title('Awaiting approval')
                    .filter('_type == "comment" && approved != true')
                    .defaultOrdering([{ field: '_createdAt', direction: 'desc' }])
                ),
              S.listItem()
                .title('Approved')
                .icon(CommentIcon)
                .child(
                  S.documentList()
                    .title('Approved')
                    .filter('_type == "comment" && approved == true')
                    .defaultOrdering([{ field: '_createdAt', direction: 'desc' }])
                ),
            ])
        ),
    ]);
