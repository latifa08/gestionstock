const Joi = require("joi");

const createFournisseurSchema = Joi.object({
  nom: Joi.string().min(1).max(255).required(),
  societe: Joi.string().max(255).allow("", null),
  telephone: Joi.string().max(50).allow("", null),
  email: Joi.string().email().allow("", null),
  adresse: Joi.string().allow("", null),
});

const updateFournisseurSchema = Joi.object({
  nom: Joi.string().min(1).max(255),
  societe: Joi.string().max(255).allow("", null),
  telephone: Joi.string().max(50).allow("", null),
  email: Joi.string().email().allow("", null),
  adresse: Joi.string().allow("", null),
});

module.exports = { createFournisseurSchema, updateFournisseurSchema };
