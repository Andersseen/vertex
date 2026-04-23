import { ServiceWorkerManager } from "./service-worker/sw-manager";
import { HotReload } from "./hot-reload";
import { generateIndexHtml } from "./template";
import {
  injectStylesheets,
  injectTailwindCdn,
  makePathsRelative,
  parseIndexHtml,
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

function toModuleSpecifier(src: string): string {
  if (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("//") ||
    src.startsWith("/") ||
    src.startsWith("./") ||
    src.startsWith("../")
  ) {
    return src;
  }
  return "./" + src;
}

function injectAngularBootstrap(html: string, compilerVersion: string): string {
  return html.replace(
    /<script\s+type=["']module["']\s+src=["']([^"']+)["']><\/script>/,
    (_match, entrySrc: string) => {
      const specifier = toModuleSpecifier(entrySrc);
      return `<script type="module">import { publishFacade } from 'https://esm.sh/@angular/compiler@${compilerVersion}'; publishFacade(globalThis); import ${JSON.stringify(specifier)};</script>`;
    },
  );
}

export class PreviewManager implements IPreviewManager {
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
      angularCompilerVersion: versions["@angular/compiler"],
      tailwind: config.tailwind ?? null,
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
    angularCompilerVersion?: string;
    tailwind: 'v3' | 'v4' | null;
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

    if (opts.framework === "angular" && opts.angularCompilerVersion) {
      html = injectAngularBootstrap(html, opts.angularCompilerVersion);
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
