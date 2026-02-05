import "dotenv/config";
import { app } from "./app.js";
import { scheduleDailyDigest } from "./services/scheduler.js";
import { connectDatabase, isDatabaseReady } from "./config/database.js";

const PORT = process.env.PORT || 4000;

const startServer = async () => {
    await connectDatabase();
    scheduleDailyDigest(isDatabaseReady);

    app.listen(PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`WeatherMail server running on port ${PORT}`);
    });
};

startServer().catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Failed to start server", error);
    process.exitCode = 1;
});
