-- Migration 002: Add foreign key constraints
-- PREREQUISITE: Run cleanup-orphans.sql first if orphaned rows may exist

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_mouvements_produit') THEN
    ALTER TABLE mouvements ADD CONSTRAINT fk_mouvements_produit
      FOREIGN KEY (id_produit) REFERENCES produits(id_produit) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_mouvements_client') THEN
    ALTER TABLE mouvements ADD CONSTRAINT fk_mouvements_client
      FOREIGN KEY (id_client) REFERENCES clients(id_client) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_mouvements_fournisseur') THEN
    ALTER TABLE mouvements ADD CONSTRAINT fk_mouvements_fournisseur
      FOREIGN KEY (id_fournisseur) REFERENCES fournisseurs(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_fd_facture') THEN
    ALTER TABLE facture_details ADD CONSTRAINT fk_fd_facture
      FOREIGN KEY (id_facture) REFERENCES factures(id_facture) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_fd_produit') THEN
    ALTER TABLE facture_details ADD CONSTRAINT fk_fd_produit
      FOREIGN KEY (id_produit) REFERENCES produits(id_produit) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_vd_vente') THEN
    ALTER TABLE vente_details ADD CONSTRAINT fk_vd_vente
      FOREIGN KEY (id_vente) REFERENCES ventes(id_vente) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_vd_produit') THEN
    ALTER TABLE vente_details ADD CONSTRAINT fk_vd_produit
      FOREIGN KEY (id_produit) REFERENCES produits(id_produit) ON DELETE RESTRICT;
  END IF;
END $$;
