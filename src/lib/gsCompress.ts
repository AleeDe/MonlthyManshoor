// Real PDF compression via Ghostscript compiled to WebAssembly, running in a
// WebWorker. Unlike rasterization, this recompresses embedded images while
// keeping text selectable, and handles already-optimized PDFs gracefully.
// WASM (~13 MB) is fetched lazily only when a compression actually runs.

export type GsPreset = '/screen' | '/ebook' | '/printer';

export const GS_PRESETS: { value: GsPreset; label: string; hint: string }[] = [
  { value: '/screen', label: 'Small', hint: '72 dpi images - smallest file, okay on screens' },
  { value: '/ebook', label: 'Balanced', hint: '150 dpi images - recommended' },
  { value: '/printer', label: 'High quality', hint: '300 dpi images - larger file' },
];

export async function gsCompressPdf(file: File, preset: GsPreset = '/ebook'): Promise<File> {
  const inputBuffer = await file.arrayBuffer();

  const outputBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const worker = new Worker(new URL('./gs/background-worker.js', import.meta.url), {
      type: 'module',
    });
    const cleanup = () => setTimeout(() => worker.terminate(), 0);
    worker.addEventListener('message', ({ data }) => {
      cleanup();
      if (data?.ok) resolve(data.buffer as ArrayBuffer);
      else reject(new Error(data?.error || 'Ghostscript compression failed'));
    });
    worker.addEventListener('error', (e) => {
      cleanup();
      reject(new Error(e.message || 'Ghostscript worker error'));
    });
    worker.postMessage({ target: 'wasm', buffer: inputBuffer, preset }, [inputBuffer]);
  });

  const compressed = new File(
    [outputBuffer],
    file.name.replace(/\.pdf$/i, '') + '-compressed.pdf',
    { type: 'application/pdf' }
  );
  // Ghostscript occasionally grows tiny/optimized files - keep the smaller one
  return compressed.size < file.size ? compressed : file;
}
