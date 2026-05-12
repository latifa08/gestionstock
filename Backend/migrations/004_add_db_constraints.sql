-- Migration 004: Add CHECK constraints and UNIQUE constraints
-- Normalizes movement type values to lowercase before applying constraint

-- Normalize existing movement types to lowercase
UPDATE mouvements SET type = LOWER(TRIM(type)) WHERE type != LOWER(TRIM(type));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'produits_quantite_check') THEN
    ALTER TABLE produits ADD CONSTRAINT produits_quantite_check CHECK (quantite >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'produits_prix_check') THEN
    ALTER TABLE produits ADD CONSTRAINT produits_prix_check CHECK (prix_unitaire > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'uq_produits_code_bar') THEN
    ALTER TABLE produits ADD CONSTRAINT uq_produits_code_bar UNIQUE (code_bar);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'mouvements_quantite_check') THEN
    ALTER TABLE mouvements ADD CONSTRAINT mouvements_quantite_check CHECK (quantite > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'mouvements_type_check') THEN
    ALTER TABLE mouvements ADD CONSTRAINT mouvements_type_check
      CHECK (type IN ('entree', 'sortie', 'retour', 'ajustement'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'uq_users_email') THEN
    ALTER TABLE users ADD CONSTRAINT uq_users_email UNIQUE (email);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_role_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('admin', 'responsable', 'magasinier'));
  END IF;
END $$;
