-- Migration 001: Add soft-delete archived_at columns
-- Safe: adds nullable columns, no existing data affected

ALTER TABLE produits
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE fournisseurs
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;
