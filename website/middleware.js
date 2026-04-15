// DarkOps — Vercel Edge Middleware
// Injects global head tags + chat widget into every HTML page.
// New pages get everything automatically. Zero manual tags.

// ── Global <head> injections (favicon, meta, etc.) ──
const HEAD_INJECT = [
  '<link rel="icon" href="/favicon.ico" type="image/x-icon">',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
].join('\n');

// ── Pages excluded from chat widget (favicon still injected) ──
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

  // Inject head tags (favicon, apple-touch-icon) — ALL pages
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
