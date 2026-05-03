-- Migration 007: Add profile columns to users table

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_name   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS phone       VARCHAR(30),
  ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT NOW();
