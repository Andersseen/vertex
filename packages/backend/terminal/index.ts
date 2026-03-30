#!/usr/bin/env bun
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { TerminalManager } from "../core/src/terminal/manager";
import { FallbackTerminalManager } from "../core/src/terminal/fallback-manager";
import { createTerminalRouter } from "../core/src/terminal/router";
import { createWebSocketHandler } from "../core/src/terminal/websocket";

const PORT = Number(process.env.TERMINAL_PORT) || 3002;
const WORKSPACE_PATH = process.env.WORKSPACE_PATH || process.cwd();

console.log("╔════════════════════════════════════════╗");
console.log("║     Vertex Terminal Sidecar            ║");
console.log("╚════════════════════════════════════════╝");
console.log(`📁 Workspace: ${WORKSPACE_PATH}`);
console.log(`🌐 Port: ${PORT}\n`);

// Try node-pty first, fall back to child_process if it fails
let terminalManager: TerminalManager | FallbackTerminalManager;
let usingFallback = false;

try {
  // Test if node-pty works
  const { spawn: testSpawn } = await import("node-pty");
  const testTerm = testSpawn("echo", ["test"], {
    name: "xterm-color",
    cols: 80,
    rows: 24,
    cwd: WORKSPACE_PATH,
  });

  await new Promise((resolve, reject) => {
    testTerm.onExit(() => resolve(undefined));
    setTimeout(() => reject(new Error("Timeout")), 1000);
  });

  console.log("✅ node-pty is working, using full terminal support");
  terminalManager = new TerminalManager(WORKSPACE_PATH);
} catch (error) {
  console.warn("⚠️  node-pty failed, using fallback mode");
  console.warn(`   Error: ${error instanceof Error ? error.message : error}`);
  terminalManager = new FallbackTerminalManager(WORKSPACE_PATH);
  usingFallback = true;
}

const terminalRouter = createTerminalRouter(terminalManager);
const wsHandler = createWebSocketHandler(terminalManager);

const app = new Hono();
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: [
      "http://localhost:4200",
      "http://localhost:4201",
      "http://localhost:1420",
    ],
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.route("/", terminalRouter);

const server = Bun.serve({
  port: PORT,
  fetch(req, server) {
    if (new URL(req.url).pathname === "/ws") {
      if (server.upgrade(req)) return undefined;
    }
    return app.fetch(req, server);
  },
  websocket: {
    open(ws: any) {
      console.log("[WebSocket] Client connected");
      wsHandler.addClient({ send: (data: string) => ws.send(data) });
      ws.send(
        JSON.stringify({
          type: "connected",
          message: usingFallback
            ? "Connected to Vertex Terminal (Fallback Mode)"
            : "Connected to Vertex Terminal",
        }),
      );
    },
    message(ws: any, message: string | Buffer) {
      try {
        const data = JSON.parse(message.toString());
        wsHandler.handleMessage({ send: (d: string) => ws.send(d) }, data);
      } catch (error) {
        ws.send(
          JSON.stringify({ type: "error", error: "Invalid message format" }),
        );
      }
    },
    close(ws: any) {
      console.log("[WebSocket] Client disconnected");
      wsHandler.removeClient({ send: () => {} });
    },
  },
});

console.log(
  `✅ Terminal sidecar on port ${PORT}${usingFallback ? " (Fallback Mode)" : ""}`,
);

process.on("SIGINT", () => {
  terminalManager.dispose();
  wsHandler.dispose();
  server.stop();
  process.exit(0);
});
