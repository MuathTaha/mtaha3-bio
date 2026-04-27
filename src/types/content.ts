import type { PortableTextBlock } from '@portabletext/types';

export type PostType = 'essay' | 'note';

export type Tag = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
};

export type ImageRef = {
  _type: 'image';
  asset: { _ref: string; _type: 'reference' };
  alt?: string;
};

export type Post = {
  _id: string;
  title: string;
  slug: string;
  type: PostType;
  excerpt: string;
  coverImage?: ImageRef;
  body: PortableTextBlock[];
  tags?: Tag[];
  publishedAt: string;
  updatedAt?: string;
  readingTime?: number;
  ogImage?: ImageRef;
};

export type Project = {
  _id: string;
  name: string;
  slug: string;
  tagline: string;
  status: 'live' | 'shipped' | 'archived' | 'building';
  url?: string;
  repo?: string;
  logo?: ImageRef;
  writeup?: PortableTextBlock[];
  year?: string;
  order: number;
};

export type Experience = {
  _id: string;
  title: string;
  company: string;
  companyUrl?: string;
  companyLogo?: ImageRef;
  location?: string;
  startDate: string;
  endDate?: string;
  summary?: string;
  body?: PortableTextBlock[];
  order?: number;
};

export type Social = { platform: string; url: string };

export type SiteSettings = {
  handle: string;
  shortBio: string;
  longBio?: PortableTextBlock[];
  cvPdf?: { asset: { _ref: string; url?: string } };
  socials?: Social[];
  newsletterCta?: string;
};
