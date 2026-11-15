"use strict";

const ALLOWED_VEHICLES = ["Car", "Bike", "Truck"];
const ALLOWED_STATUSES = ["Pending", "In Progress", "Completed"];

function hasText(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isValidId(value) {
  return (
    /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value))
  );
}

function isAllowedVehicle(value) {
  return typeof value === "string" && ALLOWED_VEHICLES.includes(value.trim());
}

function sendError(res, status, message) {
  return res.status(status).json({ success: false, error: message });
}

module.exports = {
  ALLOWED_VEHICLES,
  ALLOWED_STATUSES,
  hasText,
  isValidId,
  isAllowedVehicle,
  sendError,
};
