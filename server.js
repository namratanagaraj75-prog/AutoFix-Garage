"use strict";

const path = require("node:path");
const { createApp } = require("./src/app");
const { openDatabase } = require("./src/database");

const PORT = Number(process.env.PORT) || 3000;
const databaseFile = path.join(__dirname, "data", "autofix.sqlite");

async function startServer() {
  // Open the SQLite file and add sample rows the first time the project runs.
  const db = await openDatabase(databaseFile, true);
  const app = createApp(db);

  app.listen(PORT, () => {
    console.log("AutoFix Garage API is running at http://localhost:" + PORT);
    console.log("Database file: " + databaseFile);
  });
}

startServer().catch((error) => {
  console.error("The server could not start:", error.message);
});
