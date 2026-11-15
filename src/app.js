"use strict";

const express = require("express");
const { createBayRoutes } = require("./routes/bays");
const { createMechanicRoutes } = require("./routes/mechanics");
const { createAssignmentRoutes } = require("./routes/assignments");

function createApp(db) {
  const app = express();

  // Read incoming JSON before the route handlers run.
  app.use(express.json());

  app.get("/", (req, res) => {
    res.status(200).json({
      success: true,
      message: "AutoFix Garage API is running.",
      endpoints: ["/bays", "/mechanics", "/assignments"],
    });
  });

  app.get("/health", (req, res) => {
    res.status(200).json({ success: true, status: "ok" });
  });

  // Each group of related endpoints has its own router file.
  app.use("/bays", createBayRoutes(db));
  app.use("/mechanics", createMechanicRoutes(db));
  app.use("/assignments", createAssignmentRoutes(db));

  app.use((req, res) => {
    res.status(404).json({ success: false, error: "Route not found." });
  });

  // Express sends errors from async route handlers here.
  app.use((error, req, res, next) => {
    if (error.status === 400) {
      return res.status(400).json({
        success: false,
        error: "Request body must contain valid JSON.",
      });
    }

    console.error(error);
    return res.status(500).json({
      success: false,
      error: "An unexpected server error occurred.",
    });
  });

  return app;
}

module.exports = { createApp };
