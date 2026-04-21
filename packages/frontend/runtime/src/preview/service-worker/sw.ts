// Source for vertex-sw.js — compiled manually to apps/web/public/vertex-sw.js
// Do NOT import anything from @vertex/runtime here.
// This file runs in the Service Worker context, not in the main thread.

declare const self: ServiceWorkerGlobalScope;

const PREVIEW_PREFIX = "/vertex-preview";
const virtualFiles = new Map<string, string>();

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith(PREVIEW_PREFIX)) return;
  event.respondWith(handleRequest(url.pathname));
});

async function handleRequest(pathname: string): Promise<Response> {
  let path = pathname.slice(PREVIEW_PREFIX.length) || "/index.html";
  if (path === "") path = "/index.html";

  let content = virtualFiles.get(path);

  if (content === undefined && !path.includes(".")) {
    content = virtualFiles.get("/index.html");
    path = "/index.html";
  }

  if (content === undefined) {
    return new Response(`File not found: ${path}`, {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": getMimeType(path),
      "Cache-Control": "no-cache",
    },
  });
}

function getMimeType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const types: Record<string, string> = {
    html: "text/html; charset=utf-8",
    js: "application/javascript",
    mjs: "application/javascript",
    css: "text/css",
    json: "application/json",
    png: "image/png",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    woff2: "font/woff2",
  };
  return types[ext ?? ""] ?? "application/octet-stream";
}

self.addEventListener("message", (event) => {
  const msg = event.data as { type: string; [k: string]: unknown };
  if (!msg?.type) return;

  const reply = (response: { type: string; [k: string]: unknown }) => {
    if (event.ports[0]) {
      event.ports[0].postMessage(response);
      return;
    }
    event.source?.postMessage(response);
  };

  switch (msg.type) {
    case "MOUNT_FILES":
      for (const [path, content] of Object.entries(
        msg["files"] as Record<string, string>,
      )) {
        virtualFiles.set(path, content);
      }
      reply({ type: "READY" });
      break;

    case "UPDATE_FILE":
      virtualFiles.set(msg["path"] as string, msg["content"] as string);
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "FILE_UPDATED", path: msg["path"] });
        });
      });
      break;

    case "DELETE_FILE":
      virtualFiles.delete(msg["path"] as string);
      break;

    case "CLEAR":
      virtualFiles.clear();
      break;

    case "PING":
      reply({ type: "PONG" });
      break;
  }
});
