// HiViews — Vercel Edge Middleware
// Injects global head tags + chat widget + Google Tag Manager into every HTML page.
// New pages get everything automatically. Zero manual tags.

// ── Google Tag Manager container ID ──
// Loaded on every HTML page (including /portal/dashboard) so we capture the
// full funnel from ad → purchase → dashboard engagement. To replace the
// container, change this one constant.
const GTM_ID = 'GTM-NSPVHQDJ';

// GTM <script> — injected as the FIRST child of <head> (GTM requires "as
// high as possible" so it fires before other tags and captures pageview
// timing correctly).
const GTM_HEAD = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');</script>
<!-- End Google Tag Manager -->`;

// GTM <noscript> iframe — injected IMMEDIATELY after the <body> opening tag
// so users with JS disabled still trigger a pageview.
const GTM_BODY = `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;

// ── Global <head> injections (favicon, meta) — inserted before </head> ──
// Logo injector resolves `<span data-hv-logo="wordmark">` placeholders at
// DOMContentLoaded by reading hv-logo-* meta tags.
// See HiViews-Engine/docs/LOGO_TREATMENT.md for the full contract.
// Optical-centering nudge: the wordmark's geometric viewBox extends above
// the dumbbell (light visual weight) and below the "Views" letterforms
// (dense visual weight), so the geometric center sits ~4px below the
// optical center. One-line CSS correction applied globally so any nav
// bar using the placeholder looks balanced without per-page tweaks.
const HEAD_INJECT = [
  '<link rel="icon" href="/favicon.ico" type="image/x-icon">',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
  '<meta name="hv-logo-wordmark" content="/brand/wordmark-dark.svg">',
  '<script src="/_hv/logo.js" defer></script>',
  '<style>[data-hv-logo="wordmark"]{display:inline-block;transform:translateY(-4px) scale(0.9);transform-origin:left center;vertical-align:middle}</style>',
].join('\n');

// ── Pages excluded from chat widget (favicon + GTM still inject) ──
const CHAT_EXCLUDE = ['/login', '/sign-in', '/set-password', '/reset-password'];

export default async function middleware(request) {
  const { pathname } = new URL(request.url);

  // Skip static assets entirely — no rewriting needed
  const isAsset = /\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot|mp4|webm|json|xml|txt|map)$/i.test(pathname);
  if (isAsset) return;

  // Fetch the original response
  const response = await fetch(request);

  // Only inject into HTML responses
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  // Read the HTML body
  let html = await response.text();

  // Inject GTM <script> as early in <head> as possible. The `<head>` opening
  // tag matches even if it carries attributes (rare but possible).
  // Regex is case-insensitive; only the first match is replaced.
  html = html.replace(/<head([^>]*)>/i, `<head$1>\n${GTM_HEAD}`);

  // Inject GTM <noscript> immediately after opening <body> tag.
  html = html.replace(/<body([^>]*)>/i, `<body$1>\n${GTM_BODY}`);

  // Inject favicon / meta right before </head> — ALL pages
  if (html.includes('</head>')) {
    html = html.replace('</head>', HEAD_INJECT + '\n</head>');
  }

  // Inject chat widget before </body> — excluded pages skip this
  const isExcluded = CHAT_EXCLUDE.some(p => pathname.startsWith(p));
  if (!isExcluded && html.includes('</body>')) {
    html = html.replace(
      '</body>',
      '<script src="/chat-widget.js" defer></script>\n</body>'
    );
  }

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

// Run on all routes
export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
