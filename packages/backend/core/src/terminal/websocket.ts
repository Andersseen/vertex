import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ITerminalManager, TerminalMessage } from "./types";

export interface WebSocketMessage {
  type: "create" | "write" | "resize" | "kill" | "list";
  config?: { cwd?: string; shell?: string; cols?: number; rows?: number };
  terminalId?: string;
  data?: string;
  cols?: number;
  rows?: number;
}

export function createWebSocketHandler(manager: ITerminalManager) {
  const clients = new Set<{ send: (data: string) => void }>();

  // Subscribe to terminal messages
  const unsubscribe = manager.onMessage((message: TerminalMessage) => {
    const data = JSON.stringify(message);
    clients.forEach((client) => {
      try {
        client.send(data);
      } catch (error) {
        console.error("[WebSocket] Error sending message:", error);
      }
    });
  });

  return {
    handleMessage(
      ws: { send: (data: string) => void },
      message: WebSocketMessage,
    ): void {
      try {
        switch (message.type) {
          case "create": {
            try {
              const terminal = manager.createTerminal(message.config || {});
              ws.send(
                JSON.stringify({
                  type: "created",
                  terminalId: terminal.id,
                  terminal,
                }),
              );
            } catch (error) {
              console.error("[WebSocket] Failed to create terminal:", error);
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
          }

          case "write": {
            if (message.terminalId && message.data !== undefined) {
              manager.write(message.terminalId, message.data);
            }
            break;
          }

          case "resize": {
            if (message.terminalId && message.cols && message.rows) {
              manager.resize(message.terminalId, message.cols, message.rows);
            }
            break;
          }

          case "kill": {
            if (message.terminalId) {
              manager.kill(message.terminalId);
            }
            break;
          }

          case "list": {
            ws.send(
              JSON.stringify({
                type: "list",
                terminals: manager.getAllSessions(),
              }),
            );
            break;
          }

          default:
            console.warn("[WebSocket] Unknown message type:", message.type);
        }
      } catch (error) {
        console.error("[WebSocket] Error handling message:", error);
        ws.send(
          JSON.stringify({
            type: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          }),
        );
      }
    },

    addClient(ws: { send: (data: string) => void }): void {
      clients.add(ws);
    },

    removeClient(ws: { send: (data: string) => void }): void {
      clients.delete(ws);
    },

    dispose(): void {
      unsubscribe();
      clients.clear();
    },
  };
}
