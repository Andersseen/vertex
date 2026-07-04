/**
 * Vertex Terminal Sidecar - Node.js Version
 * Pure Node.js + node-pty for maximum compatibility
 */

import { createServer } from "http";
import { WebSocketServer } from "ws";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { TerminalManager } from "./terminal-manager.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================
// CONFIGURATION
// ============================================
const BASE_PORT = Number(process.env.TERMINAL_PORT) || 3002;
const WORKSPACE_PATH = process.env.WORKSPACE_PATH || process.cwd();
const ALLOWED_ORIGINS = (
  process.env.TERMINAL_CORS_ORIGIN ||
  "http://localhost:4200,http://localhost:4201,http://localhost:5173,http://localhost:1420,tauri://localhost"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

/**
 * A missing Origin header means a non-browser client (curl, a native app).
 * Browsers ALWAYS send Origin on cross-origin fetch/WebSocket connections and
 * page JS cannot forge it, so a drive-by web page can never reach us with an
 * absent or spoofed Origin. Only same-machine tooling can — and that already
 * has full shell access anyway. So allow-missing is safe and matches the FS
 * sidecar's CORS behaviour.
 */
function isAllowedOrigin(origin) {
  if (!origin) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

console.log("╔════════════════════════════════════════╗");
console.log("║  Vertex Terminal Sidecar (Node.js)     ║");
console.log("╚════════════════════════════════════════╝");
console.log(`📁 Workspace: ${WORKSPACE_PATH}`);
console.log(`🌐 Base Port: ${BASE_PORT}`);
console.log(`🟢 Node.js: ${process.version}\n`);

// ============================================
// SETUP MANAGER
// ============================================
const terminalManager = new TerminalManager(WORKSPACE_PATH);

// ============================================
// HTTP API (Hono)
// ============================================
const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => (isAllowedOrigin(origin) ? origin : null),
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Origin enforcement. CORS only blocks reading a cross-origin *response* — it
// does NOT stop the side effects of a "simple" request (a text/plain POST skips
// the preflight and still runs server-side). Since a single POST here can spawn
// a shell, we must reject a disallowed Origin outright rather than trust CORS.
app.use("*", async (c, next) => {
  const origin = c.req.header("origin");
  if (!isAllowedOrigin(origin)) {
    console.warn(`[Security] Rejected HTTP request from origin: ${origin}`);
    return c.json({ error: "Origin not allowed" }, 403);
  }
  await next();
});

// Health check
app.get("/", (c) => {
  return c.json({
    service: "Vertex Terminal",
    version: "1.0.0",
    runtime: "Node.js",
    activeTerminals: terminalManager.getAllSessions().length,
  });
});

// Get all terminals
app.get("/terminals", (c) => {
  return c.json(terminalManager.getAllSessions());
});

// Create terminal
app.post("/terminals", async (c) => {
  try {
    const options = await c.req.json();
    const session = terminalManager.createTerminal(options);
    return c.json({ success: true, terminal: session });
  } catch (error) {
    console.error("[API] Error creating terminal:", error);
    return c.json({ success: false, error: "Failed to create terminal" }, 500);
  }
});

// Write to terminal
app.post("/terminals/write", async (c) => {
  try {
    const body = await c.req.json();
    const success = terminalManager.write(body.terminalId, body.data);
    return success
      ? c.json({ success: true })
      : c.json({ success: false, error: "Terminal not found" }, 404);
  } catch (error) {
    console.error("[API] Error writing to terminal:", error);
    return c.json({ success: false, error: "Failed to write" }, 500);
  }
});

// Resize terminal
app.post("/terminals/resize", async (c) => {
  try {
    const body = await c.req.json();
    const success = terminalManager.resize(
      body.terminalId,
      body.cols,
      body.rows,
    );
    return success
      ? c.json({ success: true })
      : c.json({ success: false, error: "Terminal not found" }, 404);
  } catch (error) {
    console.error("[API] Error resizing terminal:", error);
    return c.json({ success: false, error: "Failed to resize" }, 500);
  }
});

// Kill terminal
app.delete("/terminals/:id", (c) => {
  const id = c.req.param("id");
  const success = terminalManager.kill(id);
  return success
    ? c.json({ success: true })
    : c.json({ success: false, error: "Terminal not found" }, 404);
});

// ============================================
// SERVER SETUP WITH PORT DISCOVERY
// ============================================

async function findAvailablePort(startPort, maxAttempts = 10) {
  const net = await import("net");

  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const isAvailable = await new Promise((resolve) => {
      const tester = net
        .createServer()
        .once("error", () => resolve(false))
        .once("listening", () => {
          tester.close();
          resolve(true);
        })
        .listen(port);
    });

    if (isAvailable) {
      return port;
    }
  }

  throw new Error(
    `No available ports found between ${startPort} and ${startPort + maxAttempts - 1}`,
  );
}

async function startServer() {
  try {
    const port = await findAvailablePort(BASE_PORT);

    const server = createServer(async (req, res) => {
      // Convert Node.js request to Fetch API Request
      const url = `http://${req.headers.host}${req.url}`;
      const headers = new Headers();

      Object.entries(req.headers).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach((v) => headers.append(key, v));
          } else {
            headers.set(key, value);
          }
        }
      });

      let body = null;
      if (req.method !== "GET" && req.method !== "HEAD") {
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        body = Buffer.concat(chunks);
      }

      const request = new Request(url, {
        method: req.method,
        headers: headers,
        body: body,
      });

      // Handle Hono requests
      const response = await app.fetch(request);

      // Convert Hono response to Node.js response
      res.statusCode = response.status;
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      const responseBody = await response.text();
      res.end(responseBody);
    });

    const wss = new WebSocketServer({
      server,
      path: "/ws",
      // WebSocket upgrades bypass CORS entirely, so a random page you visit
      // could otherwise open ws://localhost:<port>/ws and drive a shell on your
      // machine. Reject any connection whose Origin is not explicitly allowed.
      verifyClient: ({ origin }, done) => {
        if (isAllowedOrigin(origin)) {
          done(true);
        } else {
          console.warn(`[Security] Rejected WebSocket from origin: ${origin}`);
          done(false, 403, "Origin not allowed");
        }
      },
    });

    // WebSocket connections
    wss.on("connection", (ws) => {
      console.log("[WebSocket] Client connected");

      // Subscribe to terminal messages
      const unsubscribe = terminalManager.onMessage((message) => {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify(message));
        }
      });

      // Send connection confirmation
      ws.send(
        JSON.stringify({
          type: "connected",
          message: "Connected to Vertex Terminal (Node.js)",
        }),
      );

      // Handle messages from client
      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log("[WebSocket] Received:", data.type);

          switch (data.type) {
            case "create":
              try {
                const terminal = terminalManager.createTerminal(
                  data.config || {},
                );
                ws.send(
                  JSON.stringify({
                    type: "created",
                    terminalId: terminal.id,
                    terminal,
                  }),
                );
              } catch (error) {
                ws.send(
                  JSON.stringify({
                    type: "error",
                    error:
                      error instanceof Error
                        ? error.message
                        : "Failed to create terminal",
                  }),
                );
              }
              break;

            case "write":
              if (data.terminalId && data.data !== undefined) {
                terminalManager.write(data.terminalId, data.data);
              }
              break;

            case "resize":
              if (data.terminalId && data.cols && data.rows) {
                terminalManager.resize(data.terminalId, data.cols, data.rows);
              }
              break;

            case "kill":
              if (data.terminalId) {
                terminalManager.kill(data.terminalId);
              }
              break;

            case "list":
              ws.send(
                JSON.stringify({
                  type: "list",
                  terminals: terminalManager.getAllSessions(),
                }),
              );
              break;

            default:
              console.warn("[WebSocket] Unknown message type:", data.type);
          }
        } catch (error) {
          console.error("[WebSocket] Error handling message:", error);
          ws.send(
            JSON.stringify({
              type: "error",
              error: "Invalid message format",
            }),
          );
        }
      });

      ws.on("close", () => {
        console.log("[WebSocket] Client disconnected");
        unsubscribe();
      });

      ws.on("error", (error) => {
        console.error("[WebSocket] Error:", error);
      });
    });

    server.listen(port, () => {
      console.log(`✅ Terminal sidecar running on port ${port}`);
      console.log(`🚀 WebSocket endpoint: ws://localhost:${port}/ws`);
      console.log(`🌐 HTTP API: http://localhost:${port}\n`);

      // Update environment variable
      process.env.TERMINAL_PORT = port.toString();

      // Write port to file for other processes
      try {
        const portFile = path.join(__dirname, ".terminal-port");
        fs.writeFileSync(portFile, port.toString());
      } catch (e) {
        // Ignore file write errors
      }
    });

    // Graceful shutdown
    process.on("SIGINT", () => {
      console.log("\n🛑 Shutting down terminal sidecar...");
      terminalManager.dispose();
      wss.close();
      server.close();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      console.log("\n🛑 Shutting down terminal sidecar...");
      terminalManager.dispose();
      wss.close();
      server.close();
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

// Start the server
startServer();
