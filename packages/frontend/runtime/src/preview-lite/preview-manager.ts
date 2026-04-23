import { ServiceWorkerManager } from "./service-worker/sw-manager";
import { HotReload } from "./hot-reload";
import { generateIndexHtml } from "./template";
import {
  injectStylesheets,
  injectTailwindCdn,
  makePathsRelative,
  parseIndexHtml,
  rewriteBaseHref,
  rewriteEntryScript,
} from "./html-index";
import type { IVirtualFS } from "../types/fs.types";
import type {
  PreviewConfig,
  PreviewSession,
  IPreviewManager,
} from "../types/preview.types";
import {
  detectFramework,
  extractDependencyVersions,
  readPackageJson,
} from "../build/resolver";

/**
 * zone.js must patch globals BEFORE Angular core loads. A classic <script>
 * (non-module) is synchronous and runs to completion before the deferred
 * module script that carries the app bundle.
 */
function injectZoneJs(html: string, zoneVersion: string): string {
  const tag = `<script src="https://unpkg.com/zone.js@${zoneVersion}/bundles/zone.umd.js"></script>`;
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `  ${tag}\n</head>`);
  }
  return tag + "\n" + html;
}

/**
 * Build an ES module importmap that pins ALL @angular/* packages (and their
 * subpaths like @angular/common/http) to the same esm.sh URLs.
 *
 * The `*` prefix on the esm.sh URL forces the CDN to emit bare specifiers
 * for every transitive dep — the browser then resolves every reference via
 * the same importmap entry, guaranteeing a single Angular instance.
 *
 * The trailing-slash entries cover subpaths: a library importing
 * `@angular/common/http` resolves through the `"@angular/common/"` mapping
 * to `https://esm.sh/*@angular/common@VER/http`.
 *
 * Without this shape we see NG0200 / NullInjectorError as two distinct
 * copies of @angular/core get loaded and DI can't match providers.
 */
function buildAngularImportMap(versions: Record<string, string>): string | null {
  const angularPkgs = Object.entries(versions).filter(([k]) =>
    k.startsWith("@angular/"),
  );
  if (angularPkgs.length === 0) return null;

  const imports: Record<string, string> = {};
  for (const [pkg, version] of angularPkgs) {
    imports[pkg] = `https://esm.sh/*${pkg}@${version}`;
    imports[`${pkg}/`] = `https://esm.sh/*${pkg}@${version}/`;
  }
  // rxjs is a peer of @angular/core and must share the same instance.
  if (versions["rxjs"]) {
    imports["rxjs"] = `https://esm.sh/*rxjs@${versions["rxjs"]}`;
    imports["rxjs/"] = `https://esm.sh/*rxjs@${versions["rxjs"]}/`;
  }
  if (versions["tslib"]) {
    imports["tslib"] = `https://esm.sh/tslib@${versions["tslib"]}`;
  }
  return JSON.stringify({ imports }, null, 2);
}

function injectImportMap(html: string, mapJson: string): string {
  const tag = `<script type="importmap">\n${mapJson}\n</script>`;
  // Importmap MUST come before any <script type="module"> that uses it, and
  // the standard says only one importmap per document, placed in <head>.
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => `${match}\n  ${tag}`);
  }
  return tag + "\n" + html;
}

export class PreviewLiteManager implements IPreviewManager {
  private readonly swManager = new ServiceWorkerManager();
  private hotReload: HotReload | null = null;
  private running = false;

  constructor(
    private readonly fs: IVirtualFS,
    private readonly swUrl = "/vertex-sw.js",
  ) {}

  async start(config: PreviewConfig): Promise<PreviewSession> {
    if (this.running) await this.stop();

    await this.swManager.register(this.swUrl);

    const files = await this.collectFiles(config.serveDir);
    const pkg = await readPackageJson(this.fs, "/");
    const framework = detectFramework(pkg);
    const versions = extractDependencyVersions(pkg);

    const jsFiles = Object.keys(files).filter((p) => p.endsWith(".js"));
    const cssFiles = Object.keys(files).filter((p) => p.endsWith(".css"));
    const bundlePath =
      jsFiles.find((p) => p === "/main.js") ??
      jsFiles.find((p) => /^\/[^/]+\.js$/.test(p)) ??
      jsFiles[0] ??
      "/main.js";

    files["/index.html"] = await this.buildIndexHtml({
      builtIndex: files["/index.html"],
      userIndexPath: config.indexHtml,
      bundlePath,
      cssFiles,
      framework,
      zoneVersion: versions["zone.js"],
      versions,
      tailwind: config.tailwind ?? null,
      baseHref: config.baseUrl.endsWith("/") ? config.baseUrl : config.baseUrl + "/",
    });

    await this.swManager.mountFiles(files);
    this.running = true;

    const iframeRef: { contentWindow: Window | null } = { contentWindow: null };
    this.hotReload = new HotReload(this.fs, this.swManager, iframeRef);
    this.hotReload.start(config.serveDir);

    const previewUrl = `${config.baseUrl}/index.html`;

    const session: PreviewSession = {
      url: previewUrl,

      reload: () => {
        iframeRef.contentWindow?.location.reload();
      },

      hotReload: async (paths: string[]) => {
        for (const path of paths) {
          try {
            const content = await this.fs.readFile(path);
            this.swManager.updateFile(path, content);
          } catch {
            // ignore missing files
          }
        }
        iframeRef.contentWindow?.postMessage(
          { type: "HMR_UPDATE", paths },
          "*",
        );
      },

      destroy: () => {
        this.stop();
      },
    };

    (
      session as PreviewSession & { _setIframe(el: HTMLIFrameElement): void }
    )._setIframe = (el: HTMLIFrameElement) => {
      iframeRef.contentWindow = el.contentWindow;
    };

    return session;
  }

  async stop(): Promise<void> {
    this.hotReload?.stop();
    this.hotReload = null;
    try {
      this.swManager.clear();
      await this.swManager.unregister();
    } catch {
      // ignore errors on cleanup
    }
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  private async buildIndexHtml(opts: {
    builtIndex: string | undefined;
    userIndexPath: string | undefined;
    bundlePath: string;
    cssFiles: string[];
    framework: ReturnType<typeof detectFramework>;
    zoneVersion?: string;
    versions: Record<string, string>;
    tailwind: 'v3' | 'v4' | null;
    baseHref: string;
  }): Promise<string> {
    const bundleRel = opts.bundlePath.replace(/^\//, "");
    const cssRels = opts.cssFiles.map((p) => p.replace(/^\//, ""));

    let html: string;
    const userHtml = opts.userIndexPath
      ? await this.fs.readFile(opts.userIndexPath).catch(() => null)
      : null;

    if (userHtml) {
      html = userHtml;
      const parsed = parseIndexHtml(html);
      if (parsed.hasModuleScript) {
        html = rewriteEntryScript(html, bundleRel);
      } else {
        html = html.replace(
          /<\/body>/i,
          `  <script type="module" src="${bundleRel}"></script>\n</body>`,
        );
      }
      html = injectStylesheets(html, cssRels);
      html = makePathsRelative(html);
    } else if (opts.builtIndex) {
      html = makePathsRelative(opts.builtIndex);
    } else {
      html = generateIndexHtml({
        title: "Vertex Preview",
        entryScript: bundleRel,
        cssFiles: cssRels,
      });
    }

    // Always rewrite the <base href> so relative module imports inside the
    // iframe stay within the preview scope. Without this, `<base href="/">`
    // in the user's index (standard in Angular CLI) makes every import
    // resolve against the parent origin — which in dev hits Vertex's own
    // Vite server and pulls the IDE's Angular chunks into the preview,
    // causing DI errors like NG0200 / NullInjector.
    html = rewriteBaseHref(html, opts.baseHref);

    if (opts.framework === "angular") {
      const importMap = buildAngularImportMap(opts.versions);
      if (importMap) {
        html = injectImportMap(html, importMap);
      }
      if (opts.zoneVersion) {
        html = injectZoneJs(html, opts.zoneVersion);
      }
    }
    if (opts.tailwind) {
      html = injectTailwindCdn(html, opts.tailwind);
    }
    return html;
  }

  private async collectFiles(dir: string): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    await this.collectRecursive(dir, dir, result);
    return result;
  }

  private async collectRecursive(
    baseDir: string,
    currentDir: string,
    result: Record<string, string>,
  ): Promise<void> {
    let entries;
    try {
      entries = await this.fs.readDir(currentDir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.type === "file") {
        try {
          const content = await this.fs.readFile(entry.path);
          const swPath =
            "/" + entry.path.slice(baseDir.length).replace(/^\//, "");
          result[swPath] = content;
        } catch {
          // skip unreadable files
        }
      } else {
        await this.collectRecursive(baseDir, entry.path, result);
      }
    }
  }
}
