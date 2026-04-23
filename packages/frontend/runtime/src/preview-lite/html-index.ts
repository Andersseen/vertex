export interface IndexHtmlInfo {
  entryScript: string | null
  hasModuleScript: boolean
}

const MODULE_SCRIPT_RE = /<script\s+[^>]*type=["']module["'][^>]*src=["']([^"']+)["'][^>]*><\/script>/i

export function parseIndexHtml(html: string): IndexHtmlInfo {
  const match = MODULE_SCRIPT_RE.exec(html)
  return {
    entryScript: match ? match[1] : null,
    hasModuleScript: Boolean(match),
  }
}

/**
 * Replace the user's `<script type="module" src="/src/main.ts">` with the
 * built bundle path so the SW serves it from /vertex-preview/<bundle>.
 * Returns the original HTML untouched if no module script is present.
 */
export function rewriteEntryScript(html: string, newSrc: string): string {
  return html.replace(MODULE_SCRIPT_RE, `<script type="module" src="${newSrc}"></script>`)
}

/**
 * Inject `<link rel="stylesheet">` tags for built CSS files just before `</head>`.
 */
export function injectStylesheets(html: string, hrefs: string[]): string {
  if (hrefs.length === 0) return html
  const links = hrefs
    .map((href) => `  <link rel="stylesheet" href="${href}">`)
    .join('\n')
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${links}\n</head>`)
  }
  return links + '\n' + html
}

/**
 * Strip the leading slash on root-relative src/href so the iframe resolves
 * them under /vertex-preview/* instead of the parent app's origin root.
 * Leaves protocol-relative (//cdn) and absolute URLs alone.
 */
export function makePathsRelative(html: string): string {
  return html
    .replace(/(\s(?:src|href))=(["'])\/(?!\/)/gi, '$1=$2')
}

/**
 * Rewrite (or inject) the <base href> so the iframe resolves relative URLs
 * under the preview scope (e.g. /vertex-preview/) instead of the parent
 * origin's root. Angular, Vue-Router, and many SPA templates ship a
 * `<base href="/">` — inside an iframe that would redirect every module
 * resolution to the parent dev server and cross-contaminate the app.
 */
export function rewriteBaseHref(html: string, newHref: string): string {
  if (/<base\s[^>]*href=/i.test(html)) {
    return html.replace(/<base\s[^>]*href=["'][^"']*["'][^>]*>/i, `<base href="${newHref}">`)
  }
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => `${match}\n  <base href="${newHref}">`)
  }
  return `<base href="${newHref}">\n` + html
}

/**
 * Inject the Tailwind browser/CDN runtime into <head>.
 * - v3: cdn.tailwindcss.com (Play CDN, JIT in browser)
 * - v4: @tailwindcss/browser via esm.sh
 * Used only in the esbuild path (lib-bundling) where we can't run PostCSS.
 */
export function injectTailwindCdn(html: string, version: 'v3' | 'v4'): string {
  const tag =
    version === 'v4'
      ? `<script src="https://unpkg.com/@tailwindcss/browser@4"></script>`
      : `<script src="https://cdn.tailwindcss.com"></script>`
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `  ${tag}\n</head>`)
  }
  return tag + '\n' + html
}
