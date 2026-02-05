import Subscriber from "../models/Subscriber.js";
import { isDatabaseReady } from "../config/database.js";

const normalizeEmail = (email) => email.trim().toLowerCase();

const ensureDatabaseReady = () => {
    if (!isDatabaseReady()) {
        const error = new Error("Database connection is not available. Please try again shortly.");
        error.statusCode = 503;
        throw error;
    }
};

const upsertSubscriber = async ({ email, city }) => {
    ensureDatabaseReady();

    const normalizedEmail = normalizeEmail(email);
    const now = new Date();

    const existing = await Subscriber.findOne({ email: normalizedEmail });

    if (existing) {
        existing.city = city.trim();
        existing.updatedAt = now;
        const updated = await existing.save();
        return { isNew: false, subscriber: updated.toObject() };
    }

    const created = await Subscriber.create({
        email: normalizedEmail,
        city: city.trim(),
        subscribedAt: now,
        updatedAt: now,
    });

    return { isNew: true, subscriber: created.toObject() };
};

const removeSubscriber = async (email) => {
    ensureDatabaseReady();
    await Subscriber.deleteOne({ email: normalizeEmail(email) });
};

const listSubscribers = async ({ includePaused = true } = {}) => {
    ensureDatabaseReady();
    const query = includePaused ? {} : { paused: false };
    const docs = await Subscriber.find(query).sort({ subscribedAt: -1 }).lean();
    return docs;
};

const listSubscribersPage = async ({ includePaused = true, limit = 50, offset = 0 } = {}) => {
    ensureDatabaseReady();
    const query = includePaused ? {} : { paused: false };

    const [subscribers, total] = await Promise.all([
        Subscriber.find(query)
            .sort({ subscribedAt: -1 })
            .skip(offset)
            .limit(limit)
            .lean(),
        Subscriber.countDocuments(query),
    ]);

    return { subscribers, total };
};

const findSubscriberByEmail = async (email) => {
    ensureDatabaseReady();
    return Subscriber.findOne({ email: normalizeEmail(email) }).lean();
};

const setSubscriberPaused = async (email, { paused, pauseReason = "" }) => {
    ensureDatabaseReady();
    const update = {
        paused,
        pauseReason: paused ? pauseReason.trim() : "",
        updatedAt: new Date(),
    };
    return Subscriber.findOneAndUpdate(
        { email: normalizeEmail(email) },
        update,
        { new: true }
    ).lean();
};

const markWelcomeSent = async (email) => {
    ensureDatabaseReady();
    await Subscriber.updateOne(
        { email: normalizeEmail(email) },
        { welcomeSentAt: new Date(), updatedAt: new Date() }
    );
};

const markDailySent = async (email) => {
    ensureDatabaseReady();
    await Subscriber.updateOne(
        { email: normalizeEmail(email) },
        { lastSentAt: new Date(), updatedAt: new Date() }
    );
};

export {
    upsertSubscriber,
    removeSubscriber,
    listSubscribers,
    listSubscribersPage,
    ensureDatabaseReady,
    findSubscriberByEmail,
    setSubscriberPaused,
    markWelcomeSent,
    markDailySent,
};
