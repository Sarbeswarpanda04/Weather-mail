import cron from "node-cron";
import { listSubscribers } from "./subscriptionStore.js";
import { sendDailyWeatherEmail } from "./mailer.js";
import { fetchWeatherForCity } from "./weatherService.js";

const DEFAULT_CRON_EXPRESSION = "0 7 * * *"; // 7:00 AM local server time

const scheduleDailyDigest = () => {
    const cronExpression = process.env.DAILY_DIGEST_CRON ?? DEFAULT_CRON_EXPRESSION;
    const cronOptions = {};

    if (process.env.CRON_TZ) {
        cronOptions.timezone = process.env.CRON_TZ;
    }

    cron.schedule(cronExpression, async () => {
        const subscribers = listSubscribers();
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
                } catch (error) {
                    // eslint-disable-next-line no-console
                    console.error(`Failed to send daily email to ${email}:`, error.message);
                }
            })
        );
    }, cronOptions);
};

export { scheduleDailyDigest };
