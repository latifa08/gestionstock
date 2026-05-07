const Joi = require("joi");

const createProductSchema = Joi.object({
  nom_produit: Joi.string().min(1).max(255).required(),
  categorie: Joi.string().max(100).allow("", null),
  description: Joi.string().allow("", null),
  quantite: Joi.number().integer().min(0).default(0),
  prix_unitaire: Joi.number().min(0).required(),
  fournisseur: Joi.string().max(255).allow("", null),
  date_ajout: Joi.date().iso().allow(null),
  niveau_alerte: Joi.number().integer().min(0).default(0),
  code_bar: Joi.string().max(100).allow("", null),
});

const updateProductSchema = Joi.object({
  nom_produit: Joi.string().min(1).max(255),
  categorie: Joi.string().max(100).allow("", null),
  description: Joi.string().allow("", null),
  quantite: Joi.number().integer().min(0),
  prix_unitaire: Joi.number().min(0),
  fournisseur: Joi.string().max(255).allow("", null),
  date_ajout: Joi.date().iso().allow(null),
  niveau_alerte: Joi.number().integer().min(0),
  code_bar: Joi.string().max(100).allow("", null),
});

module.exports = { createProductSchema, updateProductSchema };
