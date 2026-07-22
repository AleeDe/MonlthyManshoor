// WebWorker that runs Ghostscript (WASM) to compress a PDF.
// Adapted from https://github.com/laurentmmeyer/ghostscript-pdf-compress.wasm (AGPL-3.0)
// Receives: { target: 'wasm', buffer: ArrayBuffer, preset: '/screen'|'/ebook'|'/printer' }
// Responds: { ok: true, buffer: ArrayBuffer } or { ok: false, error }

function compress(inputBuffer, preset, respond) {
  self.Module = {
    preRun: [
      function () {
        self.Module.FS.writeFile('input.pdf', new Uint8Array(inputBuffer));
      },
    ],
    postRun: [
      function () {
        try {
          const out = self.Module.FS.readFile('output.pdf', { encoding: 'binary' });
          // copy into a plain ArrayBuffer we can transfer
          const buf = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
          respond({ ok: true, buffer: buf }, [buf]);
        } catch (err) {
          respond({ ok: false, error: String(err) });
        }
      },
    ],
    arguments: [
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      '-dPDFSETTINGS=' + preset,
      '-dNOPAUSE',
      '-dQUIET',
      '-dBATCH',
      '-sOutputFile=output.pdf',
      'input.pdf',
    ],
    print: function () {},
    printErr: function () {},
    totalDependencies: 0,
    noExitRuntime: 1,
  };
  import('./gs-worker.js').catch((err) => respond({ ok: false, error: String(err) }));
}

self.addEventListener('message', function ({ data }) {
  if (!data || data.target !== 'wasm') return;
  const respond = (msg, transfer) => self.postMessage(msg, transfer || []);
  try {
    compress(data.buffer, data.preset || '/ebook', respond);
  } catch (err) {
    respond({ ok: false, error: String(err) });
  }
});
