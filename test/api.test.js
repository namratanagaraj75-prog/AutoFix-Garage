"use strict";

const { after, before, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");
const { openDatabase } = require("../src/database");

describe("AutoFix Garage API", { concurrency: 1 }, () => {
  let db;
  let server;
  let baseUrl;

  before(async () => {
    db = await openDatabase(":memory:");
    await db.run(
      "INSERT INTO mechanics (name, specialty) VALUES ('Test Mechanic', 'General repair');",
    );
    await db.run(
      "INSERT INTO bays (name, vehicle) VALUES ('Test Bay', 'Car');",
    );
    const app = createApp(db);
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    if (server)
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    if (db) await db.close();
  });

  async function request(route, options = {}) {
    const response = await fetch(`${baseUrl}${route}`, {
      ...options,
      headers: { "content-type": "application/json", ...options.headers },
    });
    return { status: response.status, body: await response.json() };
  }

  it("required test 1: creates a Car bay with HTTP 201", async () => {
    const result = await request("/bays", {
      method: "POST",
      body: JSON.stringify({ name: "Assignment Test Bay", vehicle: "Car" }),
    });
    assert.equal(result.status, 201);
    assert.equal(result.body.data.vehicle, "Car");
    assert.ok(result.body.data.id);
  });

  it("required test 2: rejects Other with HTTP 400 and lists allowed values", async () => {
    const result = await request("/bays", {
      method: "POST",
      body: JSON.stringify({ name: "Invalid Bay", vehicle: "Other" }),
    });
    assert.equal(result.status, 400);
    assert.match(result.body.error, /Car, Bike, Truck/);
  });

  it("required test 3: updates the bay to Bike with HTTP 200", async () => {
    const created = await request("/bays", {
      method: "POST",
      body: JSON.stringify({ name: "Update Test Bay", vehicle: "Car" }),
    });
    const result = await request(`/bays/${created.body.data.id}`, {
      method: "PUT",
      body: JSON.stringify({ name: "Update Test Bay", vehicle: "Bike" }),
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.data.vehicle, "Bike");
  });

  it("lists bays and filters them by vehicle query parameter", async () => {
    const allBays = await request("/bays");
    const cars = await request("/bays?vehicle=Car");
    assert.equal(allBays.status, 200);
    assert.ok(allBays.body.data.length >= 1);
    assert.equal(cars.status, 200);
    assert.ok(cars.body.data.every((bay) => bay.vehicle === "Car"));
  });

  it("rejects an invalid vehicle search value", async () => {
    const result = await request("/bays?vehicle=Other");
    assert.equal(result.status, 400);
    assert.match(result.body.error, /Car, Bike, Truck/);
  });

  it("gets, updates, and deletes a bay", async () => {
    const created = await request("/bays", {
      method: "POST",
      body: JSON.stringify({ name: "CRUD Test Bay", vehicle: "Truck" }),
    });
    const id = created.body.data.id;
    const read = await request(`/bays/${id}`);
    const updated = await request(`/bays/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name: "Updated CRUD Test Bay", vehicle: "Bike" }),
    });
    const removed = await request(`/bays/${id}`, { method: "DELETE" });

    assert.equal(read.status, 200);
    assert.equal(read.body.data.name, "CRUD Test Bay");
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.vehicle, "Bike");
    assert.equal(removed.status, 200);
  });

  it("returns a clear 400 response when a bay name is missing", async () => {
    const result = await request("/bays", {
      method: "POST",
      body: JSON.stringify({ vehicle: "Truck" }),
    });
    assert.equal(result.status, 400);
    assert.match(result.body.error, /name is required/);
  });

  it("joins assignments with mechanic and bay names", async () => {
    await request("/assignments", {
      method: "POST",
      body: JSON.stringify({
        mechanicId: 1,
        bayId: 1,
        jobDescription: "Check the brakes",
      }),
    });
    const result = await request("/assignments/with-details");
    assert.equal(result.status, 200);
    assert.ok(
      result.body.data.some(
        (assignment) =>
          assignment.mechanic_name === "Test Mechanic" &&
          assignment.bay_name === "Test Bay",
      ),
    );
  });

  it("supports mechanic create, read, update, and delete", async () => {
    const created = await request("/mechanics", {
      method: "POST",
      body: JSON.stringify({
        name: "CRUD Test Mechanic",
        specialty: "Diagnostics",
      }),
    });
    const id = created.body.data.id;
    const read = await request(`/mechanics/${id}`);
    const updated = await request(`/mechanics/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: "Updated CRUD Test Mechanic",
        specialty: "Electrical repair",
      }),
    });
    const removed = await request(`/mechanics/${id}`, { method: "DELETE" });

    assert.equal(created.status, 201);
    assert.equal(read.status, 200);
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.specialty, "Electrical repair");
    assert.equal(removed.status, 200);
  });

  it("supports assignment create, read, update, and delete", async () => {
    const created = await request("/assignments", {
      method: "POST",
      body: JSON.stringify({
        mechanicId: 1,
        bayId: 1,
        jobDescription: "CRUD test job",
      }),
    });
    const id = created.body.data.id;
    const listed = await request("/assignments");
    const read = await request(`/assignments/${id}`);
    const updated = await request(`/assignments/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        mechanicId: 1,
        bayId: 1,
        jobDescription: "Updated CRUD test job",
        status: "In Progress",
      }),
    });
    const removed = await request(`/assignments/${id}`, { method: "DELETE" });

    assert.equal(created.status, 201);
    assert.ok(listed.body.data.some((assignment) => assignment.id === id));
    assert.equal(read.status, 200);
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.status, "In Progress");
    assert.equal(removed.status, 200);
  });

  it("returns 404 for a bay that does not exist", async () => {
    const result = await request("/bays/99999");
    assert.equal(result.status, 404);
    assert.equal(result.body.error, "Bay not found.");
  });
});
