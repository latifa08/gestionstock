import React, { useState, useEffect, useRef } from "react";
import api from "./api";
import "./MouvementPage.css";

/* ── print a single bon de sortie ─────────────── */
function printBonSortie(m) {
  const win = window.open("", "_blank", "width=700,height=600");
  const date = m.date ? new Date(m.date).toLocaleString("fr-DZ") : "—";
  win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Bon de Sortie #${m.id_mouvement}</title>
  <style>
    body { font-family: "Segoe UI", Arial, sans-serif; margin: 32px; color: #1e1b2e; }
    h1   { font-size: 22px; font-weight: 800; color: #5b2da3; margin: 0 0 4px; }
    .sub { font-size: 13px; color: #6b7280; margin-bottom: 20px; }
    .header-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; background: #f5f3ff; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px; border: 1px solid #ede9fe; }
    .hfield label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #7c3aed; display: block; margin-bottom: 2px; }
    .hfield span  { font-size: 14px; font-weight: 600; color: #1e1b2e; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; background: #fee2e2; color: #991b1b; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #5b2da3; color: white; padding: 8px 12px; font-size: 12px; text-align: left; }
    td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #f0ebff; }
    tr:last-child td { border-bottom: none; }
    .footer { margin-top: 32px; display: flex; justify-content: space-between; font-size: 12px; color: #9ca3af; }
    .sig { text-align: center; border-top: 1.5px solid #d1d5db; padding-top: 8px; width: 160px; font-size: 12px; color: #6b7280; }
    @media print { body { margin: 16px; } }
  </style>
</head>
<body>
  <h1>BON DE SORTIE</h1>
  <p class="sub">SysStock — Document de traçabilité</p>

  <div class="header-grid">
    <div class="hfield"><label>N° Mouvement</label><span>#${m.id_mouvement}</span></div>
    <div class="hfield"><label>Statut</label><span class="badge">Sortie validée</span></div>
    <div class="hfield"><label>Créé par</label><span>${m.created_by || "—"}</span></div>
    <div class="hfield"><label>Date de création</label><span>${date}</span></div>
    <div class="hfield"><label>Client</label><span>${m.nom_client || "—"}</span></div>
    <div class="hfield"><label>Raison</label><span>${m.raison || "—"}</span></div>
  </div>

  <table>
    <thead><tr><th>Produit</th><th>Quantité sortie</th></tr></thead>
    <tbody>
      <tr><td>${m.nom_produit || m.id_produit}</td><td>${m.quantite} pcs</td></tr>
    </tbody>
  </table>

  <div class="footer">
    <span>Imprimé le ${new Date().toLocaleString("fr-DZ")}</span>
    <div class="sig">Signature responsable</div>
  </div>

  <script>window.onload = () => { window.print(); window.close(); }</script>
</body>
</html>`);
  win.document.close();
}

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
  const [inExpiry,   setInExpiry]   = useState("");
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
  const [outLots,    setOutLots]    = useState([]);   /* lots for selected product */
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

  /* fetch lots when product selected for sortie */
  useEffect(() => {
    if (!outSel) { setOutLots([]); return; }
    api.get(`/lots/product/${outSel.id_produit}`).then(r => setOutLots(r.data)).catch(() => setOutLots([]));
  }, [outSel]);

  /* valid (non-expired) lots and stock total */
  const validLots = outLots.filter(l =>
    l.date_expiration === null || Number(l.days_left) >= 0
  );
  const validStock = validLots.reduce((s, l) => s + Number(l.quantite), 0);
  const allExpired = outSel && outLots.length > 0 && validStock === 0;

  /* FEFO preview: only from valid lots */
  const fefoPreview = (() => {
    const qty = parseInt(outQty, 10);
    if (!qty || qty < 1 || !validLots.length) return [];
    let rem = qty;
    const affected = [];
    for (const lot of validLots) {
      if (rem <= 0) break;
      const take = Math.min(rem, Number(lot.quantite));
      affected.push({ ...lot, take });
      rem -= take;
    }
    return affected;
  })();

  /* ── submit entree ── */
  const submitEntree = async () => {
    setInError("");
    if (!inSel) return setInError("Veuillez sélectionner un produit.");
    const n = parseInt(inQty, 10);
    if (!n || n < 1) return setInError("Quantité invalide (minimum 1).");
    setInBusy(true);
    try {
      await api.post("/mouvements", {
        id_produit:      inSel.id_produit,
        type:            "entree",
        quantite:        n,
        id_fournisseur:  inFourn ? Number(inFourn) : null,
        raison:          inRaison || null,
        date_expiration: inExpiry || null,
      });
      fetchAll();
      setInSel(null); setInQty(""); setInFourn(""); setInRaison(""); setInExpiry("");
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
    if (allExpired) return setOutError("Impossible — tout le stock de ce produit est expiré.");
    const n = parseInt(outQty, 10);
    if (!n || n < 1) return setOutError("Quantité invalide (minimum 1).");
    if (n > validStock) return setOutError(`Stock valide insuffisant — seulement ${validStock} disponible (lots expirés exclus).`);
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
      setOutSel(null); setOutQty(""); setOutClient(""); setOutRaison(""); setOutLots([]);
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
              <label className="mv-label">Date d'expiration du lot</label>
              <input className="mv-input" type="date" value={inExpiry}
                onChange={e => setInExpiry(e.target.value)} />
            </div>
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

          {/* expired product warning */}
          {allExpired && (
            <div className="mv-expired-warning">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              Produit expiré — tout le stock disponible a dépassé la date d'expiration. Sortie impossible.
            </div>
          )}

          <div className="mv-row2">
            <div className="mv-field">
              <label className="mv-label">Quantité *</label>
              <input className="mv-input" type="number" min="1"
                placeholder="0"
                max={validStock || undefined}
                value={outQty} onChange={e => setOutQty(e.target.value)}
                disabled={allExpired} />
              {outSel && !allExpired && (
                <span className="mv-hint">Max valide : {validStock} pcs{validStock < outSel.quantite ? ` (${outSel.quantite - validStock} pcs expirés exclus)` : ""}</span>
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

          {/* FEFO lot viewer */}
          {outSel && outLots.length > 0 && (
            <div className="mv-lots-box">
              <div className="mv-lots-title">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                Lots disponibles — ordre FEFO (plus proche expiration en premier)
              </div>
              <table className="mv-lots-table">
                <thead><tr><th>Expiration</th><th>Stock lot</th><th>Sera prélevé</th></tr></thead>
                <tbody>
                  {outLots.map(lot => {
                    const preview = fefoPreview.find(p => p.id_lot === lot.id_lot);
                    const daysLeft = lot.days_left !== null ? Number(lot.days_left) : null;
                    const urgency = daysLeft === null ? "" : daysLeft < 0 ? "lot-expired" : daysLeft <= 3 ? "lot-soon" : "";
                    return (
                      <tr key={lot.id_lot} className={urgency}>
                        <td>
                          {lot.date_expiration
                            ? <><span>{lot.date_expiration.split("T")[0]}</span>
                                {daysLeft !== null && (
                                  <span className="mv-days-badge">
                                    {daysLeft < 0 ? `Expiré ${Math.abs(daysLeft)}j` : daysLeft === 0 ? "Aujourd'hui" : `${daysLeft}j`}
                                  </span>
                                )}</>
                            : <span className="mv-no-exp">Sans expiration</span>}
                        </td>
                        <td>{lot.quantite} pcs</td>
                        <td>{preview ? <strong className="mv-fefo-take">−{preview.take}</strong> : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {outError && <div className="mv-error">{outError}</div>}

          <button className="mv-btn mv-btn-out" onClick={submitSortie} disabled={outBusy || allExpired}>
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
              <th>Client</th><th>Fournisseur</th><th>Raison</th>
              <th>Créé par</th><th>Date</th><th></th>
            </tr></thead>
            <tbody>
              {mouvements.length === 0
                ? <tr><td colSpan="10" className="mv-empty">Aucun mouvement enregistré</td></tr>
                : mouvements.map(m => (
                  <tr key={m.id_mouvement}>
                    <td>{m.id_mouvement}</td>
                    <td>{m.nom_produit || m.id_produit}</td>
                    <td><span className={`mv-type ${m.type}`}>{m.type}</span></td>
                    <td>{m.quantite}</td>
                    <td>{m.nom_client || "—"}</td>
                    <td>{m.nom_fournisseur || "—"}</td>
                    <td>{m.raison || "—"}</td>
                    <td className="mv-created-by">
                      <span className="mv-cb-email">{m.created_by || "—"}</span>
                      {m.created_by_role && (
                        <span className={`mv-cb-role mv-cb-role-${m.created_by_role}`}>
                          {m.created_by_role}
                        </span>
                      )}
                    </td>
                    <td>{m.date ? new Date(m.date).toLocaleString("fr-DZ") : "—"}</td>
                    <td>
                      {m.type === "sortie" && (
                        <button className="mv-btn-print" onClick={() => printBonSortie(m)} title="Imprimer le bon de sortie">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                            <rect x="6" y="14" width="12" height="8"/>
                          </svg>
                          Bon
                        </button>
                      )}
                    </td>
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
