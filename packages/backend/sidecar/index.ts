import { Hono } from "hono";
import { serve } from "@hono/node-server";

const app = new Hono();

app.get("/", (c) => {
  return c.json({
    message: "Vertex Sidecar API",
    version: "0.1.0",
    status: "running",
  });
});

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

const port = Number(process.env.PORT) || 3001;
console.log(`Vertex Sidecar iniciando en puerto ${port}`);

serve({
  fetch: app.fetch,
  port,
});
