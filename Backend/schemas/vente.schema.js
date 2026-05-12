const Joi = require("joi");

const createVenteSchema = Joi.object({
  cart: Joi.array()
    .items(
      Joi.object({
        id_produit: Joi.number().integer().positive().required(),
        quantity: Joi.number().integer().min(1).required(),
        nom_produit: Joi.string().allow("", null),
      })
    )
    .min(1)
    .required(),
  id_client: Joi.number().integer().positive().allow(null),
});

module.exports = { createVenteSchema };
