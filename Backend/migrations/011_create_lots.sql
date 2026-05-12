CREATE TABLE IF NOT EXISTS lots (
  id_lot          SERIAL PRIMARY KEY,
  id_produit      INTEGER NOT NULL REFERENCES produits(id_produit) ON DELETE CASCADE,
  quantite        INTEGER NOT NULL DEFAULT 0 CHECK (quantite >= 0),
  date_expiration DATE,
  date_entree     DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lots_produit    ON lots(id_produit);
CREATE INDEX IF NOT EXISTS idx_lots_expiration ON lots(date_expiration);

-- Seed existing product stock as single lots with NULL expiration
INSERT INTO lots (id_produit, quantite, date_expiration, date_entree)
SELECT id_produit, quantite, NULL, CURRENT_DATE
FROM produits
WHERE quantite > 0 AND archived_at IS NULL
ON CONFLICT DO NOTHING;
