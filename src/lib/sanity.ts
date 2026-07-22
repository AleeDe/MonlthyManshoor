import { createClient } from '@sanity/client';
import type { MagazineIssue, SisterMagazine } from './database.types';

export const sanityConfig = {
  projectId: '3d1nttqq',
  dataset: 'production',
  apiVersion: '2024-01-01',
};

// Read-only client (public dataset reads, no token needed)
export const sanityClient = createClient({
  ...sanityConfig,
  useCdn: true,
});

/**
 * Sanity CDN image resize: appends w/auto=format params so the CDN serves an
 * appropriately sized WebP instead of the full upload. No-op for non-Sanity URLs.
 */
export function imgUrl(url: string, width: number): string {
  if (!url || !url.includes('cdn.sanity.io')) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}w=${width}&auto=format&q=80`;
}

// Map Sanity docs to the app's existing types so pages don't change
const ISSUE_FIELDS = `{
  "id": _id,
  title,
  description,
  "cover_image_url": coverImage.asset->url,
  "pdf_url": pdfFile.asset->url,
  "issue_month": issueMonth,
  "issue_year": issueYear,
  "publish_date": publishDate,
  featured,
  "created_at": _createdAt,
  "updated_at": _updatedAt
}`;

const SISTER_FIELDS = `{
  "id": _id,
  name,
  "logo_url": logo.asset->url,
  "website_url": websiteUrl,
  description,
  "display_order": displayOrder,
  active,
  "created_at": _createdAt
}`;

// Public queries exclude archived issues (safe-deleted from the admin panel)
const NOT_ARCHIVED = ' && archived != true';

export async function getAllIssues(): Promise<MagazineIssue[]> {
  return sanityClient.fetch(
    `*[_type == "magazineIssue"${NOT_ARCHIVED}] | order(publishDate desc) ${ISSUE_FIELDS}`
  );
}

export async function getArchivedIssues(): Promise<MagazineIssue[]> {
  return sanityClient.fetch(
    `*[_type == "magazineIssue" && archived == true] | order(publishDate desc) ${ISSUE_FIELDS}`
  );
}

export async function getLatestIssue(): Promise<MagazineIssue | null> {
  return sanityClient.fetch(
    `*[_type == "magazineIssue"${NOT_ARCHIVED}] | order(publishDate desc) [0] ${ISSUE_FIELDS}`
  );
}

export async function getFeaturedIssues(limit = 4): Promise<MagazineIssue[]> {
  return sanityClient.fetch(
    `*[_type == "magazineIssue" && featured == true${NOT_ARCHIVED}] | order(publishDate desc) [0...${limit}] ${ISSUE_FIELDS}`
  );
}

export async function getIssueById(id: string): Promise<MagazineIssue | null> {
  return sanityClient.fetch(
    `*[_type == "magazineIssue" && _id == $id] [0] ${ISSUE_FIELDS}`,
    { id }
  );
}

export async function getSisterMagazines(activeOnly = false): Promise<SisterMagazine[]> {
  const filter = activeOnly ? ' && active == true' : '';
  return sanityClient.fetch(
    `*[_type == "sisterMagazine"${filter}] | order(displayOrder asc) ${SISTER_FIELDS}`
  );
}
