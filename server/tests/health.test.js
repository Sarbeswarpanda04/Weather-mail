import { test } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";

const database = await import("../config/database.js");
const { app } = await import("../app.js");

test("health endpoint reports ok when database ready", async () => {
    database.__testing.setReadyState(true);
    const response = await supertest(app).get("/api/health");

    assert.equal(response.status, 200);
    assert.equal(response.body.status, "ok");
    assert.equal(response.body.database, "connected");
    assert.equal(typeof response.body.uptimeSeconds, "number");
});

test("health endpoint reports degraded when database disconnected", async () => {
    database.__testing.setReadyState(false);
    const response = await supertest(app).get("/api/health");

    assert.equal(response.status, 200);
    assert.equal(response.body.status, "degraded");
    assert.equal(response.body.database, "disconnected");
});
