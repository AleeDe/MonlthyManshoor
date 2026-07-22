// Custom PDF reader built on pdf.js (already bundled for cover generation).
// Design follows pdf.js best practice for mobile: render ONLY the current page
// (preloading its neighbors' data via the shared document), at devicePixelRatio
// capped to keep canvases small on high-DPI phones. Page 1 appears as soon as
// its data streams in - no waiting for the full file.
import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Minimize2, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

interface PdfReaderProps {
  url: string;
  title: string;
}

export default function PdfReader({ url, title }: PdfReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  // Resume from last-read page per document (keyed by URL)
  const posKey = `manshoor_pos_${url.split('/').pop()}`;
  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(() => {
    const saved = parseInt(localStorage.getItem(posKey) || '1', 10);
    return isNaN(saved) || saved < 1 ? 1 : saved;
  });
  const [zoom, setZoom] = useState(1); // 1 = fit width
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [pageInput, setPageInput] = useState('1');

  // Load document (streams; first page available before full download)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    // resume last-read page for this document (or 1)
    const saved = parseInt(localStorage.getItem(posKey) || '1', 10);
    const start = isNaN(saved) || saved < 1 ? 1 : saved;
    setPageNum(start);
    setPageInput(String(start));
    const task = pdfjsLib.getDocument({
      url,
      wasmUrl: '/pdfjs-wasm/',
      // allow byte-range requests so we don't need the whole file up front
      disableAutoFetch: false,
      disableStream: false,
    });
    task.promise
      .then((doc) => {
        if (cancelled) return;
        docRef.current = doc;
        setNumPages(doc.numPages);
        // clamp resumed page in case the file changed
        setPageNum((p) => {
          const clamped = Math.min(p, doc.numPages);
          setPageInput(String(clamped));
          return clamped;
        });
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('PDF load failed:', err);
        setError('Could not load the PDF. Try the Download button instead.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
      task.destroy().catch(() => {});
      docRef.current = null;
    };
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist reading position
  useEffect(() => {
    if (!loading && numPages > 0) localStorage.setItem(posKey, String(pageNum));
  }, [pageNum, loading, numPages, posKey]);

  // Render current page whenever page/zoom/container changes
  const renderPage = useCallback(async () => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!doc || !canvas || !container) return;

    renderTaskRef.current?.cancel();
    setPageLoading(true);
    try {
      const page = await doc.getPage(pageNum);
      const base = page.getViewport({ scale: 1 });
      const containerWidth = container.clientWidth - 16; // padding
      const fitScale = containerWidth / base.width;
      // cap DPR at 2: retina-sharp without huge canvases on mobile (pdf.js guidance)
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const scale = fitScale * zoom;
      const viewport = page.getViewport({ scale });

      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const task = page.render({
        canvas,
        viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
      });
      renderTaskRef.current = task;
      await task.promise;
      renderTaskRef.current = null;

      // warm the next page's data in the background for instant flips
      if (pageNum < doc.numPages) doc.getPage(pageNum + 1).catch(() => {});
    } catch (err: unknown) {
      // RenderingCancelledException is expected on rapid page flips
      if ((err as { name?: string })?.name !== 'RenderingCancelledException') {
        console.error('Render failed:', err);
      }
    } finally {
      setPageLoading(false);
    }
  }, [pageNum, zoom]);

  useEffect(() => {
    if (!loading && !error) renderPage();
  }, [loading, error, renderPage]);

  // Re-render on container resize (orientation change, fullscreen toggle)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let raf = 0;
    const obs = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => renderPage());
    });
    obs.observe(container);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [renderPage]);

  const goTo = useCallback(
    (n: number) => {
      const clamped = Math.min(Math.max(1, n), numPages || 1);
      setPageNum(clamped);
      setPageInput(String(clamped));
      containerRef.current?.scrollTo({ top: 0 });
    },
    [numPages]
  );

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') goTo(pageNum + 1);
      if (e.key === 'ArrowLeft') goTo(pageNum - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pageNum, goTo]);

  // First-visit hint: shown until the user turns a page by swipe/drag, then never again
  const [showHint, setShowHint] = useState(() => localStorage.getItem('manshoor_reader_hint') !== 'done');
  const dismissHint = useCallback(() => {
    if (localStorage.getItem('manshoor_reader_hint') !== 'done') {
      localStorage.setItem('manshoor_reader_hint', 'done');
    }
    setShowHint(false);
  }, []);
  // auto-hide hint after page 2 or 8 seconds
  useEffect(() => {
    if (!showHint) return;
    if (pageNum > 2) { dismissHint(); return; }
    const t = setTimeout(dismissHint, 8000);
    return () => clearTimeout(t);
  }, [showHint, pageNum, dismissHint]);

  const flipFromDx = useCallback(
    (dx: number) => {
      if (Math.abs(dx) > 60) {
        // swipe/drag left = next page
        goTo(dx < 0 ? pageNum + 1 : pageNum - 1);
        dismissHint();
      }
    },
    [pageNum, goTo, dismissHint]
  );

  // Touch swipe navigation
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || zoom > 1) return; // don't hijack panning while zoomed
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    flipFromDx(dx);
  };

  // Mouse drag navigation (desktop)
  const mouseStartX = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || zoom > 1) return; // let native scroll/pan handle zoomed view
    mouseStartX.current = e.clientX;
    setDragging(true);
  };
  const onMouseUp = (e: React.MouseEvent) => {
    setDragging(false);
    if (mouseStartX.current === null) return;
    const dx = e.clientX - mouseStartX.current;
    mouseStartX.current = null;
    flipFromDx(dx);
  };
  const onMouseLeave = () => {
    mouseStartX.current = null;
    setDragging(false);
  };

  const wrapperClass = fullscreen
    ? 'fixed inset-0 z-50 bg-gray-900 flex flex-col'
    : 'flex flex-col rounded-2xl overflow-hidden border border-gray-200';

  return (
    <div className={wrapperClass}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 bg-gray-900 text-white px-3 py-2 select-none">
        <div className="flex items-center gap-1">
          <button
            onClick={() => goTo(pageNum - 1)}
            disabled={pageNum <= 1}
            className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1 text-sm">
            <input
              type="text"
              inputMode="numeric"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const n = parseInt(pageInput, 10);
                  if (!isNaN(n)) goTo(n);
                }
              }}
              onBlur={() => {
                const n = parseInt(pageInput, 10);
                if (!isNaN(n)) goTo(n);
                else setPageInput(String(pageNum));
              }}
              className="w-10 text-center bg-white/10 rounded-md py-1 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <span className="text-gray-400">/ {numPages || '–'}</span>
          </div>
          <button
            onClick={() => goTo(pageNum + 1)}
            disabled={pageNum >= numPages}
            className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
            disabled={zoom <= 0.5}
            className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="text-xs text-gray-400 hover:text-white w-10 text-center transition-colors"
            title="Reset to fit width"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
            disabled={zoom >= 3}
            className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={() => setFullscreen((f) => !f)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Page area */}
      <div
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        className={`relative overflow-auto bg-gray-800 flex justify-center p-2 ${
          fullscreen ? 'flex-1' : ''
        } ${zoom <= 1 ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
        style={fullscreen ? undefined : { height: 'min(75vh, 900px)' }}
        aria-label={`${title} - page ${pageNum} of ${numPages}`}
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-300">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">Loading magazine...</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <p className="text-red-300 text-center">{error}</p>
          </div>
        )}
        {!loading && !error && (
          <>
            {pageLoading && (
              <div className="absolute top-3 right-3 z-10">
                <Loader2 className="w-5 h-5 animate-spin text-white/60" />
              </div>
            )}
            <canvas ref={canvasRef} className="shadow-2xl rounded-sm my-auto select-none" draggable={false} />
            {showHint && pageNum <= 2 && (
              <div
                className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center z-10 animate-fade-in"
                aria-hidden
              >
                <div className="bg-black/70 text-white text-sm px-5 py-3 rounded-2xl flex items-center gap-3 shadow-xl backdrop-blur-sm">
                  <ChevronLeft className="w-5 h-5 animate-pulse" />
                  <span className="whitespace-nowrap">
                    <span className="sm:hidden">Swipe to turn pages</span>
                    <span className="hidden sm:inline">Drag or use arrow keys to turn pages</span>
                    {' · '}
                    <span className="font-urdu" dir="rtl">صفحہ پلٹنے کے لیے سوائپ کریں</span>
                  </span>
                  <ChevronRight className="w-5 h-5 animate-pulse" />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
