import React, { useState, useEffect, useRef } from "react";
import api from "./api";
import "./MouvementPage.css";

const BACKEND = "http://localhost:5000";

/* ── tiny sub-components ─────────────────── */
function Thumb({ imageUrl, name, size = 36 }) {
  return imageUrl ? (
    <img
      src={`${BACKEND}${imageUrl}`}
      alt={name}
      style={{ width: size, height: size, borderRadius: 8, objectFit: "cover", border: "1px solid #ede9fe", flexShrink: 0 }}
    />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: 8, flexShrink: 0,
      background: "linear-gradient(135deg,#ede9fe,#ddd5f8)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, color: "#5b2da3", fontSize: size * 0.38,
      border: "1px solid #ddd5f8",
    }}>
      {(name || "?")[0].toUpperCase()}
    </div>
  );
}

function StockChip({ qty, alert }) {
  const low = qty <= (alert || 0);
  return (
    <span className={`mv-chip ${low ? "low" : "ok"}`}>{qty} pcs</span>
  );
}

/* ── reusable product search dropdown ─────── */
function ProductPicker({ produits, value, onChange, dropRef }) {
  const [search, setSearch] = useState("");
  const [open,   setOpen]   = useState(false);

  const items = produits.filter(p =>
    (p.nom_produit || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.code_bar    || "").toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8);

  const pick = (p) => { onChange(p); setSearch(p.nom_produit); setOpen(false); };
  const clear = () => { onChange(null); setSearch(""); setOpen(false); };

  /* sync display when value cleared externally */
  useEffect(() => { if (!value) setSearch(""); }, [value]);

  return (
    <div className="mv-picker-wrap" ref={dropRef}>
      <div className="mv-search-inner">
        <svg className="mv-ico-search" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className="mv-input mv-input-pl"
          type="text"
          placeholder="Rechercher par nom ou code-barre…"
          value={value ? value.nom_produit : search}
          onChange={e => { setSearch(e.target.value); onChange(null); setOpen(true); }}
          onFocus={() => !value && setOpen(true)}
          readOnly={!!value}
        />
        {value && (
          <button className="mv-clear" onClick={clear} title="Changer">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {open && !value && (
        <div className="mv-drop">
          {items.length === 0
            ? <div className="mv-drop-empty">Aucun produit trouvé</div>
            : items.map(p => (
              <div key={p.id_produit} className="mv-drop-item" onMouseDown={() => pick(p)}>
                <Thumb imageUrl={p.image_url} name={p.nom_produit} size={34} />
                <div className="mv-drop-text">
                  <span className="mv-drop-name">{p.nom_produit}</span>
                  <span className="mv-drop-sub">{p.code_bar} · {p.categorie || "—"}</span>
                </div>
                <StockChip qty={p.quantite} alert={p.niveau_alerte} />
              </div>
            ))
          }
        </div>
      )}

      {value && (
        <div className="mv-sel-badge">
          <Thumb imageUrl={value.image_url} name={value.nom_produit} size={42} />
          <div className="mv-sel-text">
            <span className="mv-sel-name">{value.nom_produit}</span>
            <span className="mv-sel-sub">{value.categorie || "—"} · {value.code_bar}</span>
          </div>
          <div className="mv-sel-right">
            <span className="mv-sel-lbl">Stock actuel</span>
            <StockChip qty={value.quantite} alert={value.niveau_alerte} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main page
═══════════════════════════════════════════ */
export default function MouvementPage() {
  const [produits,     setProduits]     = useState([]);
  const [mouvements,   setMouvements]   = useState([]);
  const [clients,      setClients]      = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);

  /* entree state */
  const [inSel,      setInSel]      = useState(null);
  const [inQty,      setInQty]      = useState("");
  const [inFourn,    setInFourn]    = useState("");
  const [inRaison,   setInRaison]   = useState("");
  const [inError,    setInError]    = useState("");
  const [inBusy,     setInBusy]     = useState(false);
  const inDropRef = useRef(null);

  /* sortie state */
  const [outSel,     setOutSel]     = useState(null);
  const [outQty,     setOutQty]     = useState("");
  const [outClient,  setOutClient]  = useState("");
  const [outRaison,  setOutRaison]  = useState("");
  const [outError,   setOutError]   = useState("");
  const [outBusy,    setOutBusy]    = useState(false);
  const outDropRef = useRef(null);

  /* table filter */
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    fetchAll();
    const close = (e) => {
      if (inDropRef.current  && !inDropRef.current.contains(e.target))  setInSel(v  => { /* keep sel */ return v; });
      if (outDropRef.current && !outDropRef.current.contains(e.target)) setOutSel(v => { return v; });
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const fetchAll = () => {
    api.get("/products?archived=false").then(r => setProduits(r.data)).catch(() => {});
    api.get("/mouvements").then(r => setMouvements(r.data)).catch(() => {});
    api.get("/clients").then(r => setClients(r.data)).catch(() => {});
    api.get("/fournisseurs").then(r => setFournisseurs(r.data)).catch(() => {});
  };

  /* ── submit entree ── */
  const submitEntree = async () => {
    setInError("");
    if (!inSel) return setInError("Veuillez sélectionner un produit.");
    const n = parseInt(inQty, 10);
    if (!n || n < 1) return setInError("Quantité invalide (minimum 1).");
    setInBusy(true);
    try {
      await api.post("/mouvements", {
        id_produit:     inSel.id_produit,
        type:           "entree",
        quantite:       n,
        id_fournisseur: inFourn ? Number(inFourn) : null,
        raison:         inRaison || null,
      });
      fetchAll();
      setInSel(null); setInQty(""); setInFourn(""); setInRaison("");
    } catch (err) {
      setInError(err.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setInBusy(false);
    }
  };

  /* ── submit sortie ── */
  const submitSortie = async () => {
    setOutError("");
    if (!outSel) return setOutError("Veuillez sélectionner un produit.");
    const n = parseInt(outQty, 10);
    if (!n || n < 1) return setOutError("Quantité invalide (minimum 1).");
    if (n > outSel.quantite) return setOutError(`Stock insuffisant — seulement ${outSel.quantite} disponible.`);
    setOutBusy(true);
    try {
      await api.post("/mouvements", {
        id_produit: outSel.id_produit,
        type:       "sortie",
        quantite:   n,
        id_client:  outClient ? Number(outClient) : null,
        raison:     outRaison || null,
      });
      fetchAll();
      setOutSel(null); setOutQty(""); setOutClient(""); setOutRaison("");
    } catch (err) {
      setOutError(err.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setOutBusy(false);
    }
  };

  const produitsFiltres = produits.filter(p =>
    (p.nom_produit || "").toLowerCase().includes(recherche.toLowerCase())
  );

  return (
    <div className="mv-page">

      <h2 className="mv-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        Gestion des Mouvements
      </h2>

      {/* ══ TOP TWO PANELS ══ */}
      <div className="mv-top-grid">

        {/* ── STOCK IN ── */}
        <div className="mv-card mv-card-in">
          <div className="mv-card-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Entrée de stock
          </div>

          <div className="mv-field">
            <label className="mv-label">Produit *</label>
            <ProductPicker produits={produits} value={inSel} onChange={setInSel} dropRef={inDropRef} />
          </div>

          <div className="mv-row2">
            <div className="mv-field">
              <label className="mv-label">Quantité *</label>
              <input className="mv-input" type="number" min="1" placeholder="0"
                value={inQty} onChange={e => setInQty(e.target.value)} />
            </div>
            <div className="mv-field">
              <label className="mv-label">Fournisseur</label>
              <select className="mv-input" value={inFourn} onChange={e => setInFourn(e.target.value)}>
                <option value="">— Optionnel —</option>
                {fournisseurs.map(f => (
                  <option key={f.id_fournisseur} value={f.id_fournisseur}>{f.nom}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mv-field">
            <label className="mv-label">Raison</label>
            <input className="mv-input" type="text" placeholder="Réapprovisionnement, commande…"
              value={inRaison} onChange={e => setInRaison(e.target.value)} />
          </div>

          {inError && <div className="mv-error">{inError}</div>}

          <button className="mv-btn mv-btn-in" onClick={submitEntree} disabled={inBusy}>
            {inBusy ? <><span className="mv-spin" /> Enregistrement…</> : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg> Confirmer l'entrée</>
            )}
          </button>
        </div>

        {/* ── STOCK OUT ── */}
        <div className="mv-card mv-card-out">
          <div className="mv-card-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Sortie de stock
          </div>

          <div className="mv-field">
            <label className="mv-label">Produit *</label>
            <ProductPicker produits={produits} value={outSel} onChange={setOutSel} dropRef={outDropRef} />
          </div>

          <div className="mv-row2">
            <div className="mv-field">
              <label className="mv-label">Quantité *</label>
              <input className="mv-input" type="number" min="1"
                placeholder="0"
                max={outSel?.quantite || undefined}
                value={outQty} onChange={e => setOutQty(e.target.value)} />
              {outSel && (
                <span className="mv-hint">Max disponible : {outSel.quantite}</span>
              )}
            </div>
            <div className="mv-field">
              <label className="mv-label">Client</label>
              <select className="mv-input" value={outClient} onChange={e => setOutClient(e.target.value)}>
                <option value="">— Optionnel —</option>
                {clients.map(c => (
                  <option key={c.id_client} value={c.id_client}>{c.nom}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mv-field">
            <label className="mv-label">Raison</label>
            <input className="mv-input" type="text" placeholder="Livraison, transfert, casse…"
              value={outRaison} onChange={e => setOutRaison(e.target.value)} />
          </div>

          {outError && <div className="mv-error">{outError}</div>}

          <button className="mv-btn mv-btn-out" onClick={submitSortie} disabled={outBusy}>
            {outBusy ? <><span className="mv-spin" /> Enregistrement…</> : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg> Confirmer la sortie</>
            )}
          </button>
        </div>

      </div>{/* end top grid */}

      {/* ══ PRODUCTS TABLE ══ */}
      <div className="mv-card">
        <div className="mv-card-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          Produits en stock
        </div>
        <input className="mv-search-bar" type="text" placeholder="Filtrer les produits…"
          value={recherche} onChange={e => setRecherche(e.target.value)} />
        <div className="mv-table-wrap">
          <table className="mv-table">
            <thead><tr>
              <th>ID</th><th>Nom</th><th>Catégorie</th><th>Quantité</th><th>Seuil alerte</th>
            </tr></thead>
            <tbody>
              {produitsFiltres.length === 0
                ? <tr><td colSpan="5" className="mv-empty">Aucun produit</td></tr>
                : produitsFiltres.map(p => (
                  <tr key={p.id_produit} className={p.quantite <= (p.niveau_alerte || 0) ? "row-low" : ""}>
                    <td>{p.id_produit}</td>
                    <td>{p.nom_produit}</td>
                    <td>{p.categorie || "—"}</td>
                    <td><StockChip qty={p.quantite} alert={p.niveau_alerte} /></td>
                    <td>{p.niveau_alerte}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ HISTORY TABLE ══ */}
      <div className="mv-card">
        <div className="mv-card-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          Historique des mouvements
        </div>
        <div className="mv-table-wrap">
          <table className="mv-table">
            <thead><tr>
              <th>ID</th><th>Produit</th><th>Type</th><th>Quantité</th>
              <th>Client</th><th>Fournisseur</th><th>Raison</th><th>Date</th>
            </tr></thead>
            <tbody>
              {mouvements.length === 0
                ? <tr><td colSpan="8" className="mv-empty">Aucun mouvement enregistré</td></tr>
                : mouvements.map(m => (
                  <tr key={m.id_mouvement}>
                    <td>{m.id_mouvement}</td>
                    <td>{m.nom_produit || m.id_produit}</td>
                    <td><span className={`mv-type ${m.type}`}>{m.type}</span></td>
                    <td>{m.quantite}</td>
                    <td>{m.nom_client || "—"}</td>
                    <td>{m.nom_fournisseur || "—"}</td>
                    <td>{m.raison || "—"}</td>
                    <td>{m.date ? new Date(m.date).toLocaleString("fr-DZ") : "—"}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
