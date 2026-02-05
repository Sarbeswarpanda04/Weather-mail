import { Router } from "express";
import { upsertSubscriber, removeSubscriber } from "../services/subscriptionStore.js";
import { sendWelcomeEmail } from "../services/mailer.js";

const router = Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/subscribe", async (req, res, next) => {
    try {
        const { email, city } = req.body ?? {};

        if (!email || !EMAIL_PATTERN.test(email)) {
            res.status(400).json({ message: "Please provide a valid email." });
            return;
        }

        if (!city || typeof city !== "string" || !city.trim()) {
            res.status(400).json({ message: "Please provide a city to monitor." });
            return;
        }

        const { isNew, subscriber } = upsertSubscriber({ email, city });

        if (!isNew) {
            res.status(200).json({ message: "We updated your city. Expect tomorrow's forecast at 7 AM." });
            return;
        }

        try {
            await sendWelcomeEmail({
                recipient: subscriber.email,
                cityName: subscriber.city,
            });
        } catch (error) {
            removeSubscriber(subscriber.email);
            throw error;
        }

        res.status(201).json({ message: "You're in! Look for your first forecast tomorrow morning." });
    } catch (error) {
        next(error);
    }
});

export default router;
