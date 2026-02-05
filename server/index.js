import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import emailRouter from "./routes/email.js";
import subscriptionRouter from "./routes/subscriptions.js";
import cityRouter from "./routes/cities.js";
import { scheduleDailyDigest } from "./services/scheduler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    "/",
    express.static(path.join(__dirname, "..", "public"), {
        index: "index.html",
    })
);

app.use("/api/email", emailRouter);
app.use("/api", subscriptionRouter);
app.use("/api", cityRouter);

app.use((req, res) => {
    res.status(404).json({ message: "Not found" });
});

app.use((error, req, res, next) => {
    // eslint-disable-next-line no-console
    console.error("Server error", error);
    res.status(500).json({ message: "Unexpected server error" });
});

scheduleDailyDigest();

app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`WeatherMail server running on port ${PORT}`);
});
