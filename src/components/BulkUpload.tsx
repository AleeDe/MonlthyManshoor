import { useState, useRef } from 'react';
import { Upload, Trash2, CheckCircle2, XCircle, Loader2, FileText, Save, Zap, Eye, RefreshCw } from 'lucide-react';
import { uploadFile, createIssue } from '../lib/sanityAdmin';
import { pdfFirstPageToImage, coverTargetBytes, type CoverQuality } from '../lib/pdfTools';
import { gsCompressPdf, GS_PRESETS, type GsPreset } from '../lib/gsCompress';
import { defaultTitle, defaultDescription } from '../lib/issueDefaults';

interface BulkItem {
  file: File;
  title: string;
  description: string;
  jild: number;
  shumara: number;
  issue_month: number;
  issue_year: number;
  publish_date: string;
  featured: boolean;
  // per-row compression override; starts from global preset
  preset: GsPreset;
  compressed: File | null; // result of last compression at `preset`
  cover: File | null;
  status: 'pending' | 'compressing' | 'ready' | 'uploading' | 'done' | 'error';
  statusText: string;
}

interface BulkUploadProps {
  writeToken: string;
  compressEnabled: boolean;
  gsPreset: GsPreset;
  coverQuality: CoverQuality;
  onDone: () => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Try to guess month/year from filename, e.g. "manshoor-march-2021.pdf" or "2021-03.pdf"
function guessFromFilename(name: string): { month?: number; year?: number } {
  const lower = name.toLowerCase();
  const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  let month: number | undefined;
  monthNames.forEach((m, i) => {
    if (lower.includes(m) || lower.includes(m.slice(0, 3))) month = i + 1;
  });
  const yearMatch = lower.match(/(19[6-9]\d|20[0-4]\d)/);
  const year = yearMatch ? Number(yearMatch[1]) : undefined;
  if (!month) {
    const mm = lower.match(/(?:^|\D)(0?[1-9]|1[0-2])(?:\D|$)/);
    if (mm && year) month = Number(mm[1]);
  }
  return { month, year };
}

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);

export default function BulkUpload({ writeToken, compressEnabled, gsPreset, coverQuality, onDone }: BulkUploadProps) {
  const [items, setItems] = useState<BulkItem[]>([]);
  // Default jild for newly added files (applied to all; per-row editable)
  const [defaultJild, setDefaultJild] = useState(1);
  const [busy, setBusy] = useState(false);
  // latest items for async loops (state updates inside loops go stale otherwise)
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next: BulkItem[] = Array.from(files)
      .filter((f) => f.type === 'application/pdf')
      .map((file) => {
        const guess = guessFromFilename(file.name);
        const month = guess.month ?? new Date().getMonth() + 1;
        const year = guess.year ?? new Date().getFullYear();
        return {
          file,
          title: defaultTitle(month, year),
          description: defaultDescription(defaultJild, month, year, month),
          jild: defaultJild,
          shumara: month,
          issue_month: month,
          issue_year: year,
          publish_date: `${year}-${String(month).padStart(2, '0')}-01`,
          featured: false,
          preset: gsPreset,
          compressed: null,
          cover: null,
          status: 'pending' as const,
          statusText: '',
        };
      });
    setItems((prev) => [...prev, ...next]);
  };

  const updateItem = (idx: number, patch: Partial<BulkItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Patch month/year/jild and regenerate title, description and publish date
  const updateMeta = (
    idx: number,
    patch: Partial<Pick<BulkItem, 'jild' | 'shumara' | 'issue_month' | 'issue_year'>>
  ) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const jild = patch.jild ?? it.jild;
        const month = patch.issue_month ?? it.issue_month;
        const year = patch.issue_year ?? it.issue_year;
        // month change resets shumara to the month number
        const shumara = patch.shumara ?? (patch.issue_month !== undefined ? month : it.shumara);
        return {
          ...it,
          jild,
          shumara,
          issue_month: month,
          issue_year: year,
          title: defaultTitle(month, year),
          description: defaultDescription(jild, month, year, shumara),
          publish_date: `${year}-${String(month).padStart(2, '0')}-01`,
        };
      })
    );
  };

  // Apply a jild to every non-uploaded row
  const applyJildToAll = (jild: number) => {
    setDefaultJild(jild);
    setItems((prev) =>
      prev.map((it) =>
        it.status === 'done'
          ? it
          : {
              ...it,
              jild,
              title: defaultTitle(it.issue_month, it.issue_year),
              description: defaultDescription(jild, it.issue_month, it.issue_year, it.shumara),
            }
      )
    );
  };

  // Compress one row at the given (or its current) preset and generate its cover
  const compressOne = async (idx: number, presetOverride?: GsPreset) => {
    const item = itemsRef.current[idx];
    if (!item) return;
    const preset = presetOverride ?? item.preset;
    try {
      updateItem(idx, { status: 'compressing', statusText: `Compressing (${mb(item.file.size)} MB)...` });
      const pdf = compressEnabled ? await gsCompressPdf(item.file, preset) : item.file;
      updateItem(idx, { statusText: 'Generating cover...' });
      const cover = await pdfFirstPageToImage(pdf, coverTargetBytes(coverQuality));
      updateItem(idx, {
        compressed: pdf,
        cover,
        status: 'ready',
        statusText: `${mb(item.file.size)} MB → ${mb(pdf.size)} MB · cover ${(cover.size / 1024).toFixed(0)} KB`,
      });
    } catch (err: any) {
      console.error('Compress error:', err);
      updateItem(idx, { status: 'error', statusText: err?.message || 'Compression failed' });
    }
  };

  const compressAll = async () => {
    setBusy(true);
    // Run 2 compressions in parallel (each spawns its own Ghostscript worker)
    const pending = itemsRef.current
      .map((it, i) => ({ it, i }))
      .filter(({ it }) => it.status !== 'done' && it.status !== 'ready')
      .map(({ i }) => i);
    const CONCURRENCY = 2;
    let cursor = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, pending.length) }, async () => {
      while (cursor < pending.length) {
        const idx = pending[cursor++];
        await compressOne(idx);
      }
    });
    await Promise.all(workers);
    setBusy(false);
  };

  // Re-compress a single row after the admin changes its preset
  const recompressOne = async (idx: number, preset: GsPreset) => {
    updateItem(idx, { preset, compressed: null, cover: null });
    setBusy(true);
    await compressOne(idx, preset);
    setBusy(false);
  };

  const uploadAll = async () => {
    setBusy(true);
    for (let i = 0; i < itemsRef.current.length; i++) {
      const item = itemsRef.current[i];
      if (item.status === 'done') continue;
      if (item.status !== 'ready' || !item.compressed || !item.cover) continue;
      try {
        updateItem(i, { status: 'uploading', statusText: 'Uploading cover...' });
        const coverAsset = await uploadFile(writeToken, item.cover);
        updateItem(i, { statusText: `Uploading PDF (${mb(item.compressed.size)} MB)...` });
        const pdfAsset = await uploadFile(writeToken, item.compressed);
        updateItem(i, { statusText: 'Creating issue...' });
        await createIssue(writeToken, {
          title: item.title,
          description: item.description,
          coverImageAssetId: coverAsset.assetId,
          pdfAssetId: pdfAsset.assetId,
          issueMonth: item.issue_month,
          issueYear: item.issue_year,
          publishDate: item.publish_date,
          featured: item.featured,
        });
        updateItem(i, { status: 'done', statusText: 'Uploaded' });
      } catch (err: any) {
        console.error('Bulk upload error:', err);
        updateItem(i, { status: 'error', statusText: err?.message || 'Upload failed' });
      }
    }
    setBusy(false);
    onDone();
  };

  const doneCount = items.filter((i) => i.status === 'done').length;
  const readyCount = items.filter((i) => i.status === 'ready').length;
  const pendingCount = items.filter((i) => i.status === 'pending' || i.status === 'error').length;

  const openPreview = (file: File) => {
    window.open(URL.createObjectURL(file), '_blank');
  };

  return (
    <div className="space-y-6">
      <label className="flex flex-col items-center justify-center gap-3 w-full px-6 py-10 rounded-2xl border-2 border-dashed border-gray-300 hover:border-red-600 cursor-pointer transition-colors bg-gray-50">
        <Upload className="w-8 h-8 text-gray-400" />
        <span className="text-gray-600 font-medium">Select multiple PDFs (or add more)</span>
        <span className="text-xs text-gray-500">
          Step 1: Compress All → check each result (preview / change preset) → Step 2: Upload All
        </span>
        <input
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </label>

      {items.length > 0 && (
        <>
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">جلد (volume) - apply to all:</label>
            <select
              value={defaultJild}
              disabled={busy}
              onChange={(e) => applyJildToAll(Number(e.target.value))}
              className="w-24 px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-red-600 focus:outline-none text-sm"
            >
              {Array.from({ length: 99 }, (_, i) => i + 1).map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
            <span className="text-xs text-gray-500">Title/description are auto-generated from month, year and jild - edit per row if needed</span>
          </div>

          <div className="space-y-4">
            {items.map((item, idx) => (
              <div
                key={`${item.file.name}-${idx}`}
                className={`border-2 rounded-xl p-4 space-y-3 transition-colors ${
                  item.status === 'done'
                    ? 'border-green-300 bg-green-50'
                    : item.status === 'error'
                    ? 'border-red-300 bg-red-50'
                    : item.status === 'ready'
                    ? 'border-blue-200 bg-blue-50/40'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <FileText className="w-5 h-5 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-600 truncate flex-1 min-w-40">
                    {item.file.name} ({mb(item.file.size)} MB)
                  </span>
                  {(item.status === 'compressing' || item.status === 'uploading') && (
                    <span className="flex items-center gap-2 text-sm text-blue-700">
                      <Loader2 className="w-4 h-4 animate-spin" /> {item.statusText}
                    </span>
                  )}
                  {item.status === 'ready' && (
                    <span className="flex items-center gap-1 text-sm text-blue-700 font-medium">
                      <Zap className="w-4 h-4" /> {item.statusText}
                    </span>
                  )}
                  {item.status === 'done' && (
                    <span className="flex items-center gap-1 text-sm text-green-700">
                      <CheckCircle2 className="w-4 h-4" /> Uploaded
                    </span>
                  )}
                  {item.status === 'error' && (
                    <span className="flex items-center gap-1 text-sm text-red-700">
                      <XCircle className="w-4 h-4" /> {item.statusText}
                    </span>
                  )}
                  {item.status !== 'compressing' && item.status !== 'uploading' && item.status !== 'done' && (
                    <button
                      onClick={() => removeItem(idx)}
                      className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="Remove"
                      disabled={busy}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* per-row compression controls after compression */}
                {item.status === 'ready' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={item.preset}
                      disabled={busy}
                      onChange={(e) => recompressOne(idx, e.target.value as GsPreset)}
                      className="px-3 py-1.5 rounded-lg border-2 border-gray-200 focus:border-red-600 focus:outline-none text-sm"
                      title="Change quality for this file only - re-compresses immediately"
                    >
                      {GS_PRESETS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => item.compressed && openPreview(item.compressed)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-gray-200 hover:border-red-600 text-sm text-gray-700 transition-colors"
                      title="Open compressed PDF in a new tab to check quality"
                    >
                      <Eye className="w-4 h-4" /> Preview PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => recompressOne(idx, item.preset)}
                      disabled={busy}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-gray-200 hover:border-red-600 text-sm text-gray-700 transition-colors"
                      title="Re-compress this file"
                    >
                      <RefreshCw className="w-4 h-4" /> Redo
                    </button>
                    {item.cover && (
                      <img
                        src={URL.createObjectURL(item.cover)}
                        alt="cover"
                        className="h-14 rounded border border-gray-200"
                        title={`Auto cover · ${(item.cover.size / 1024).toFixed(0)} KB`}
                      />
                    )}
                  </div>
                )}

                {item.status !== 'done' && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-12 gap-3 items-center">
                      <select
                        value={item.issue_month}
                        disabled={busy}
                        onChange={(e) => updateMeta(idx, { issue_month: Number(e.target.value) })}
                        className="md:col-span-2 px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-red-600 focus:outline-none text-sm"
                      >
                        {MONTHS.map((m, i) => (
                          <option key={m} value={i + 1}>{m}</option>
                        ))}
                      </select>
                      <select
                        value={item.issue_year}
                        disabled={busy}
                        onChange={(e) => updateMeta(idx, { issue_year: Number(e.target.value) })}
                        className="md:col-span-2 px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-red-600 focus:outline-none text-sm"
                      >
                        {Array.from(
                          { length: new Date().getFullYear() + 2 - 1964 },
                          (_, i) => new Date().getFullYear() + 1 - i
                        ).map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <div className="md:col-span-2 flex items-center gap-2">
                        <label className="text-sm text-gray-600 whitespace-nowrap">شمارہ</label>
                        <select
                          value={item.shumara}
                          disabled={busy}
                          onChange={(e) => updateMeta(idx, { shumara: Number(e.target.value) })}
                          className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-red-600 focus:outline-none text-sm"
                        >
                          {Array.from({ length: 99 }, (_, i) => i + 1).map((s) => (
                            <option key={s} value={s}>{String(s).padStart(2, '0')}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2 flex items-center gap-2">
                        <label className="text-sm text-gray-600 whitespace-nowrap">جلد</label>
                        <select
                          value={item.jild}
                          disabled={busy}
                          onChange={(e) => updateMeta(idx, { jild: Number(e.target.value) })}
                          className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-red-600 focus:outline-none text-sm"
                        >
                          {Array.from({ length: 99 }, (_, i) => i + 1).map((j) => (
                            <option key={j} value={j}>{j}</option>
                          ))}
                        </select>
                      </div>
                      <label className="md:col-span-2 flex items-center gap-1.5 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={item.featured}
                          disabled={busy}
                          onChange={(e) => updateItem(idx, { featured: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-600"
                        />
                        Featured
                      </label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={item.title}
                        disabled={busy}
                        onChange={(e) => updateItem(idx, { title: e.target.value })}
                        className="px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-red-600 focus:outline-none text-sm"
                        placeholder="Title (auto - editable)"
                      />
                      <input
                        type="text"
                        value={item.description}
                        disabled={busy}
                        dir="rtl"
                        onChange={(e) => updateItem(idx, { description: e.target.value })}
                        className="px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-red-600 focus:outline-none text-sm font-urdu"
                        placeholder="Description (auto - editable)"
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={compressAll}
              disabled={busy || pendingCount === 0}
              className="flex-1 min-w-48 bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              Compress All ({pendingCount})
            </button>
            <button
              onClick={uploadAll}
              disabled={busy || readyCount === 0}
              className="flex-1 min-w-48 bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Upload All ({readyCount} ready)
            </button>
            {!busy && doneCount > 0 && (
              <button
                onClick={() => setItems((prev) => prev.filter((i) => i.status !== 'done'))}
                className="px-6 py-3 rounded-xl font-semibold border-2 border-gray-200 hover:bg-gray-100 transition-colors"
              >
                Clear done
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500">
            After Compress All, each row shows its result - use the dropdown to change quality for just that file (re-compresses instantly), and "Preview PDF" to verify. Then Upload All. Don't close this tab while working.
          </p>
        </>
      )}
    </div>
  );
}
