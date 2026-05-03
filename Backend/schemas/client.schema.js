const Joi = require("joi");

const createClientSchema = Joi.object({
  nom: Joi.string().min(1).max(255).required(),
  telephone: Joi.string().max(50).allow("", null),
  adresse: Joi.string().allow("", null),
  email: Joi.string().email().allow("", null),
  type: Joi.string().max(50).allow("", null),
});

const updateClientSchema = Joi.object({
  nom: Joi.string().min(1).max(255),
  telephone: Joi.string().max(50).allow("", null),
  adresse: Joi.string().allow("", null),
  email: Joi.string().email().allow("", null),
  type: Joi.string().max(50).allow("", null),
});

module.exports = { createClientSchema, updateClientSchema };
