// Browser-side PDF utilities:
//  - compressPdf: re-renders every page as JPEG and rebuilds the PDF (big
//    savings for scanned magazines; text PDFs lose selectable text)
//  - pdfFirstPageToImage: renders page 1 as a JPEG File for use as cover image
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument } from 'pdf-lib';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

// JBIG2/JPX decoding in scanned PDFs needs pdf.js wasm helpers (served from /public)
const PDFJS_DOC_OPTS = { wasmUrl: '/pdfjs-wasm/' };

async function renderPage(
  page: pdfjsLib.PDFPageProxy,
  scale: number
): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  // Guard: a failed image decoder (e.g. JBIG2) can leave the render promise
  // pending forever - time out instead of hanging the save flow
  await Promise.race([
    page.render({ canvas, viewport }).promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Page render timed out (unsupported image encoding?)')), 30000)
    ),
  ]);
  return canvas;
}

function canvasToJpegBytes(canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) return reject(new Error('Canvas export failed'));
        resolve(new Uint8Array(await blob.arrayBuffer()));
      },
      'image/jpeg',
      quality
    );
  });
}

export interface CompressOptions {
  /** JPEG quality 0-1 (default 0.6) */
  quality?: number;
  /** Max render width in px for each page (default 1400) */
  maxWidth?: number;
  onProgress?: (page: number, total: number) => void;
}

export async function compressPdf(file: File, opts: CompressOptions = {}): Promise<File> {
  const { quality = 0.6, maxWidth = 1400, onProgress } = opts;
  const data = await file.arrayBuffer();
  const src = await pdfjsLib.getDocument({ data, ...PDFJS_DOC_OPTS }).promise;
  const out = await PDFDocument.create();

  for (let i = 1; i <= src.numPages; i++) {
    const page = await src.getPage(i);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, maxWidth / baseViewport.width);
    const canvas = await renderPage(page, scale);
    const jpegBytes = await canvasToJpegBytes(canvas, quality);
    const img = await out.embedJpg(jpegBytes);
    // Keep original page dimensions (PDF points) so layout is unchanged
    const p = out.addPage([baseViewport.width, baseViewport.height]);
    p.drawImage(img, { x: 0, y: 0, width: baseViewport.width, height: baseViewport.height });
    canvas.width = 0; // free memory
    onProgress?.(i, src.numPages);
  }

  const bytes = await out.save();
  src.cleanup();
  const compressed = new File(
    [bytes as BlobPart],
    file.name.replace(/\.pdf$/i, '') + '-compressed.pdf',
    { type: 'application/pdf' }
  );
  // If compression didn't help (e.g. already-optimized text PDF), keep original
  return compressed.size < file.size ? compressed : file;
}

/**
 * Fast size estimate: renders up to `samplePages` evenly spaced pages at the
 * given quality and extrapolates total compressed size. Good enough to tune
 * the quality slider without compressing the whole document.
 */
export async function estimateCompressedSize(
  file: File,
  quality: number,
  maxWidth = 1400,
  samplePages = 3
): Promise<{ estimatedBytes: number; numPages: number }> {
  const data = await file.arrayBuffer();
  const src = await pdfjsLib.getDocument({ data, ...PDFJS_DOC_OPTS }).promise;
  const total = src.numPages;
  const count = Math.min(samplePages, total);
  // evenly spaced page indices (1-based)
  const indices = Array.from({ length: count }, (_, i) =>
    Math.max(1, Math.round(((i + 0.5) / count) * total))
  );
  let sampleBytes = 0;
  for (const idx of indices) {
    const page = await src.getPage(idx);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, maxWidth / baseViewport.width);
    const canvas = await renderPage(page, scale);
    const bytes = await canvasToJpegBytes(canvas, quality);
    sampleBytes += bytes.length;
    canvas.width = 0;
  }
  src.cleanup();
  // small overhead per page for PDF structure
  const estimatedBytes = Math.round((sampleBytes / count) * total * 1.02);
  return { estimatedBytes, numPages: total };
}

/**
 * Renders PDF page 1 as a small cover JPEG, iteratively reducing quality and
 * dimensions to hit targetBytes (default ~10 KB), with a sanity floor so the
 * cover doesn't become unreadable.
 */
export type CoverQuality = 'small' | 'medium' | 'high';

export const COVER_PRESETS: { value: CoverQuality; label: string; targetKb: number }[] = [
  { value: 'small', label: 'Small (~30 KB)', targetKb: 30 },
  { value: 'medium', label: 'Medium (~60 KB)', targetKb: 60 },
  { value: 'high', label: 'High (~120 KB)', targetKb: 120 },
];

export function coverTargetBytes(q: CoverQuality): number {
  return (COVER_PRESETS.find((p) => p.value === q)?.targetKb ?? 30) * 1024;
}

export async function pdfFirstPageToImage(
  file: File,
  targetBytes = 30 * 1024
): Promise<File> {
  const data = await file.arrayBuffer();
  const src = await pdfjsLib.getDocument({ data, ...PDFJS_DOC_OPTS }).promise;
  const page = await src.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });

  // try progressively smaller width / quality until under target
  const attempts: { width: number; quality: number }[] = [
    { width: 1200, quality: 0.85 },
    { width: 1000, quality: 0.8 },
    { width: 800, quality: 0.75 },
    { width: 700, quality: 0.7 },
    { width: 600, quality: 0.65 },
    { width: 500, quality: 0.55 },
    { width: 420, quality: 0.5 }, // floor - accept whatever size this gives
  ];

  let bytes: Uint8Array | null = null;
  for (const { width, quality } of attempts) {
    const scale = width / baseViewport.width;
    const canvas = await renderPage(page, scale);
    bytes = await canvasToJpegBytes(canvas, quality);
    canvas.width = 0;
    if (bytes.length <= targetBytes) break;
  }
  src.cleanup();

  return new File([bytes! as BlobPart], file.name.replace(/\.pdf$/i, '') + '-cover.jpg', {
    type: 'image/jpeg',
  });
}
