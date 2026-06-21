import "./loadEnv";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import app from "./app";
import { logger } from "./lib/logger";
import { registerGameSocket } from "./socket/gameSocket";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);

const io = new SocketServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

registerGameSocket(io);

// Expose io to route handlers via app.locals
app.locals["io"] = io;

httpServer.listen(port, () => {
  logger.info({ port }, "Server listening");
});
