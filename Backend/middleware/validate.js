function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((d) => ({
        field: d.path.join("."),
        message: d.message.replace(/['"]/g, ""),
      }));

      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        errors,
      });
    }

    req.body = value;
    next();
  };
}

module.exports = { validateBody };
