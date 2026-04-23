import * as esbuild from "esbuild-wasm";
import type { IVirtualFS } from "../types/fs.types";
import type {
  BuildConfig,
  BuildResult,
  BuildProgressCallback,
  IBundler,
} from "../types/build.types";
import {
  virtualFsPlugin,
  npmCdnPlugin,
  aliasPlugin,
  stripTailwindDirectives,
} from "./plugins";
import {
  readPackageJson,
  extractDependencyVersions,
  detectFramework,
} from "./resolver";
import { readTsConfigPaths, readViteAliases } from "./config-resolver";

let initialized = false;

async function clearDir(fs: IVirtualFS, dir: string): Promise<void> {
  let entries;
  try {
    entries = await fs.readDir(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.type === "directory") {
      await clearDir(fs, entry.path);
      continue;
    }

    await fs.deleteFile(entry.path).catch(() => {});
  }
}

export class Bundler implements IBundler {
  private readonly fs: IVirtualFS;

  constructor(fs: IVirtualFS) {
    this.fs = fs;
  }

  private async init(): Promise<void> {
    if (initialized) return;
    await esbuild.initialize({
      wasmURL: "https://esm.sh/esbuild-wasm@0.28.0/esbuild.wasm",
      worker: true,
    });
    initialized = true;
  }

  async build(
    config: BuildConfig,
    onProgress?: BuildProgressCallback,
  ): Promise<BuildResult> {
    const start = Date.now();
    await this.init();
    onProgress?.("init", 10);

    await clearDir(this.fs, config.outDir);

    const pkg = await readPackageJson(this.fs, "/");
    const versions = extractDependencyVersions(pkg);
    const framework = detectFramework(pkg);
    onProgress?.("resolve", 30);

    // Read path aliases from tsconfig / jsconfig / vite.config
    const tsconfigAliases = await readTsConfigPaths(this.fs, "/");
    const viteAliases = await readViteAliases(this.fs, "/");
    const aliases = [...tsconfigAliases, ...viteAliases];

    const plugins: esbuild.Plugin[] = [];
    if (aliases.length > 0) {
      plugins.push(aliasPlugin(aliases));
    }
    plugins.push(
      virtualFsPlugin(this.fs, {
        cssTransform: config.tailwindStrip ? stripTailwindDirectives : undefined,
      }),
    );
    if (config.npmResolution === "cdn") {
      const allowList = Object.keys(versions);
      plugins.push(npmCdnPlugin(config.cdnUrl, versions, allowList));
    }

    onProgress?.("bundle", 50);

    // For Angular projects we externalize ALL @angular/* — including subpaths
    // like @angular/common/http — plus rxjs + tslib (peers of @angular/core).
    // The app and the compiler facade then share a single Angular/rxjs
    // instance at runtime via an importmap in the preview HTML. Without this
    // we see NG0200 / NullInjectorError because two copies of @angular/core
    // (one bundled, one from esm.sh) load side by side and DI can't match.
    const angularExternals =
      framework === "angular" ? ["@angular/*", "rxjs", "rxjs/*", "tslib"] : [];

    let result: esbuild.BuildResult;
    try {
      const angularBootstrapEntry =
        framework === "angular"
          ? {
              contents: `import { CompilerFacadeImpl } from '@angular/compiler'\nconst globalWithNg = globalThis as typeof globalThis & { ng?: Record<string, unknown> }\nglobalWithNg.ng ??= {}\nglobalWithNg.ng['\\u0275compilerFacade'] ??= new CompilerFacadeImpl()\nimport ${JSON.stringify(config.entryPoint)}`,
              sourcefile: "/__vertex_angular_entry__.ts",
              resolveDir: "/",
              loader: "ts" as const,
            }
          : undefined;

      result = await esbuild.build({
        entryPoints: angularBootstrapEntry ? undefined : [config.entryPoint],
        stdin: angularBootstrapEntry,
        entryNames: "main",
        bundle: true,
        format: config.format,
        target:
          config.target === "browser"
            ? ["chrome110", "firefox110", "safari16"]
            : ["node18"],
        minify: config.minify,
        sourcemap: config.sourcemap ? "inline" : false,
        write: false,
        outdir: config.outDir,
        external: angularExternals,
        plugins,
        logLevel: "silent",
      });
    } catch (e: unknown) {
      const errors = (e as esbuild.BuildFailure).errors ?? [];
      return {
        success: false,
        files: [],
        errors: errors.map((err) => ({
          file: err.location?.file ?? "",
          line: err.location?.line ?? 0,
          column: err.location?.column ?? 0,
          message: err.text,
        })),
        warnings: [],
        duration: Date.now() - start,
        stats: { inputFiles: 0, outputSize: 0 },
      };
    }

    onProgress?.("write", 80);

    const outputFiles: BuildResult["files"] = [];
    for (const file of result.outputFiles ?? []) {
      const filename = file.path.split("/").pop() ?? "out.js";
      const outPath = `${config.outDir}/${filename}`;
      await this.fs.writeFile(outPath, file.text);
      outputFiles.push({
        path: outPath,
        content: file.text,
        size: file.text.length,
      });
    }

    onProgress?.("write", 100);

    return {
      success: result.errors.length === 0,
      files: outputFiles,
      errors: result.errors.map((e) => ({
        file: e.location?.file ?? "",
        line: e.location?.line ?? 0,
        column: e.location?.column ?? 0,
        message: e.text,
      })),
      warnings: result.warnings.map((w) => ({
        file: w.location?.file ?? "",
        line: w.location?.line ?? 0,
        column: w.location?.column ?? 0,
        message: w.text,
      })),
      duration: Date.now() - start,
      stats: {
        inputFiles: result.outputFiles?.length ?? 0,
        outputSize: outputFiles.reduce((sum, f) => sum + f.size, 0),
      },
    };
  }

  async transform(
    code: string,
    loader: "ts" | "tsx" | "js" | "jsx",
  ): Promise<string> {
    await this.init();
    const result = await esbuild.transform(code, { loader, minify: false });
    return result.code;
  }

  dispose(): void {
    if (initialized) {
      esbuild.stop();
      initialized = false;
    }
  }
}
