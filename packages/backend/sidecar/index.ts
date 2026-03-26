import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";

const app = new Hono();

// Enable CORS for frontend access
app.use("*", cors());

app.get("/", (c) => {
  return c.json({
    message: "Vertex Sidecar API",
    version: "0.1.0",
    status: "running",
    engine: "bun",
  });
});

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- Filesystem API ---

/**
 * List files in a directory
 * GET /fs/list?path=/some/path
 */
app.get("/fs/list", async (c) => {
  const path = c.req.query("path") || process.cwd();
  try {
    const entries = await readdir(path, { withFileTypes: true });
    const result = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(path, entry.name);
        const isDirectory = entry.isDirectory();
        const stats = await stat(fullPath);

        return {
          id: Buffer.from(fullPath).toString("base64"),
          name: entry.name,
          path: fullPath,
          kind: isDirectory ? "directory" : "file",
          size: stats.size,
          modifiedAt: stats.mtime,
          language: isDirectory ? undefined : getLanguageFromExt(entry.name),
        };
      })
    );
    return c.json(result);
  } catch (error) {
    const e = error as Error;
    return c.json({ error: e.message }, 500);
  }
});

/**
 * Read file content
 * GET /fs/read?path=/some/path
 */
app.get("/fs/read", async (c) => {
  const path = c.req.query("path");
  if (!path) return c.json({ error: "Path is required" }, 400);

  try {
    const content = await readFile(path, "utf-8");
    return c.json({ content });
  } catch (error) {
    const e = error as Error;
    return c.json({ error: e.message }, 500);
  }
});

/**
 * Write file content
 * POST /fs/write
 * Body: { path: string, content: string }
 */
app.post("/fs/write", async (c) => {
  const body = await c.req.json();
  const { path, content } = body;

  if (!path || content === undefined) {
    return c.json({ error: "Path and content are required" }, 400);
  }

  try {
    await writeFile(path, content, "utf-8");
    return c.json({ success: true });
  } catch (error) {
    const e = error as Error;
    return c.json({ error: e.message }, 500);
  }
});

function getLanguageFromExt(filename: string): string {
  const ext = extname(filename).toLowerCase();
  const map: Record<string, string> = {
    ".ts": "typescript",
    ".js": "javascript",
    ".html": "html",
    ".css": "css",
    ".scss": "scss",
    ".json": "json",
    ".md": "markdown",
    ".rs": "rust",
    ".py": "python",
    ".go": "go",
  };
  return map[ext] || "text";
}

const port = Number(process.env.PORT) || 3001;
console.log(`Vertex Sidecar iniciando en puerto ${port}`);

serve({
  fetch: app.fetch,
  port,
});
