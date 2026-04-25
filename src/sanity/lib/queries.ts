import { groq } from 'next-sanity';
import type { SanityClient } from 'next-sanity';
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

export async function getPosts(limit = 20, type?: 'essay' | 'note', c: SanityClient = client): Promise<Post[]> {
  const typeFilter = type ? `&& type == "${type}"` : '';
  return c.fetch(
    groq`*[_type == "post" && !(_id in path("drafts.**")) ${typeFilter}] | order(publishedAt desc)[0...$limit] { ${POST_FIELDS} }`,
    { limit }
  );
}

export async function getPostBySlug(slug: string, c: SanityClient = client): Promise<Post | null> {
  return c.fetch(
    groq`*[_type == "post" && slug.current == $slug && !(_id in path("drafts.**"))][0] { ${POST_FIELDS} }`,
    { slug }
  );
}

export async function getAllPostSlugs(c: SanityClient = client): Promise<string[]> {
  return c.fetch(groq`*[_type == "post" && !(_id in path("drafts.**"))].slug.current`);
}

export async function getPostsByTag(tagSlug: string, c: SanityClient = client): Promise<Post[]> {
  return c.fetch(
    groq`*[_type == "post" && references(*[_type == "tag" && slug.current == $tagSlug]._id)] | order(publishedAt desc) { ${POST_FIELDS} }`,
    { tagSlug }
  );
}

export async function getAllTags(c: SanityClient = client): Promise<Tag[]> {
  return c.fetch(
    groq`*[_type == "tag"] | order(name asc) { _id, name, "slug": slug.current, description }`
  );
}

export async function getTagBySlug(slug: string, c: SanityClient = client): Promise<Tag | null> {
  return c.fetch(
    groq`*[_type == "tag" && slug.current == $slug][0] { _id, name, "slug": slug.current, description }`,
    { slug }
  );
}

export async function getProjects(c: SanityClient = client): Promise<Project[]> {
  return c.fetch(
    groq`*[_type == "project"] | order(order asc, year desc) {
      _id, name, "slug": slug.current, tagline, status, url, repo, logo, year, order,
      writeup
    }`
  );
}

export async function getSiteSettings(c: SanityClient = client): Promise<SiteSettings> {
  const result = await c.fetch(
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

export async function getSearchIndex(c: SanityClient = client): Promise<
  Array<Pick<Post, '_id' | 'title' | 'slug' | 'excerpt' | 'type' | 'publishedAt'> & { tagNames: string[] }>
> {
  return c.fetch(groq`
    *[_type == "post" && !(_id in path("drafts.**"))] | order(publishedAt desc) {
      _id, title, "slug": slug.current, excerpt, type, publishedAt,
      "tagNames": tags[]->name
    }
  `);
}
