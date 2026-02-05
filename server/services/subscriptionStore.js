const subscribers = new Map();

const normalizeEmail = (email) => email.trim().toLowerCase();

const upsertSubscriber = ({ email, city }) => {
    const normalizedEmail = normalizeEmail(email);
    const existing = subscribers.get(normalizedEmail);

    const record = {
        email: normalizedEmail,
        city: city.trim(),
        subscribedAt: existing?.subscribedAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    subscribers.set(normalizedEmail, record);
    return { isNew: !existing, subscriber: record };
};

const removeSubscriber = (email) => {
    subscribers.delete(normalizeEmail(email));
};

const listSubscribers = () => Array.from(subscribers.values());

export { upsertSubscriber, removeSubscriber, listSubscribers };
