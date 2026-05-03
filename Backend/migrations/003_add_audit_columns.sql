-- Migration 003: Add audit columns to mouvements and ventes
-- Safe: all columns nullable, no existing data affected

ALTER TABLE mouvements
  ADD COLUMN IF NOT EXISTS id_user INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS raison VARCHAR(255) DEFAULT NULL;

ALTER TABLE ventes
  ADD COLUMN IF NOT EXISTS id_user INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS id_client INTEGER REFERENCES clients(id_client) ON DELETE SET NULL;
