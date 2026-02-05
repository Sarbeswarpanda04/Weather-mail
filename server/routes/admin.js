import { Router } from "express";
import { z } from "zod";
import * as subscriptionStore from "../services/subscriptionStore.js";
import * as mailer from "../services/mailer.js";

const formatIssues = (issues) =>
    issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
    }));

const sanitizeSubscriber = (doc) => {
    if (!doc) {
        return null;
    }

    return {
        email: doc.email,
        city: doc.city,
        subscribedAt: doc.subscribedAt ?? null,
        updatedAt: doc.updatedAt ?? null,
        paused: doc.paused ?? false,
        pauseReason: doc.pauseReason ?? "",
        lastSentAt: doc.lastSentAt ?? null,
        welcomeSentAt: doc.welcomeSentAt ?? null,
    };
};

const listQuerySchema = z.object({
    includePaused: z.coerce.boolean().optional().default(true),
    limit: z.coerce.number().int().min(1).max(200).optional().default(50),
    offset: z.coerce.number().int().min(0).optional().default(0),
});

const createAdminRouter = ({
    adminKey = process.env.ADMIN_API_KEY,
    store = subscriptionStore,
    mailerService = mailer,
} = {}) => {
    const router = Router();

    router.use((req, res, next) => {
        if (!adminKey) {
            res.status(503).json({ message: "Admin API key is not configured." });
            return;
        }

        if (req.get("x-admin-key") !== adminKey) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        next();
    });

    router.get("/subscribers", async (req, res, next) => {
        try {
            const parsed = listQuerySchema.safeParse(req.query);
            if (!parsed.success) {
                res.status(400).json({
                    message: "Invalid query parameters.",
                    issues: formatIssues(parsed.error.issues),
                });
                return;
            }

            const { includePaused, limit, offset } = parsed.data;
            const { subscribers, total } = await store.listSubscribersPage({ includePaused, limit, offset });

            res.json({
                data: subscribers.map(sanitizeSubscriber),
                total,
                pagination: {
                    limit,
                    offset,
                    hasMore: offset + subscribers.length < total,
                },
            });
        } catch (error) {
            next(error);
        }
    });

    const emailSchema = z.string().trim().email();

    const pauseBodySchema = z
        .object({
            reason: z
                .string({ invalid_type_error: "Pause reason must be a string." })
                .trim()
                .min(1, { message: "Provide a pause reason." })
                .max(200, { message: "Pause reason is too long." })
                .optional(),
        })
        .default({});

    router.post("/subscribers/:email/pause", async (req, res, next) => {
        try {
            const emailResult = emailSchema.safeParse(req.params.email ?? "");
            if (!emailResult.success) {
                res.status(400).json({
                    message: "Invalid email provided.",
                    issues: formatIssues(emailResult.error.issues),
                });
                return;
            }

            const bodyResult = pauseBodySchema.safeParse(req.body ?? {});
            if (!bodyResult.success) {
                res.status(400).json({
                    message: "Invalid pause payload.",
                    issues: formatIssues(bodyResult.error.issues),
                });
                return;
            }

            const updated = await store.setSubscriberPaused(emailResult.data, {
                paused: true,
                pauseReason: bodyResult.data.reason ?? "Paused by admin",
            });

            if (!updated) {
                res.status(404).json({ message: "Subscriber not found." });
                return;
            }

            res.json({ message: "Subscriber paused.", subscriber: sanitizeSubscriber(updated) });
        } catch (error) {
            next(error);
        }
    });

    router.post("/subscribers/:email/resume", async (req, res, next) => {
        try {
            const emailResult = emailSchema.safeParse(req.params.email ?? "");
            if (!emailResult.success) {
                res.status(400).json({
                    message: "Invalid email provided.",
                    issues: formatIssues(emailResult.error.issues),
                });
                return;
            }

            const updated = await store.setSubscriberPaused(emailResult.data, {
                paused: false,
                pauseReason: "",
            });

            if (!updated) {
                res.status(404).json({ message: "Subscriber not found." });
                return;
            }

            res.json({ message: "Subscriber resumed.", subscriber: sanitizeSubscriber(updated) });
        } catch (error) {
            next(error);
        }
    });

    router.post("/subscribers/:email/resend-welcome", async (req, res, next) => {
        try {
            const emailResult = emailSchema.safeParse(req.params.email ?? "");
            if (!emailResult.success) {
                res.status(400).json({
                    message: "Invalid email provided.",
                    issues: formatIssues(emailResult.error.issues),
                });
                return;
            }

            const subscriber = await store.findSubscriberByEmail(emailResult.data);
            if (!subscriber) {
                res.status(404).json({ message: "Subscriber not found." });
                return;
            }

            await mailerService.sendWelcomeEmail({
                recipient: subscriber.email,
                cityName: subscriber.city,
            });

            const refreshed = await store.findSubscriberByEmail(emailResult.data);

            res.json({
                message: "Welcome email re-sent.",
                subscriber: sanitizeSubscriber(refreshed ?? subscriber),
            });
        } catch (error) {
            next(error);
        }
    });

    return router;
};

const adminRouter = createAdminRouter();

export default adminRouter;
export { createAdminRouter, sanitizeSubscriber };
