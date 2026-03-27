import { Hono, type Context, type Next } from "hono";
import { cors } from "hono/cors";
import { readdir, readFile, writeFile, stat, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import {
  WorkspaceGuard,
  RateLimiter,
  validatePathParam,
  validateContentParam,
} from "./src/security";

// ==================== CONFIGURATION ====================

const PORT = Number(process.env.SIDECAR_PORT) || 3001;
const WORKSPACE_PATH = process.env.WORKSPACE_PATH || process.cwd();
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB
const RATE_LIMIT_REQ = Number(process.env.RATE_LIMIT_REQ) || 100;
const RATE_LIMIT_WINDOW = Number(process.env.RATE_LIMIT_WINDOW) || 60; // seconds
const CORS_ORIGIN =
  process.env.CORS_ORIGIN || "http://localhost:4200,http://localhost:1420";

// Parse allowed origins
const allowedOrigins = CORS_ORIGIN.split(",").map((o) => o.trim());

// Initialize security modules
const guard = new WorkspaceGuard(WORKSPACE_PATH, MAX_FILE_SIZE);
const rateLimiter = new RateLimiter(RATE_LIMIT_REQ, RATE_LIMIT_WINDOW * 1000);

console.log(`[Security] Workspace: ${guard.getAllowedBase()}`);
console.log(
  `[Security] Max file size: ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB`,
);
console.log(
  `[Security] Rate limit: ${RATE_LIMIT_REQ} req/${RATE_LIMIT_WINDOW}s`,
);
console.log(`[Security] Allowed origins: ${allowedOrigins.join(", ")}`);

// ==================== APP SETUP ====================

const app = new Hono();

// CORS with specific origins
app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return origin;
      }
      return null;
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Security headers middleware
app.use("*", async (c: Context, next: Next) => {
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "1; mode=block");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  await next();
});

// Rate limiting middleware
app.use("*", async (c: Context, next: Next) => {
  const identifier =
    c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";

  const result = rateLimiter.checkLimit(identifier);

  // Add rate limit headers
  c.header("X-RateLimit-Limit", RATE_LIMIT_REQ.toString());
  c.header("X-RateLimit-Remaining", result.remaining.toString());
  c.header("X-RateLimit-Reset", new Date(result.resetTime).toISOString());

  if (!result.allowed) {
    return c.json(
      {
        error: "Rate limit exceeded",
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      },
      429,
    );
  }

  await next();
});

// ==================== ROUTES ====================

app.get("/", (c) => {
  return c.json({
    message: "Vertex Sidecar API",
    version: "0.1.0",
    status: "running",
    engine: "bun",
    security: {
      workspace: guard.getAllowedBase(),
      maxFileSize: MAX_FILE_SIZE,
      rateLimit: `${RATE_LIMIT_REQ}/${RATE_LIMIT_WINDOW}s`,
    },
  });
});

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// --- Filesystem API ---

/**
 * List children of a directory (lazy loading)
 * GET /fs/children?path=/some/path
 */
app.get("/fs/children", async (c) => {
  const rawPath = c.req.query("path");

  // Validate input
  const validation = validatePathParam(rawPath);
  if (!validation.valid) {
    return c.json({ error: validation.error }, 400);
  }

  // Validate path is within workspace
  const safePath = guard.validatePath(rawPath!);
  if (!safePath) {
    return c.json({ error: "Access denied: path outside workspace" }, 403);
  }

  try {
    const stats = await stat(safePath);
    if (!stats.isDirectory()) {
      return c.json({ error: "Not a directory" }, 400);
    }

    const entries = await readdir(safePath, { withFileTypes: true });

    // Ignore common heavy folders and hidden files
    const ignoreList = [
      "node_modules",
      ".git",
      ".next",
      ".astro",
      "dist",
      "target",
      ".turbo",
    ];

    const result = await Promise.all(
      entries
        .filter(
          (entry) =>
            !entry.name.startsWith(".") && !ignoreList.includes(entry.name),
        )
        .map(async (entry) => {
          const fullPath = guard.validatePath(`${safePath}/${entry.name}`);
          if (!fullPath) return null;

          const isDirectory = entry.isDirectory();
          let entryStats;
          try {
            entryStats = await stat(fullPath);
          } catch {
            // Handle broken symlinks or permission issues
            return null;
          }

          return {
            id: fullPath,
            name: entry.name,
            path: fullPath,
            kind: isDirectory ? "directory" : "file",
            size: entryStats.size,
            modifiedAt: entryStats.mtime,
            language: isDirectory ? undefined : getLanguageFromExt(entry.name),
            hasChildren: isDirectory,
          };
        }),
    );

    return c.json(result.filter((item) => item !== null));
  } catch (error) {
    console.error(`[Error] Failed to list children: ${safePath}`, error);
    return c.json({ error: "Failed to read directory" }, 500);
  }
});

/**
 * Read file content
 * GET /fs/read?path=/some/path
 */
app.get("/fs/read", async (c) => {
  const rawPath = c.req.query("path");

  // Validate input
  const validation = validatePathParam(rawPath);
  if (!validation.valid) {
    return c.json({ error: validation.error }, 400);
  }

  // Validate path is within workspace
  const safePath = guard.validatePath(rawPath!);
  if (!safePath) {
    return c.json({ error: "Access denied: path outside workspace" }, 403);
  }

  // Check file extension
  if (!guard.isAllowedExtension(rawPath!)) {
    return c.json({ error: "File type not allowed" }, 403);
  }

  try {
    const stats = await stat(safePath);

    if (stats.isDirectory()) {
      return c.json({ error: "Path is a directory" }, 400);
    }

    if (stats.size > MAX_FILE_SIZE) {
      return c.json(
        {
          error: `File too large (${(stats.size / 1024 / 1024).toFixed(1)}MB > ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB)`,
        },
        413,
      );
    }

    const content = await readFile(safePath, "utf-8");
    return c.json({ content });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return c.json({ error: "File not found" }, 404);
    }
    console.error(`[Error] Failed to read file: ${safePath}`, error);
    return c.json({ error: "Failed to read file" }, 500);
  }
});

/**
 * Write file content
 * POST /fs/write
 * Body: { path: string, content: string }
 */
app.post("/fs/write", async (c) => {
  let body: { path?: string; content?: string };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { path: rawPath, content } = body;

  // Validate path
  const pathValidation = validatePathParam(rawPath);
  if (!pathValidation.valid) {
    return c.json({ error: pathValidation.error }, 400);
  }

  // Validate content
  const contentValidation = validateContentParam(content, MAX_FILE_SIZE);
  if (!contentValidation.valid) {
    return c.json({ error: contentValidation.error }, 400);
  }

  // Validate path is within workspace
  const safePath = guard.validatePath(rawPath!);
  if (!safePath) {
    return c.json({ error: "Access denied: path outside workspace" }, 403);
  }

  // Check if parent directory is within workspace
  const parentDir = dirname(safePath);
  const safeParent = guard.validatePath(parentDir);
  if (!safeParent) {
    return c.json(
      { error: "Access denied: parent directory outside workspace" },
      403,
    );
  }

  try {
    // Ensure parent directory exists
    await mkdir(safeParent, { recursive: true });

    await writeFile(safePath, content!, "utf-8");

    console.log(
      `[Write] ${safePath} (${Buffer.byteLength(content!, "utf-8")} bytes)`,
    );
    return c.json({ success: true, path: safePath });
  } catch (error) {
    console.error(`[Error] Failed to write file: ${safePath}`, error);
    return c.json({ error: "Failed to write file" }, 500);
  }
});

/**
 * Get workspace information
 * GET /fs/workspace
 */
app.get("/fs/workspace", (c) => {
  return c.json({
    path: guard.getAllowedBase(),
    maxFileSize: MAX_FILE_SIZE,
    rateLimit: {
      max: RATE_LIMIT_REQ,
      window: RATE_LIMIT_WINDOW,
    },
  });
});

// ==================== HELPERS ====================

function getLanguageFromExt(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  const map: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".mts": "typescript",
    ".cts": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".html": "html",
    ".htm": "html",
    ".css": "css",
    ".scss": "scss",
    ".sass": "scss",
    ".less": "less",
    ".json": "json",
    ".md": "markdown",
    ".mdx": "markdown",
    ".rs": "rust",
    ".py": "python",
    ".go": "go",
    ".java": "java",
    ".rb": "ruby",
    ".php": "php",
    ".c": "c",
    ".cpp": "cpp",
    ".h": "c",
    ".hpp": "cpp",
    ".cs": "csharp",
    ".swift": "swift",
    ".kt": "kotlin",
    ".scala": "scala",
    ".sh": "shell",
    ".bash": "shell",
    ".zsh": "shell",
    ".fish": "shell",
    ".ps1": "powershell",
    ".sql": "sql",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".xml": "xml",
    ".svg": "xml",
    ".vue": "vue",
    ".svelte": "svelte",
    ".astro": "astro",
  };
  return map[ext] || "text";
}

// ==================== STARTUP ====================

console.log(`🚀 Vertex Sidecar starting on port ${PORT}...`);

export default {
  port: PORT,
  fetch: app.fetch,
};
