-- Safety script: remove orphaned rows before applying FK constraints
-- Run this BEFORE migration 002

-- Log and remove mouvements with no matching product
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM mouvements
  WHERE id_produit NOT IN (SELECT id_produit FROM produits);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % orphaned mouvement rows (bad id_produit)', deleted_count;
END $$;

-- Log and remove mouvements with no matching client (only where id_client is set)
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM mouvements
  WHERE id_client IS NOT NULL
    AND id_client NOT IN (SELECT id_client FROM clients);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % orphaned mouvement rows (bad id_client)', deleted_count;
END $$;

-- Log and remove mouvements with no matching fournisseur (only where id_fournisseur is set)
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM mouvements
  WHERE id_fournisseur IS NOT NULL
    AND id_fournisseur NOT IN (SELECT id FROM fournisseurs);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % orphaned mouvement rows (bad id_fournisseur)', deleted_count;
END $$;

-- Log and remove facture_details with no matching facture
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM facture_details
  WHERE id_facture NOT IN (SELECT id_facture FROM factures);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % orphaned facture_details rows', deleted_count;
END $$;
