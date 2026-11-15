"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

async function openDatabase(filename, addSampleData = false) {
  if (filename !== ":memory:") {
    await fs.mkdir(path.dirname(filename), { recursive: true });
  }

  // sqlite3 opens the file; sqlite adds Promise methods such as db.get().
  const db = await open({ filename, driver: sqlite3.Database });
  await db.exec("PRAGMA foreign_keys = ON;");

  await db.exec(
    "CREATE TABLE IF NOT EXISTS mechanics (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
      "name TEXT NOT NULL, specialty TEXT NOT NULL); " +
      "CREATE TABLE IF NOT EXISTS bays (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
      "name TEXT NOT NULL, " +
      "vehicle TEXT NOT NULL CHECK (vehicle IN ('Car', 'Bike', 'Truck'))); " +
      "CREATE TABLE IF NOT EXISTS assignments (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
      "mechanic_id INTEGER NOT NULL, bay_id INTEGER NOT NULL, " +
      "job_description TEXT NOT NULL, " +
      "status TEXT NOT NULL DEFAULT 'Pending' " +
      "CHECK (status IN ('Pending', 'In Progress', 'Completed')), " +
      "FOREIGN KEY (mechanic_id) REFERENCES mechanics(id) ON DELETE RESTRICT, " +
      "FOREIGN KEY (bay_id) REFERENCES bays(id) ON DELETE RESTRICT);",
  );

  if (addSampleData) await addSampleRows(db);
  return db;
}

async function addSampleRows(db) {
  const result = await db.get(
    "SELECT (SELECT COUNT(*) FROM mechanics) + " +
      "(SELECT COUNT(*) FROM bays) + " +
      "(SELECT COUNT(*) FROM assignments) AS total",
  );

  // Do not duplicate sample rows if the API is restarted.
  if (result.total > 0) return;

  await db.run("INSERT INTO mechanics (name, specialty) VALUES (?, ?)", [
    "Aarav Mehta",
    "Engine diagnostics",
  ]);
  await db.run("INSERT INTO mechanics (name, specialty) VALUES (?, ?)", [
    "Diya Sharma",
    "Motorcycle repair",
  ]);
  await db.run("INSERT INTO mechanics (name, specialty) VALUES (?, ?)", [
    "Kabir Rao",
    "Transmission service",
  ]);

  await db.run("INSERT INTO bays (name, vehicle) VALUES (?, ?)", [
    "Bay 1",
    "Car",
  ]);
  await db.run("INSERT INTO bays (name, vehicle) VALUES (?, ?)", [
    "Bay 2",
    "Bike",
  ]);
  await db.run("INSERT INTO bays (name, vehicle) VALUES (?, ?)", [
    "Bay 3",
    "Truck",
  ]);

  await db.run(
    "INSERT INTO assignments (mechanic_id, bay_id, job_description, status) VALUES (?, ?, ?, ?)",
    [1, 1, "Inspect the engine warning light", "In Progress"],
  );
  await db.run(
    "INSERT INTO assignments (mechanic_id, bay_id, job_description, status) VALUES (?, ?, ?, ?)",
    [2, 2, "Replace the front brake pads", "Pending"],
  );
  await db.run(
    "INSERT INTO assignments (mechanic_id, bay_id, job_description, status) VALUES (?, ?, ?, ?)",
    [3, 3, "Check the transmission fluid", "Completed"],
  );
}

module.exports = { openDatabase };
