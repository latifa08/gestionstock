function handleDbError(err, req, res, next) {
  if (err.code === "23503") {
    return res.status(409).json({
      success: false,
      code: "CONFLICT",
      message: "Referenced record does not exist (foreign key violation)",
    });
  }
  if (err.code === "23505") {
    const detail = err.detail || "";
    const field = detail.match(/Key \((.+?)\)/)?.[1] || "field";
    return res.status(409).json({
      success: false,
      code: "CONFLICT",
      message: `Duplicate value for ${field}`,
    });
  }
  if (err.code === "23514") {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Value violates database constraint: " + (err.constraint || ""),
    });
  }

  console.error("Unhandled error:", err.message);
  return res.status(500).json({
    success: false,
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
  });
}

module.exports = { handleDbError };
