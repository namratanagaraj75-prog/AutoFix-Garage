"use strict";

const express = require("express");
const { hasText, isValidId, sendError } = require("../helpers");

function createMechanicRoutes(db) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    const mechanics = await db.all("SELECT * FROM mechanics ORDER BY id");
    return res.status(200).json({ success: true, data: mechanics });
  });

  router.get("/:id", async (req, res) => {
    if (!isValidId(req.params.id)) {
      return sendError(
        res,
        400,
        "Mechanic id must be a positive whole number.",
      );
    }

    const mechanic = await db.get("SELECT * FROM mechanics WHERE id = ?", [
      Number(req.params.id),
    ]);
    if (!mechanic) return sendError(res, 404, "Mechanic not found.");

    return res.status(200).json({ success: true, data: mechanic });
  });

  router.post("/", async (req, res) => {
    const { name, specialty } = req.body || {};

    if (!hasText(name)) {
      return sendError(
        res,
        400,
        "name is required and must be a non-empty string.",
      );
    }
    if (!hasText(specialty)) {
      return sendError(
        res,
        400,
        "specialty is required and must be a non-empty string.",
      );
    }

    const result = await db.run(
      "INSERT INTO mechanics (name, specialty) VALUES (?, ?)",
      [name.trim(), specialty.trim()],
    );
    const mechanic = await db.get("SELECT * FROM mechanics WHERE id = ?", [
      result.lastID,
    ]);

    return res.status(201).json({
      success: true,
      message: "Mechanic added successfully.",
      data: mechanic,
    });
  });

  router.put("/:id", async (req, res) => {
    if (!isValidId(req.params.id)) {
      return sendError(
        res,
        400,
        "Mechanic id must be a positive whole number.",
      );
    }
    const { name, specialty } = req.body || {};

    if (!hasText(name)) {
      return sendError(
        res,
        400,
        "name is required and must be a non-empty string.",
      );
    }
    if (!hasText(specialty)) {
      return sendError(
        res,
        400,
        "specialty is required and must be a non-empty string.",
      );
    }

    const id = Number(req.params.id);
    const result = await db.run(
      "UPDATE mechanics SET name = ?, specialty = ? WHERE id = ?",
      [name.trim(), specialty.trim(), id],
    );
    if (result.changes === 0) return sendError(res, 404, "Mechanic not found.");

    const mechanic = await db.get("SELECT * FROM mechanics WHERE id = ?", [id]);
    return res.status(200).json({
      success: true,
      message: "Mechanic updated successfully.",
      data: mechanic,
    });
  });

  router.delete("/:id", async (req, res) => {
    if (!isValidId(req.params.id)) {
      return sendError(
        res,
        400,
        "Mechanic id must be a positive whole number.",
      );
    }
    const id = Number(req.params.id);

    const mechanic = await db.get("SELECT id FROM mechanics WHERE id = ?", [
      id,
    ]);
    if (!mechanic) return sendError(res, 404, "Mechanic not found.");

    const assignment = await db.get(
      "SELECT id FROM assignments WHERE mechanic_id = ? LIMIT 1",
      [id],
    );
    if (assignment) {
      return sendError(
        res,
        409,
        "This mechanic is used by an assignment and cannot be deleted yet.",
      );
    }

    await db.run("DELETE FROM mechanics WHERE id = ?", [id]);
    return res
      .status(200)
      .json({ success: true, message: "Mechanic deleted successfully." });
  });

  return router;
}

module.exports = { createMechanicRoutes };
