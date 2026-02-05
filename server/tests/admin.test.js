import { test, mock } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import supertest from "supertest";
import { createAdminRouter } from "../routes/admin.js";

const buildAdminApp = (overrides = {}) => {
    const store = {
        listSubscribersPage: mock.fn(),
        setSubscriberPaused: mock.fn(),
        findSubscriberByEmail: mock.fn(),
    };

    const mailerService = {
        sendWelcomeEmail: mock.fn(),
    };

    const adminKey = overrides.adminKey ?? "test-admin-key-!@#2026";

    const app = express();
    app.use(express.json());
    app.use(createAdminRouter({ adminKey, store, mailerService }));
    app.use((error, req, res, next) => {
        res.status(error.statusCode ?? 500).json({ message: error.message ?? "Unexpected server error" });
    });

    return { app, store, mailerService, adminKey };
};

test("admin endpoints reject missing admin key", async () => {
    const { app } = buildAdminApp();

    const response = await supertest(app).get("/subscribers");

    assert.equal(response.status, 401);
    assert.equal(response.body.message, "Unauthorized");
});

test("admin list subscribers returns sanitized metadata", async () => {
    const { app, store, adminKey } = buildAdminApp();

    const now = new Date("2026-02-05T08:00:00.000Z");
    const welcomeSent = new Date("2026-02-05T08:05:00.000Z");

    store.listSubscribersPage.mock.mockImplementation(async () => ({
        subscribers: [
            {
                email: "user@example.com",
                city: "Berlin",
                subscribedAt: now,
                updatedAt: welcomeSent,
                paused: false,
                pauseReason: "",
                lastSentAt: null,
                welcomeSentAt: welcomeSent,
                _id: "should-not-leak",
            },
        ],
        total: 1,
    }));

    const response = await supertest(app)
        .get("/subscribers")
        .set("x-admin-key", adminKey);

    assert.equal(response.status, 200);
    assert.equal(response.body.total, 1);
    assert.equal(response.body.pagination.hasMore, false);
    assert.equal(store.listSubscribersPage.mock.callCount(), 1);

    const [subscriber] = response.body.data;
    assert.deepEqual(Object.keys(subscriber).sort(), [
        "city",
        "email",
        "lastSentAt",
        "pauseReason",
        "paused",
        "subscribedAt",
        "updatedAt",
        "welcomeSentAt",
    ]);
    assert.equal(subscriber.email, "user@example.com");
    assert.equal(subscriber.city, "Berlin");
    assert.equal(subscriber.paused, false);
    assert.equal(subscriber.pauseReason, "");
    assert.equal(subscriber.subscribedAt, now.toISOString());
    assert.equal(subscriber.updatedAt, welcomeSent.toISOString());
    assert.equal(subscriber.lastSentAt, null);
    assert.equal(subscriber.welcomeSentAt, welcomeSent.toISOString());
});

test("admin can pause and resume a subscriber", async () => {
    const { app, store, adminKey } = buildAdminApp();

    const pausedDoc = {
        email: "user@example.com",
        city: "Berlin",
        paused: true,
        pauseReason: "Vacation",
        subscribedAt: new Date("2025-12-31T23:00:00.000Z"),
        updatedAt: new Date("2026-02-05T07:00:00.000Z"),
    };

    const resumedDoc = { ...pausedDoc, paused: false, pauseReason: "", updatedAt: new Date("2026-02-05T09:00:00.000Z") };

    let pauseCall = 0;
    store.setSubscriberPaused.mock.mockImplementation(async () => {
        pauseCall += 1;
        return pauseCall === 1 ? pausedDoc : resumedDoc;
    });

    const pauseResponse = await supertest(app)
        .post("/subscribers/user@example.com/pause")
        .set("x-admin-key", adminKey)
        .send({ reason: "Vacation" });

    assert.equal(pauseResponse.status, 200);
    assert.equal(store.setSubscriberPaused.mock.callCount(), 1);
    assert.equal(pauseResponse.body.subscriber.paused, true);
    assert.equal(pauseResponse.body.subscriber.pauseReason, "Vacation");

    const resumeResponse = await supertest(app)
        .post("/subscribers/user@example.com/resume")
        .set("x-admin-key", adminKey);

    assert.equal(resumeResponse.status, 200);
    assert.equal(store.setSubscriberPaused.mock.callCount(), 2);
    assert.equal(resumeResponse.body.subscriber.paused, false);
    assert.equal(resumeResponse.body.subscriber.pauseReason, "");
});

test("admin can resend welcome email and receive refreshed metadata", async () => {
    const { app, store, mailerService, adminKey } = buildAdminApp();

    const initialDoc = {
        email: "user@example.com",
        city: "Berlin",
        paused: false,
        pauseReason: "",
        subscribedAt: new Date("2025-12-31T23:00:00.000Z"),
        updatedAt: new Date("2026-02-05T07:00:00.000Z"),
        welcomeSentAt: null,
    };

    const refreshedDoc = {
        ...initialDoc,
        updatedAt: new Date("2026-02-05T07:05:00.000Z"),
        welcomeSentAt: new Date("2026-02-05T07:05:00.000Z"),
    };

    let lookupCount = 0;
    store.findSubscriberByEmail.mock.mockImplementation(async () => {
        lookupCount += 1;
        return lookupCount === 1 ? initialDoc : refreshedDoc;
    });

    mailerService.sendWelcomeEmail.mock.mockImplementation(async () => ({}));

    const response = await supertest(app)
        .post("/subscribers/user@example.com/resend-welcome")
        .set("x-admin-key", adminKey);

    assert.equal(response.status, 200);
    assert.equal(store.findSubscriberByEmail.mock.callCount(), 2);
    assert.equal(mailerService.sendWelcomeEmail.mock.callCount(), 1);
    const payload = mailerService.sendWelcomeEmail.mock.calls[0].arguments[0];
    assert.equal(payload.recipient, "user@example.com");
    assert.equal(payload.cityName, "Berlin");
    assert.equal(response.body.subscriber.welcomeSentAt, refreshedDoc.welcomeSentAt.toISOString());
});

test("admin endpoints surface 503 when admin key missing", async () => {
    const app = express();
    app.use(createAdminRouter({ adminKey: undefined }));

    const response = await supertest(app).get("/subscribers");

    assert.equal(response.status, 503);
    assert.equal(response.body.message, "Admin API key is not configured.");
});
