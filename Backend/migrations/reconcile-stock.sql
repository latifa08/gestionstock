-- Reconciliation script: verify produits.quantite matches movement sums
-- Run after migrations to detect any divergence

SELECT
  p.id_produit,
  p.nom_produit,
  p.quantite AS stored_quantite,
  COALESCE(
    SUM(CASE WHEN m.type = 'entree' THEN m.quantite
             WHEN m.type = 'retour' THEN m.quantite
             WHEN m.type = 'sortie' THEN -m.quantite
             ELSE 0 END),
    0
  )::INTEGER AS computed_quantite,
  p.quantite - COALESCE(
    SUM(CASE WHEN m.type = 'entree' THEN m.quantite
             WHEN m.type = 'retour' THEN m.quantite
             WHEN m.type = 'sortie' THEN -m.quantite
             ELSE 0 END),
    0
  ) AS divergence
FROM produits p
LEFT JOIN mouvements m ON p.id_produit = m.id_produit
GROUP BY p.id_produit, p.nom_produit, p.quantite
HAVING p.quantite != COALESCE(
  SUM(CASE WHEN m.type = 'entree' THEN m.quantite
           WHEN m.type = 'retour' THEN m.quantite
           WHEN m.type = 'sortie' THEN -m.quantite
           ELSE 0 END),
  0
)
ORDER BY ABS(divergence) DESC;
