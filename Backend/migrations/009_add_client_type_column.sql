-- Migration 009: Add type column to clients table if missing
ALTER TABLE clients ADD COLUMN IF NOT EXISTS type VARCHAR(50) NULL;
