import { Router } from "express";
import { z } from "zod";
import * as subscriptionStore from "../services/subscriptionStore.js";
import * as mailer from "../services/mailer.js";

const subscribeSchema = z.object({
    email: z.string().trim().email({ message: "Please provide a valid email." }),
    city: z
        .string({ invalid_type_error: "Please provide a city to monitor." })
        .trim()
        .min(1, { message: "Please provide a city to monitor." })
        .max(120, { message: "City name is too long." }),
});

const createSubscriptionRouter = ({ store = subscriptionStore, mailerService = mailer } = {}) => {
    const router = Router();

    router.post("/subscribe", async (req, res, next) => {
        try {
            const parsed = subscribeSchema.safeParse(req.body ?? {});

            if (!parsed.success) {
                const [firstIssue] = parsed.error.issues;
                res.status(400).json({
                    message: firstIssue?.message ?? "Invalid subscription payload.",
                    issues: parsed.error.issues.map((issue) => ({
                        path: issue.path.join("."),
                        message: issue.message,
                    })),
                });
                return;
            }

            const { email, city } = parsed.data;

            const { isNew, subscriber } = await store.upsertSubscriber({ email, city });

            if (!isNew) {
                res.status(200).json({ message: "We updated your city. Expect tomorrow's forecast at 7 AM." });
                return;
            }

            try {
                await mailerService.sendWelcomeEmail({
                    recipient: subscriber.email,
                    cityName: subscriber.city,
                });
            } catch (error) {
                await store.removeSubscriber(subscriber.email);
                throw error;
            }

            res.status(201).json({ message: "You're in! Look for your first forecast tomorrow morning." });
        } catch (error) {
            next(error);
        }
    });

    return router;
};

const router = createSubscriptionRouter();

export default router;
export { createSubscriptionRouter };
