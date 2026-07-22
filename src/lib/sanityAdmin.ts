// Admin-side Sanity writes. Requires the write token obtained after password
// login (see AuthContext). Uploads go directly browser -> Sanity, so large
// PDFs are fine.
import { createClient, type SanityClient } from '@sanity/client';
import { sanityConfig } from './sanity';

export function adminClient(token: string): SanityClient {
  return createClient({ ...sanityConfig, token, useCdn: false });
}

export async function uploadFile(
  token: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ assetId: string; url: string }> {
  const isPdf = file.type === 'application/pdf';
  const type = isPdf ? 'file' : 'image';
  // @sanity/client doesn't expose progress; emit start/end for UI feedback
  onProgress?.(5);
  const asset = await adminClient(token).assets.upload(type, file, {
    filename: file.name,
    contentType: file.type,
  });
  onProgress?.(100);
  return { assetId: asset._id, url: asset.url };
}

export interface IssueInput {
  title: string;
  description: string;
  coverImageAssetId: string; // image asset _id
  pdfAssetId: string; // file asset _id
  issueMonth: number;
  issueYear: number;
  publishDate: string;
  featured: boolean;
}

function issueDoc(input: IssueInput) {
  return {
    title: input.title,
    description: input.description,
    coverImage: {
      _type: 'image',
      asset: { _type: 'reference', _ref: input.coverImageAssetId },
    },
    pdfFile: {
      _type: 'file',
      asset: { _type: 'reference', _ref: input.pdfAssetId },
    },
    issueMonth: input.issueMonth,
    issueYear: input.issueYear,
    publishDate: input.publishDate,
    featured: input.featured,
  };
}

export async function createIssue(token: string, input: IssueInput) {
  return adminClient(token).create({ _type: 'magazineIssue', ...issueDoc(input) });
}

export async function updateIssue(
  token: string,
  id: string,
  input: Partial<IssueInput>
) {
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.issueMonth !== undefined) patch.issueMonth = input.issueMonth;
  if (input.issueYear !== undefined) patch.issueYear = input.issueYear;
  if (input.publishDate !== undefined) patch.publishDate = input.publishDate;
  if (input.featured !== undefined) patch.featured = input.featured;
  if (input.coverImageAssetId) {
    patch.coverImage = {
      _type: 'image',
      asset: { _type: 'reference', _ref: input.coverImageAssetId },
    };
  }
  if (input.pdfAssetId) {
    patch.pdfFile = {
      _type: 'file',
      asset: { _type: 'reference', _ref: input.pdfAssetId },
    };
  }
  return adminClient(token).patch(id).set(patch).commit();
}

// Safe delete: mark as archived (hidden from public pages, restorable)
export async function archiveIssue(token: string, id: string) {
  return adminClient(token).patch(id).set({ archived: true }).commit();
}

export async function restoreIssue(token: string, id: string) {
  return adminClient(token).patch(id).set({ archived: false }).commit();
}

// Permanent delete (only offered from the Archived list)
export async function deleteIssue(token: string, id: string) {
  return adminClient(token).delete(id);
}

export interface SisterInput {
  name: string;
  logoAssetId: string;
  websiteUrl: string;
  description: string;
  displayOrder: number;
  active: boolean;
}

function sisterDoc(input: SisterInput) {
  return {
    name: input.name,
    logo: {
      _type: 'image',
      asset: { _type: 'reference', _ref: input.logoAssetId },
    },
    websiteUrl: input.websiteUrl,
    description: input.description,
    displayOrder: input.displayOrder,
    active: input.active,
  };
}

export async function createSister(token: string, input: SisterInput) {
  return adminClient(token).create({ _type: 'sisterMagazine', ...sisterDoc(input) });
}

export async function updateSister(
  token: string,
  id: string,
  input: Partial<SisterInput>
) {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.websiteUrl !== undefined) patch.websiteUrl = input.websiteUrl;
  if (input.description !== undefined) patch.description = input.description;
  if (input.displayOrder !== undefined) patch.displayOrder = input.displayOrder;
  if (input.active !== undefined) patch.active = input.active;
  if (input.logoAssetId) {
    patch.logo = {
      _type: 'image',
      asset: { _type: 'reference', _ref: input.logoAssetId },
    };
  }
  return adminClient(token).patch(id).set(patch).commit();
}

export async function deleteSister(token: string, id: string) {
  return adminClient(token).delete(id);
}
