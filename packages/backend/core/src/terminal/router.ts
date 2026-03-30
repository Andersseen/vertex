import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ITerminalManager } from "./types";
import type {
  CreateTerminalOptions,
  TerminalResizeRequest,
  TerminalWriteRequest,
} from "./types";

export function createTerminalRouter(manager: ITerminalManager) {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: [
        "http://localhost:4200",
        "http://localhost:4201",
        "http://localhost:1420",
      ],
      allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    }),
  );

  // Health check
  app.get("/", (c) => {
    return c.json({
      service: "Vertex Terminal",
      version: "1.0.0",
      activeTerminals: manager.getAllSessions().length,
    });
  });

  // Get all terminals
  app.get("/terminals", (c) => {
    return c.json(manager.getAllSessions());
  });

  // Create terminal
  app.post("/terminals", async (c) => {
    try {
      const options: CreateTerminalOptions = await c.req.json();
      const session = manager.createTerminal(options);
      return c.json({ success: true, terminal: session });
    } catch (error) {
      console.error("[Terminal API] Error creating terminal:", error);
      return c.json(
        { success: false, error: "Failed to create terminal" },
        500,
      );
    }
  });

  // Write to terminal
  app.post("/terminals/write", async (c) => {
    try {
      const body: TerminalWriteRequest = await c.req.json();
      const success = manager.write(body.terminalId, body.data);

      if (!success) {
        return c.json({ success: false, error: "Terminal not found" }, 404);
      }

      return c.json({ success: true });
    } catch (error) {
      console.error("[Terminal API] Error writing to terminal:", error);
      return c.json({ success: false, error: "Failed to write" }, 500);
    }
  });

  // Resize terminal
  app.post("/terminals/resize", async (c) => {
    try {
      const body: TerminalResizeRequest = await c.req.json();
      const success = manager.resize(body.terminalId, body.cols, body.rows);

      if (!success) {
        return c.json({ success: false, error: "Terminal not found" }, 404);
      }

      return c.json({ success: true });
    } catch (error) {
      console.error("[Terminal API] Error resizing terminal:", error);
      return c.json({ success: false, error: "Failed to resize" }, 500);
    }
  });

  // Kill terminal
  app.delete("/terminals/:id", (c) => {
    const id = c.req.param("id");
    const success = manager.kill(id);

    if (!success) {
      return c.json({ success: false, error: "Terminal not found" }, 404);
    }

    return c.json({ success: true });
  });

  return app;
}
