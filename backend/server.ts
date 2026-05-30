import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import erpRoutes from "./src/routes/erp.routes.js";
import { WorkLogService } from "./src/services/worklog.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

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
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ERP Server booted successfully and running on port ${PORT}`);
  });
};

startServer();
