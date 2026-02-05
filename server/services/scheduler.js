import cron from "node-cron";
import { listSubscribers, markDailySent } from "./subscriptionStore.js";
import { sendDailyWeatherEmail } from "./mailer.js";
import { fetchWeatherForCity } from "./weatherService.js";

const DEFAULT_CRON_EXPRESSION = "0 7 * * *"; // 7:00 AM local server time

const scheduleDailyDigest = (isDatabaseReady) => {
    const cronExpression = process.env.DAILY_DIGEST_CRON ?? DEFAULT_CRON_EXPRESSION;
    const cronOptions = {};

    if (process.env.CRON_TZ) {
        cronOptions.timezone = process.env.CRON_TZ;
    }

    cron.schedule(cronExpression, async () => {
        if (typeof isDatabaseReady === "function" && !isDatabaseReady()) {
            // eslint-disable-next-line no-console
            console.warn("[scheduler] Database unavailable. Skipping daily digest run.");
            return;
        }

        let subscribers = [];
        try {
            subscribers = await listSubscribers({ includePaused: false });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error("[scheduler] Unable to fetch subscribers:", error.message);
            return;
        }

        if (subscribers.length === 0) {
            return;
        }

        // eslint-disable-next-line no-console
        console.log(`Sending daily weather email to ${subscribers.length} subscriber(s).`);

        await Promise.allSettled(
            subscribers.map(async ({ email, city }) => {
                try {
                    const weatherData = await fetchWeatherForCity(city);
                    await sendDailyWeatherEmail({
                        recipient: email,
                        weatherData,
                    });
                    await markDailySent(email);
                } catch (error) {
                    // eslint-disable-next-line no-console
                    console.error(`Failed to send daily email to ${email}:`, error.message);
                }
            })
        );
    }, cronOptions);
};

export { scheduleDailyDigest };
