const Joi = require("joi");

const createMouvementSchema = Joi.object({
  id_produit: Joi.number().integer().positive().required(),
  type: Joi.string().valid("entree", "sortie", "retour", "ajustement").required(),
  quantite: Joi.number().integer().min(1).required(),
  id_client: Joi.number().integer().positive().allow(null),
  id_fournisseur: Joi.number().integer().positive().allow(null),
  raison: Joi.string().max(255).allow("", null),
  date: Joi.date().iso().allow(null),
});

module.exports = { createMouvementSchema };
