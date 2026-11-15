"use strict";

const express = require("express");
const {
  ALLOWED_VEHICLES,
  hasText,
  isAllowedVehicle,
  isValidId,
  sendError,
} = require("../helpers");

function createBayRoutes(db) {
  const router = express.Router();

  // GET /bays or GET /bays?vehicle=Car
  router.get("/", async (req, res) => {
    const vehicle = req.query.vehicle;

    if (vehicle !== undefined && !isAllowedVehicle(vehicle)) {
      return sendError(
        res,
        400,
        "vehicle must be one of the allowed values: " +
          ALLOWED_VEHICLES.join(", ") +
          ".",
      );
    }

    const bays = vehicle
      ? await db.all("SELECT * FROM bays WHERE vehicle = ? ORDER BY id", [
          vehicle.trim(),
        ])
      : await db.all("SELECT * FROM bays ORDER BY id");

    return res.status(200).json({ success: true, data: bays });
  });

  // GET /bays/1
  router.get("/:id", async (req, res) => {
    if (!isValidId(req.params.id)) {
      return sendError(res, 400, "Bay id must be a positive whole number.");
    }

    const bay = await db.get("SELECT * FROM bays WHERE id = ?", [
      Number(req.params.id),
    ]);
    if (!bay) return sendError(res, 404, "Bay not found.");

    return res.status(200).json({ success: true, data: bay });
  });

  // POST /bays
  router.post("/", async (req, res) => {
    const { name, vehicle } = req.body || {};

    if (!hasText(name)) {
      return sendError(
        res,
        400,
        "name is required and must be a non-empty string.",
      );
    }
    if (!isAllowedVehicle(vehicle)) {
      return sendError(
        res,
        400,
        "vehicle must be one of the allowed values: " +
          ALLOWED_VEHICLES.join(", ") +
          ".",
      );
    }

    const result = await db.run(
      "INSERT INTO bays (name, vehicle) VALUES (?, ?)",
      [name.trim(), vehicle.trim()],
    );
    const bay = await db.get("SELECT * FROM bays WHERE id = ?", [
      result.lastID,
    ]);

    return res
      .status(201)
      .json({ success: true, message: "Bay added successfully.", data: bay });
  });

  // PUT /bays/1
  router.put("/:id", async (req, res) => {
    if (!isValidId(req.params.id)) {
      return sendError(res, 400, "Bay id must be a positive whole number.");
    }
    const { name, vehicle } = req.body || {};

    if (!hasText(name)) {
      return sendError(
        res,
        400,
        "name is required and must be a non-empty string.",
      );
    }
    if (!isAllowedVehicle(vehicle)) {
      return sendError(
        res,
        400,
        "vehicle must be one of the allowed values: " +
          ALLOWED_VEHICLES.join(", ") +
          ".",
      );
    }

    const id = Number(req.params.id);
    const result = await db.run(
      "UPDATE bays SET name = ?, vehicle = ? WHERE id = ?",
      [name.trim(), vehicle.trim(), id],
    );
    if (result.changes === 0) return sendError(res, 404, "Bay not found.");

    const bay = await db.get("SELECT * FROM bays WHERE id = ?", [id]);
    return res
      .status(200)
      .json({ success: true, message: "Bay updated successfully.", data: bay });
  });

  // DELETE /bays/1
  router.delete("/:id", async (req, res) => {
    if (!isValidId(req.params.id)) {
      return sendError(res, 400, "Bay id must be a positive whole number.");
    }
    const id = Number(req.params.id);

    const bay = await db.get("SELECT id FROM bays WHERE id = ?", [id]);
    if (!bay) return sendError(res, 404, "Bay not found.");

    const assignment = await db.get(
      "SELECT id FROM assignments WHERE bay_id = ? LIMIT 1",
      [id],
    );
    if (assignment) {
      return sendError(
        res,
        409,
        "This bay is used by an assignment and cannot be deleted yet.",
      );
    }

    await db.run("DELETE FROM bays WHERE id = ?", [id]);
    return res
      .status(200)
      .json({ success: true, message: "Bay deleted successfully." });
  });

  return router;
}

module.exports = { createBayRoutes };
