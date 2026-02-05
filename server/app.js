import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import emailRouter from "./routes/email.js";
import subscriptionRouter from "./routes/subscriptions.js";
import cityRouter from "./routes/cities.js";
import { createAdminRouter } from "./routes/admin.js";
import { isDatabaseReady } from "./config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    "/",
    express.static(path.join(__dirname, "..", "public"), {
        index: "index.html",
    })
);

app.get("/api/health", (req, res) => {
    const databaseStatus = isDatabaseReady() ? "connected" : "disconnected";
    res.json({
        status: databaseStatus === "connected" ? "ok" : "degraded",
        database: databaseStatus,
        uptimeSeconds: process.uptime(),
        timestamp: new Date().toISOString(),
        version: process.env.GIT_SHA ?? "dev",
    });
});

app.use("/api/email", emailRouter);
app.use("/api", subscriptionRouter);
app.use("/api", cityRouter);
app.use("/api/admin", createAdminRouter());

app.use((req, res) => {
    res.status(404).json({ message: "Not found" });
});

app.use((error, req, res, next) => {
    // eslint-disable-next-line no-console
    console.error("Server error", error);
    const status = error.statusCode ?? 500;
    const message = error.message ?? "Unexpected server error";
    res.status(status).json({ message });
});

export { app };
