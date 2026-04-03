#!/usr/bin/env bun
/**
 * Bun HTTP Server for Web Editor Demo
 * Serves static files from the package directory
 */

const DEFAULT_PORT = 3456;
const ROOT_DIR = import.meta.dir;

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".ts": "application/typescript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
  ".map": "application/json",
};

function getMimeType(path: string): string {
  const ext = "." + path.split(".").pop()?.toLowerCase() || "";
  return MIME_TYPES[ext] || "application/octet-stream";
}

function logRequest(
  method: string,
  path: string,
  status: number,
  duration: number,
) {
  const timestamp = new Date().toLocaleTimeString();
  const color =
    status >= 200 && status < 300
      ? "\x1b[32m"
      : status >= 400
        ? "\x1b[31m"
        : "\x1b[33m";
  const reset = "\x1b[0m";
  console.log(
    `${timestamp} ${method.padEnd(6)} ${color}${status}${reset} ${duration.toFixed(2)}ms ${path}`,
  );
}

async function tryPort(port: number): Promise<boolean> {
  try {
    const testServer = Bun.serve({
      port,
      fetch: () => new Response("test"),
    });
    await testServer.stop();
    return true;
  } catch {
    return false;
  }
}

async function findAvailablePort(
  startPort: number,
  maxAttempts = 10,
): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await tryPort(port)) {
      return port;
    }
  }
  throw new Error(
    `No available ports found between ${startPort} and ${startPort + maxAttempts - 1}`,
  );
}

async function startServer() {
  const port = await findAvailablePort(DEFAULT_PORT);

  const server = Bun.serve({
    port: port,
    async fetch(request) {
      const start = performance.now();
      const url = new URL(request.url);
      let pathname = url.pathname;

      // Default to demo/index.html
      if (pathname === "/") {
        pathname = "/demo/index.html";
      }

      // Handle directory paths (e.g., /demo/ -> /demo/index.html)
      if (pathname.endsWith("/")) {
        pathname += "index.html";
      }

      // Security: prevent directory traversal
      if (pathname.includes("..")) {
        const duration = performance.now() - start;
        logRequest(request.method, pathname, 403, duration);
        return new Response("Forbidden", { status: 403 });
      }

      const filePath = ROOT_DIR + pathname;

      try {
        const file = Bun.file(filePath);
        const exists = await file.exists();

        if (!exists) {
          const duration = performance.now() - start;
          logRequest(request.method, pathname, 404, duration);
          return new Response("Not Found", { status: 404 });
        }

        const duration = performance.now() - start;
        logRequest(request.method, pathname, 200, duration);

        return new Response(file, {
          headers: {
            "Content-Type": getMimeType(pathname),
            "Cache-Control": pathname.includes("dist/")
              ? "public, max-age=3600"
              : "no-cache",
          },
        });
      } catch (error) {
        const duration = performance.now() - start;
        logRequest(request.method, pathname, 500, duration);
        console.error("Error serving file:", error);
        return new Response("Internal Server Error", { status: 500 });
      }
    },
  });

  console.log(`
🚀 Web Editor Server running!

📁 Local:   http://localhost:${port}/
📝 Demo:    http://localhost:${port}/demo/

Press Ctrl+C to stop
`);
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
