import { test, mock } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";
import express from "express";
import { createSubscriptionRouter } from "../routes/subscriptions.js";

const buildTestApp = () => {
    const store = {
        upsertSubscriber: mock.fn(),
        removeSubscriber: mock.fn(),
    };

    const mailer = {
        sendWelcomeEmail: mock.fn(),
    };

    const testApp = express();
    testApp.use(express.json());
    testApp.use(createSubscriptionRouter({ store, mailerService: mailer }));
    testApp.use((error, req, res, next) => {
        res.status(error.statusCode ?? 500).json({ message: error.message ?? "Unexpected server error" });
    });

    return { app: testApp, store, mailer };
};

test("subscribe endpoint rejects invalid payload", async () => {
    const { app, store } = buildTestApp();

    const response = await supertest(app).post("/subscribe").send({ email: "not-an-email", city: "" });

    assert.equal(response.status, 400);
    assert.equal(response.body.message, "Please provide a valid email.");
    assert.equal(store.upsertSubscriber.mock.callCount(), 0);
});

test("subscribe endpoint registers new subscriber and sends welcome email", async () => {
    const { app, store, mailer } = buildTestApp();

    store.upsertSubscriber.mock.mockImplementation(async () => ({
        isNew: true,
        subscriber: {
            email: "subscriber@example.com",
            city: "Austin",
        },
    }));

    const response = await supertest(app)
        .post("/subscribe")
        .send({ email: "subscriber@example.com", city: "Austin" });

    assert.equal(response.status, 201);
    assert.equal(response.body.message, "You're in! Look for your first forecast tomorrow morning.");
    assert.equal(store.upsertSubscriber.mock.callCount(), 1);
    assert.equal(store.removeSubscriber.mock.callCount(), 0);
    assert.equal(mailer.sendWelcomeEmail.mock.callCount(), 1);
    const [welcomeCall] = mailer.sendWelcomeEmail.mock.calls;
    const [welcomePayload] = welcomeCall.arguments;
    assert.equal(welcomePayload.recipient, "subscriber@example.com");
    assert.equal(welcomePayload.cityName, "Austin");
});

test("subscribe endpoint cleans up subscriber if welcome email fails", async () => {
    const { app, store, mailer } = buildTestApp();

    store.upsertSubscriber.mock.mockImplementation(async () => ({
        isNew: true,
        subscriber: {
            email: "subscriber@example.com",
            city: "Austin",
        },
    }));

    mailer.sendWelcomeEmail.mock.mockImplementation(async () => {
        throw new Error("SMTP unavailable");
    });

    const response = await supertest(app)
        .post("/subscribe")
        .send({ email: "subscriber@example.com", city: "Austin" });

    assert.equal(response.status, 500);
    assert.equal(store.upsertSubscriber.mock.callCount(), 1);
    assert.equal(store.removeSubscriber.mock.callCount(), 1);
    assert.equal(mailer.sendWelcomeEmail.mock.callCount(), 1);
});
