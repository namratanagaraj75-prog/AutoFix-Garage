"use strict";

const express = require("express");
const {
  ALLOWED_STATUSES,
  hasText,
  isValidId,
  sendError,
} = require("../helpers");

function createAssignmentRoutes(db) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    const assignments = await db.all("SELECT * FROM assignments ORDER BY id");
    return res.status(200).json({ success: true, data: assignments });
  });

  // Keep this named route before /:id so it is read as a word, not an ID.
  router.get("/with-details", async (req, res) => {
    const assignments = await db.all(
      "SELECT assignments.id, assignments.mechanic_id, " +
        "mechanics.name AS mechanic_name, assignments.bay_id, " +
        "bays.name AS bay_name, bays.vehicle, " +
        "assignments.job_description, assignments.status " +
        "FROM assignments " +
        "JOIN mechanics ON mechanics.id = assignments.mechanic_id " +
        "JOIN bays ON bays.id = assignments.bay_id " +
        "ORDER BY assignments.id",
    );
    return res.status(200).json({ success: true, data: assignments });
  });

  router.get("/:id", async (req, res) => {
    if (!isValidId(req.params.id)) {
      return sendError(
        res,
        400,
        "Assignment id must be a positive whole number.",
      );
    }

    const assignment = await db.get("SELECT * FROM assignments WHERE id = ?", [
      Number(req.params.id),
    ]);
    if (!assignment) return sendError(res, 404, "Assignment not found.");

    return res.status(200).json({ success: true, data: assignment });
  });

  router.post("/", async (req, res) => {
    const problem = await validateAssignment(db, req.body);
    if (problem) return sendError(res, 400, problem);

    const mechanicId = Number(req.body.mechanicId);
    const bayId = Number(req.body.bayId);
    const jobDescription = req.body.jobDescription.trim();
    const status = req.body.status === undefined ? "Pending" : req.body.status;

    const result = await db.run(
      "INSERT INTO assignments (mechanic_id, bay_id, job_description, status) VALUES (?, ?, ?, ?)",
      [mechanicId, bayId, jobDescription, status],
    );
    const assignment = await db.get("SELECT * FROM assignments WHERE id = ?", [
      result.lastID,
    ]);

    return res.status(201).json({
      success: true,
      message: "Assignment added successfully.",
      data: assignment,
    });
  });

  router.put("/:id", async (req, res) => {
    if (!isValidId(req.params.id)) {
      return sendError(
        res,
        400,
        "Assignment id must be a positive whole number.",
      );
    }
    const problem = await validateAssignment(db, req.body);
    if (problem) return sendError(res, 400, problem);

    const id = Number(req.params.id);
    const mechanicId = Number(req.body.mechanicId);
    const bayId = Number(req.body.bayId);
    const jobDescription = req.body.jobDescription.trim();
    const status = req.body.status === undefined ? "Pending" : req.body.status;
    const result = await db.run(
      "UPDATE assignments SET mechanic_id = ?, bay_id = ?, " +
        "job_description = ?, status = ? WHERE id = ?",
      [mechanicId, bayId, jobDescription, status, id],
    );
    if (result.changes === 0)
      return sendError(res, 404, "Assignment not found.");

    const assignment = await db.get("SELECT * FROM assignments WHERE id = ?", [
      id,
    ]);
    return res.status(200).json({
      success: true,
      message: "Assignment updated successfully.",
      data: assignment,
    });
  });

  router.delete("/:id", async (req, res) => {
    if (!isValidId(req.params.id)) {
      return sendError(
        res,
        400,
        "Assignment id must be a positive whole number.",
      );
    }

    const result = await db.run("DELETE FROM assignments WHERE id = ?", [
      Number(req.params.id),
    ]);
    if (result.changes === 0)
      return sendError(res, 404, "Assignment not found.");

    return res
      .status(200)
      .json({ success: true, message: "Assignment deleted successfully." });
  });

  return router;
}

async function validateAssignment(db, body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be a JSON object.";
  }
  if (!isValidId(body.mechanicId))
    return "mechanicId must be a positive whole number.";
  if (!isValidId(body.bayId)) return "bayId must be a positive whole number.";
  if (!hasText(body.jobDescription)) {
    return "jobDescription is required and must be a non-empty string.";
  }

  const status = body.status === undefined ? "Pending" : body.status;
  if (!ALLOWED_STATUSES.includes(status)) {
    return "status must be one of: " + ALLOWED_STATUSES.join(", ") + ".";
  }

  const mechanic = await db.get("SELECT id FROM mechanics WHERE id = ?", [
    Number(body.mechanicId),
  ]);
  if (!mechanic) return "mechanicId does not refer to an existing mechanic.";

  const bay = await db.get("SELECT id FROM bays WHERE id = ?", [
    Number(body.bayId),
  ]);
  if (!bay) return "bayId does not refer to an existing bay.";

  return null;
}

module.exports = { createAssignmentRoutes };
