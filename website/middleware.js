// DarkOps — Vercel Edge Middleware
// Injects chat-widget.js into every HTML page except excluded paths.
// New pages get the widget automatically. Zero manual script tags.

export default async function middleware(request) {
  const { pathname } = new URL(request.url);

  // Only process page requests, not static assets
  const isAsset = /\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot|mp4|webm|json|xml|txt|map)$/i.test(pathname);
  if (isAsset) return;

  // Pages that should NEVER get the chat widget
  const excludePaths = ['/login', '/sign-in', '/set-password', '/reset-password'];
  const isExcluded = excludePaths.some(p => pathname.startsWith(p));

  // Fetch the original response
  const response = await fetch(request);

  // Only inject into HTML responses
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  // Skip excluded pages
  if (isExcluded) return response;

  // Read the HTML body
  const html = await response.text();

  // Inject script before </body> — if </body> is missing, skip silently
  if (!html.includes('</body>')) return new Response(html, response);

  const injected = html.replace(
    '</body>',
    '<script src="/chat-widget.js" defer></script>\n</body>'
  );

  return new Response(injected, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

// Run on all routes
export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
