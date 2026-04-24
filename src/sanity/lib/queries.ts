import { groq } from 'next-sanity';
import { client } from './client';
import type { Post, Project, SiteSettings, Tag } from '@/types/content';

const POST_FIELDS = groq`
  _id,
  title,
  "slug": slug.current,
  type,
  excerpt,
  coverImage,
  body,
  publishedAt,
  updatedAt,
  readingTime,
  ogImage,
  tags[]->{ _id, name, "slug": slug.current, description }
`;

export async function getPosts(limit = 20, type?: 'essay' | 'note'): Promise<Post[]> {
  const typeFilter = type ? `&& type == "${type}"` : '';
  return client.fetch(
    groq`*[_type == "post" && !(_id in path("drafts.**")) ${typeFilter}] | order(publishedAt desc)[0...$limit] { ${POST_FIELDS} }`,
    { limit }
  );
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  return client.fetch(
    groq`*[_type == "post" && slug.current == $slug && !(_id in path("drafts.**"))][0] { ${POST_FIELDS} }`,
    { slug }
  );
}

export async function getAllPostSlugs(): Promise<string[]> {
  return client.fetch(groq`*[_type == "post" && !(_id in path("drafts.**"))].slug.current`);
}

export async function getPostsByTag(tagSlug: string): Promise<Post[]> {
  return client.fetch(
    groq`*[_type == "post" && references(*[_type == "tag" && slug.current == $tagSlug]._id)] | order(publishedAt desc) { ${POST_FIELDS} }`,
    { tagSlug }
  );
}

export async function getAllTags(): Promise<Tag[]> {
  return client.fetch(
    groq`*[_type == "tag"] | order(name asc) { _id, name, "slug": slug.current, description }`
  );
}

export async function getTagBySlug(slug: string): Promise<Tag | null> {
  return client.fetch(
    groq`*[_type == "tag" && slug.current == $slug][0] { _id, name, "slug": slug.current, description }`,
    { slug }
  );
}

export async function getProjects(): Promise<Project[]> {
  return client.fetch(
    groq`*[_type == "project"] | order(order asc, year desc) {
      _id, name, "slug": slug.current, tagline, status, url, repo, logo, year, order,
      writeup
    }`
  );
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const result = await client.fetch(
    groq`*[_type == "siteSettings"][0] {
      handle, shortBio, longBio, cvPdf{asset->{url}}, socials, newsletterCta
    }`
  );
  return (
    result ?? {
      handle: 'mtaha3',
      shortBio: '',
    }
  );
}

export async function getSearchIndex(): Promise<
  Array<Pick<Post, '_id' | 'title' | 'slug' | 'excerpt' | 'type' | 'publishedAt'> & { tagNames: string[] }>
> {
  return client.fetch(groq`
    *[_type == "post" && !(_id in path("drafts.**"))] | order(publishedAt desc) {
      _id, title, "slug": slug.current, excerpt, type, publishedAt,
      "tagNames": tags[]->name
    }
  `);
}
