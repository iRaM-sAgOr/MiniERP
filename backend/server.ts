import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import erpRoutes from "./src/routes/erp.routes.js";
import { WorkLogService } from "./src/services/worklog.service.js";
import { initChatGateway } from "./src/realtime/chat.gateway.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, ".env") });

const app = express();
const PORT = Number(process.env.PORT ?? 8080);
const useViteMiddleware = process.env.NODE_ENV !== "production" && process.env.VITE_MIDDLEWARE !== "false";
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: true,
    credentials: true,
  },
});

initChatGateway(io);

app.use(express.json());

// API Routes
app.use("/api", erpRoutes);

// Synchronize task actualHours on startup boot
WorkLogService.recalculateAllTaskActualHours()
  .then(() => {
    console.log("Relational database state successfully synchronized on startup boot.");
  })
  .catch((err) => {
    console.warn("Startup database sync failed:", err);
  });

// Serve frontend assets or mount Vite dev middleware
const startServer = async () => {
  if (useViteMiddleware) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    app.get("/", (_req, res) => {
      res.status(200).send("MiniERP backend API is running. Frontend can be started with npm run dev --workspace=minierp-frontend.");
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`ERP Server booted successfully and running on port ${PORT}`);
  });
};

startServer();
