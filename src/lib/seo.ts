// Lightweight SEO helper (no dependency): sets document title and meta/OG tags.
// Note: OG previews on WhatsApp/Facebook read server HTML; for a static SPA the
// base tags in index.html are what crawlers without JS see. Google renders JS,
// so dynamic titles/descriptions do help search.

const SITE_NAME = 'Monthly Manshoor';

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function setSeo(opts: { title?: string; description?: string; image?: string; url?: string }) {
  const title = opts.title ? `${opts.title} | ${SITE_NAME}` : `${SITE_NAME} - ماہنامہ منشور`;
  document.title = title;
  const description =
    opts.description ||
    "Pakistan's oldest progressive socio-economic and literary Urdu monthly, published since 1964. Read and download issues from the digital archive.";
  setMeta('name', 'description', description);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:type', 'website');
  setMeta('property', 'og:site_name', SITE_NAME);
  if (opts.image) setMeta('property', 'og:image', opts.image);
  if (opts.url) setMeta('property', 'og:url', opts.url);
  setMeta('name', 'twitter:card', opts.image ? 'summary_large_image' : 'summary');
}
