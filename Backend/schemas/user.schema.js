const Joi = require("joi");

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().length(64).required(),
  password: Joi.string().min(6).required(),
});

const createUserSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid("admin", "responsable", "magasinier").default("magasinier"),
  first_name: Joi.string().max(100).allow("", null).optional(),
  last_name: Joi.string().max(100).allow("", null).optional(),
  phone: Joi.string().max(30).allow("", null).optional(),
});

const updateUserSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).optional(),
  role: Joi.string().valid("admin", "responsable", "magasinier").optional(),
  first_name: Joi.string().max(100).allow("", null).optional(),
  last_name: Joi.string().max(100).allow("", null).optional(),
  phone: Joi.string().max(30).allow("", null).optional(),
});

module.exports = { forgotPasswordSchema, resetPasswordSchema, createUserSchema, updateUserSchema };
