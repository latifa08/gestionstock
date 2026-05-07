import React, { useState, useRef, useEffect } from "react";
import api from "./api";
import "./BarcodePage.css";

const BACKEND      = "http://localhost:5000";
const PROFORMA_ID  = `BON-${Date.now()}`;
const todayISO     = () => new Date().toISOString().split("T")[0];
const todayLong    = () => new Date().toLocaleDateString("fr-DZ", { year: "numeric", month: "long", day: "numeric" });

function ProductAvatar({ imageUrl, name, size = 40 }) {
  if (imageUrl) {
    return (
      <img
        src={`${BACKEND}${imageUrl}`}
        alt={name}
        className="p-img"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div className="p-avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {(name || "?")[0].toUpperCase()}
    </div>
  );
}

export default function BarcodePage() {
  /* scan state */
  const [lastProduct, setLastProduct] = useState(null);
  const [scanStatus,  setScanStatus]  = useState(null);
  const [loading,     setLoading]     = useState(false);

  /* cart state */
  const [cart,      setCart]      = useState([]);
  const [raison,    setRaison]    = useState("");
  const [date,      setDate]      = useState(todayISO());

  /* proforma state */
  const [showProforma, setShowProforma] = useState(false);
  const [confirmed,    setConfirmed]    = useState(false);
  const [confirming,   setConfirming]   = useState(false);
  const [proformaErr,  setProformaErr]  = useState(null);

  const scannerRef  = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => { scannerRef.current?.focus(); }, []);

  const total      = cart.reduce((s, i) => s + i.qty * i.prix_unitaire, 0);
  const totalItems = cart.reduce((s, i) => s + i.qty, 0);

  /* ── scan ──────────────────────────────────── */
  const scanProduct = async (code) => {
    const trimmed = (code || "").trim();
    if (!trimmed) return;
    setLoading(true);
    setScanStatus(null);

    try {
      const res = await api.get(`/products/code/${encodeURIComponent(trimmed)}`);
      if (!res.data.success) {
        setScanStatus({ type: "error", message: `Produit introuvable — ${trimmed}` });
        setLastProduct(null);
        return;
      }

      const p = res.data.data;
      const normalized = {
        id_produit:    p.id_produit,
        nom_produit:   p.nom_produit,
        code_bar:      p.code_bar,
        categorie:     p.categorie,
        prix_unitaire: Number(p.prix_unitaire),
        quantite:      Number(p.quantite),
        niveau_alerte: Number(p.niveau_alerte),
        image_url:     p.image_url || null,
      };

      setLastProduct(normalized);

      if (normalized.quantite < 1) {
        setScanStatus({ type: "error", message: `Stock épuisé — ${normalized.nom_produit}` });
        return;
      }

      setCart((prev) => {
        const idx = prev.findIndex((i) => i.id_produit === normalized.id_produit);
        if (idx !== -1) {
          const newQty = prev[idx].qty + 1;
          if (newQty > normalized.quantite) {
            setScanStatus({ type: "error", message: `Stock insuffisant — ${normalized.nom_produit} (${normalized.quantite} dispo)` });
            return prev;
          }
          const updated = [...prev];
          updated[idx] = { ...updated[idx], qty: newQty };
          setScanStatus({ type: "info", message: `Quantité mise à jour — ${normalized.nom_produit} ×${newQty}` });
          return updated;
        }
        setScanStatus({ type: "success", message: `Ajouté au bon — ${normalized.nom_produit}` });
        return [...prev, { ...normalized, stock: normalized.quantite, qty: 1 }];
      });
    } catch {
      setScanStatus({ type: "error", message: "Erreur de connexion au serveur" });
    } finally {
      setLoading(false);
    }
  };

  const handleScannerChange = (e) => {
    const v = e.target.value.trim();
    if (!v) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      scanProduct(v);
      if (scannerRef.current) scannerRef.current.value = "";
    }, 150);
  };

  const handleScannerKeyDown = (e) => {
    if (e.key !== "Enter") return;
    clearTimeout(debounceRef.current);
    const v = e.target.value.trim();
    if (v) { scanProduct(v); e.target.value = ""; }
  };

  const handleManualKeyDown = (e) => {
    if (e.key !== "Enter") return;
    const v = e.target.value.trim();
    if (v) { scanProduct(v); e.target.value = ""; }
  };

  const handleClearScan = () => {
    setLastProduct(null);
    setScanStatus(null);
    if (scannerRef.current) scannerRef.current.value = "";
    scannerRef.current?.focus();
  };

  /* ── cart ops ──────────────────────────────── */
  const updateQty = (id, delta) =>
    setCart((prev) => prev.map((item) => {
      if (item.id_produit !== id) return item;
      const next = item.qty + delta;
      return (next >= 1 && next <= item.stock) ? { ...item, qty: next } : item;
    }));

  const setQtyDirect = (id, val) => {
    const n = Number(val);
    setCart((prev) => prev.map((item) => {
      if (item.id_produit !== id) return item;
      return (n >= 1 && n <= item.stock) ? { ...item, qty: n } : item;
    }));
  };

  const removeItem = (id) => setCart((prev) => prev.filter((i) => i.id_produit !== id));

  const resetSession = () => {
    setCart([]); setRaison(""); setDate(todayISO());
    setLastProduct(null); setScanStatus(null);
    setConfirmed(false); setShowProforma(false); setProformaErr(null);
    setTimeout(() => scannerRef.current?.focus(), 50);
  };

  /* ── confirm all ───────────────────────────── */
  const handleConfirmAll = async () => {
    setConfirming(true);
    setProformaErr(null);
    try {
      for (const item of cart) {
        await api.post("/mouvements", {
          id_produit: item.id_produit,
          type:       "sortie",
          quantite:   item.qty,
          raison:     raison || null,
          date:       date || null,
        });
      }
      setConfirmed(true);
    } catch (err) {
      setProformaErr(err.response?.data?.message || err.message);
    } finally {
      setConfirming(false);
    }
  };

  /* ── PDF print — opens a dedicated print window ── */
  const handlePrint = () => {
    const rows = cart.map((item, i) => `
      <tr style="background:${i % 2 === 0 ? '#faf8ff' : '#fff'};">
        <td style="text-align:center;color:#7c6fa0;font-weight:600;">${i + 1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            ${item.image_url
              ? `<img src="${BACKEND}${item.image_url}" style="width:32px;height:32px;border-radius:4px;object-fit:cover;border:1px solid #ede9fe;" />`
              : `<div style="width:32px;height:32px;border-radius:4px;background:#ede9fe;display:flex;align-items:center;justify-content:center;font-weight:700;color:#5b2da3;font-size:13px;">${(item.nom_produit || '?')[0].toUpperCase()}</div>`
            }
            <strong style="font-size:10pt;">${item.nom_produit}</strong>
          </div>
        </td>
        <td style="font-family:monospace;font-size:8.5pt;color:#7c6fa0;">${item.code_bar}</td>
        <td style="text-align:center;font-weight:700;">${item.qty}</td>
        <td style="text-align:right;color:#4b3f72;">${item.prix_unitaire.toFixed(2)}</td>
        <td style="text-align:right;font-weight:700;color:#5b2da3;">${(item.qty * item.prix_unitaire).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8"/>
  <title>Bon de Sortie ${PROFORMA_ID}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    *  { box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    body { margin:0; font-family:"Segoe UI",Arial,sans-serif; font-size:11pt; color:#1e1b2e; background:#fff; }
    .hdr  { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4mm; }
    .co-name { font-size:20pt; font-weight:800; color:#5b2da3; line-height:1; }
    .co-sub  { font-size:9pt; color:#888; margin-top:3px; }
    .doc-r   { text-align:right; }
    .badge   { display:inline-block; background:#5b2da3; color:#fff; padding:5px 14px; border-radius:5px; font-size:12pt; font-weight:800; letter-spacing:1.5px; }
    .ref     { font-size:10pt; font-weight:700; margin-top:4px; }
    .doc-date{ font-size:9pt; color:#888; margin-top:2px; }
    .divider { border:none; border-top:2.5px solid #5b2da3; margin:4mm 0 5mm; }
    .meta    { display:flex; gap:14mm; flex-wrap:wrap; padding:4mm 5mm; background:#f5f3ff; border-radius:5px; margin-bottom:6mm; }
    .m-item  { display:flex; flex-direction:column; gap:2px; }
    .m-lbl   { font-size:7.5pt; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:#9589b8; }
    .m-val   { font-size:10pt; font-weight:600; }
    table    { width:100%; border-collapse:collapse; margin-bottom:5mm; font-size:10pt; }
    thead tr { background:#5b2da3; }
    th       { color:#fff; padding:7px 10px; text-align:left; font-size:8.5pt; font-weight:700; text-transform:uppercase; letter-spacing:.4px; }
    td       { padding:7px 10px; border-bottom:1px solid #ede9fe; vertical-align:middle; }
    .totals  { margin-left:auto; width:220px; margin-bottom:9mm; }
    .t-sub   { display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid #ede9fe; font-size:9.5pt; color:#555; }
    .t-grand { display:flex; justify-content:space-between; align-items:center; padding:8px 12px; margin-top:4px; background:#5b2da3; color:#fff; border-radius:6px; font-size:13pt; font-weight:800; }
    .sigs    { display:flex; gap:8mm; margin:10mm 0 8mm; }
    .sig     { flex:1; text-align:center; }
    .sig-lbl { font-size:8.5pt; font-weight:700; text-transform:uppercase; color:#5b2da3; display:block; margin-bottom:14mm; }
    .sig-line{ border-top:1px solid #333; margin-bottom:3px; }
    .sig-hint{ font-size:7.5pt; color:#aaa; }
    .footer  { text-align:center; font-size:8pt; color:#aaa; border-top:1px solid #eee; padding-top:3mm; margin-top:2mm; }
  </style>
</head><body>
  <div class="hdr">
    <div>
      <div class="co-name">GESTION DE STOCK</div>
      <div class="co-sub">Système de gestion d'inventaire · Algérie</div>
    </div>
    <div class="doc-r">
      <div class="badge">BON DE SORTIE</div>
      <div class="ref">N° ${PROFORMA_ID}</div>
      <div class="doc-date">Date : ${todayLong()}</div>
    </div>
  </div>
  <div class="divider"></div>
  <div class="meta">
    <div class="m-item"><span class="m-lbl">Date d'émission</span><span class="m-val">${todayLong()}</span></div>
    <div class="m-item"><span class="m-lbl">Référence</span><span class="m-val">${PROFORMA_ID}</span></div>
    ${raison ? `<div class="m-item"><span class="m-lbl">Motif de sortie</span><span class="m-val">${raison}</span></div>` : ''}
    <div class="m-item"><span class="m-lbl">Statut</span><span class="m-val">${confirmed ? '✔ Confirmé' : 'En attente'}</span></div>
  </div>
  <table>
    <thead><tr>
      <th style="width:28px;text-align:center;">#</th>
      <th>Désignation du produit</th>
      <th>Code-barre</th>
      <th style="width:40px;text-align:center;">Qté</th>
      <th style="text-align:right;">Prix unit. (DA)</th>
      <th style="text-align:right;">Total (DA)</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div class="t-sub"><span>Nombre d'articles</span><span>${totalItems} unité${totalItems > 1 ? 's' : ''}</span></div>
    <div class="t-grand"><span>TOTAL GÉNÉRAL</span><span>${total.toFixed(2)} DA</span></div>
  </div>
  <div class="sigs">
    <div class="sig"><span class="sig-lbl">Préparé par</span><div class="sig-line"></div><div class="sig-hint">Nom &amp; Signature</div></div>
    <div class="sig"><span class="sig-lbl">Validé par</span><div class="sig-line"></div><div class="sig-hint">Nom &amp; Signature</div></div>
    <div class="sig"><span class="sig-lbl">Réceptionné par</span><div class="sig-line"></div><div class="sig-hint">Nom &amp; Signature</div></div>
  </div>
  <div class="footer">Document généré le ${todayLong()} · Système de Gestion de Stock${confirmed ? ' · BON CONFIRMÉ ET ENREGISTRÉ' : ''}</div>
</body></html>`;

    const w = window.open('', '_blank', 'width=900,height=750');
    if (!w) { alert('Veuillez autoriser les popups pour imprimer.'); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.addEventListener('load', () => w.print());
  };

  /* ── render ────────────────────────────────── */
  return (
    <div className="so-page">


      {/* ══ Screen UI ══ */}
      <div className="no-print">

        {/* heading */}
        <div className="so-heading">
          <h1 className="so-title">Stock Out</h1>
          <p className="so-subtitle">Scannez et constituez votre bon de sortie</p>
        </div>

        {/* top grid: scan + product info */}
        <div className="so-top-grid">

          {/* scan card */}
          <div className="so-card">
            <div className="so-card-title">Scan Produit</div>

            <label className="so-label">Scanner USB / Code-barre</label>
            <div className="so-barcode-wrap">
              <svg className="so-barcode-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="3" height="18"/><rect x="8" y="3" width="1.5" height="18"/>
                <rect x="11.5" y="3" width="3" height="18"/><rect x="17" y="3" width="1.5" height="18"/>
                <rect x="20" y="3" width="1" height="18"/>
              </svg>
              <input
                ref={scannerRef}
                type="text"
                className="so-input barcode-input"
                placeholder="Scan ou saisir le code-barre..."
                onChange={handleScannerChange}
                onKeyDown={handleScannerKeyDown}
                autoComplete="off"
              />
            </div>

            <div className="so-scan-row-btns">
              <div className="so-manual-group">
                <input
                  type="text"
                  className="so-input"
                  placeholder="Saisie manuelle + Entrée"
                  onKeyDown={handleManualKeyDown}
                  autoComplete="off"
                />
              </div>
              <button className="so-btn-ghost" onClick={handleClearScan}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Effacer
              </button>
            </div>

            {scanStatus && (
              <div className={`so-status ${scanStatus.type}`}>
                <span className="so-status-dot" />
                {scanStatus.message}
              </div>
            )}

            {loading && <div className="so-loading">Recherche en cours...</div>}
          </div>

          {/* product info card */}
          <div className="so-card so-pinfo-card">
            <div className="so-card-title">Informations Produit</div>
            {lastProduct ? (
              <div className="so-pinfo">
                <div className="so-pinfo-img-col">
                  <ProductAvatar imageUrl={lastProduct.image_url} name={lastProduct.nom_produit} size={96} />
                </div>
                <div className="so-pinfo-rows">
                  <div className="so-pinfo-row">
                    <span className="so-pinfo-lbl">Nom produit</span>
                    <span className="so-pinfo-val">{lastProduct.nom_produit}</span>
                  </div>
                  <div className="so-pinfo-row">
                    <span className="so-pinfo-lbl">Code-barre</span>
                    <span className="so-pinfo-val mono">{lastProduct.code_bar}</span>
                  </div>
                  <div className="so-pinfo-row">
                    <span className="so-pinfo-lbl">Catégorie</span>
                    <span className="so-pinfo-val">{lastProduct.categorie || "—"}</span>
                  </div>
                  <div className="so-pinfo-row">
                    <span className="so-pinfo-lbl">Stock actuel</span>
                    <span className={`so-stock-chip ${lastProduct.quantite <= lastProduct.niveau_alerte ? "low" : "ok"}`}>
                      {lastProduct.quantite} pcs
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="so-pinfo-empty">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="1.3">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="M7 4v16M12 4v16M17 4v16M2 9h20M2 14h20"/>
                </svg>
                <p>Scannez un produit pour afficher ses informations</p>
              </div>
            )}
          </div>
        </div>

        {/* cart */}
        {cart.length > 0 && (
          <div className="so-card so-cart-card">
            <div className="so-cart-head">
              <span className="so-card-title" style={{ margin: 0, borderBottom: "none", paddingBottom: 0 }}>
                Articles du bon
              </span>
              <div className="so-cart-badges">
                <span className="so-badge">{totalItems} unité{totalItems > 1 ? "s" : ""}</span>
                <span className="so-badge accent">{total.toFixed(2)} DA</span>
              </div>
            </div>

            <div className="so-table-wrap">
              <table className="so-cart-table">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Disponible</th>
                    <th>Quantité</th>
                    <th>Prix unit.</th>
                    <th>Total ligne</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.id_produit} className={item.stock <= item.niveau_alerte ? "row-low" : ""}>
                      <td>
                        <div className="so-product-cell">
                          <ProductAvatar imageUrl={item.image_url} name={item.nom_produit} size={32} />
                          <div>
                            <div className="so-product-name">{item.nom_produit}</div>
                            <div className="so-product-code">{item.code_bar}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`so-stock-chip ${item.stock <= item.niveau_alerte ? "low" : "ok"}`}>
                          {item.stock}
                        </span>
                      </td>
                      <td>
                        <div className="so-qty-ctrl">
                          <button className="so-qty-btn" onClick={() => updateQty(item.id_produit, -1)}>−</button>
                          <input
                            type="number"
                            className="so-qty-input"
                            value={item.qty}
                            min={1}
                            max={item.stock}
                            onChange={(e) => setQtyDirect(item.id_produit, e.target.value)}
                          />
                          <button className="so-qty-btn" onClick={() => updateQty(item.id_produit, 1)}>+</button>
                        </div>
                      </td>
                      <td className="so-price">{item.prix_unitaire.toFixed(2)} DA</td>
                      <td className="so-line-total">{(item.qty * item.prix_unitaire).toFixed(2)} DA</td>
                      <td>
                        <button className="so-remove-btn" onClick={() => removeItem(item.id_produit)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* footer */}
            <div className="so-cart-footer">
              <div className="so-footer-fields">
                <div className="so-field">
                  <label className="so-label">Motif de sortie</label>
                  <input
                    type="text"
                    className="so-input"
                    placeholder="Livraison, transfert, casse..."
                    value={raison}
                    onChange={(e) => setRaison(e.target.value)}
                  />
                </div>
                <div className="so-field so-field-sm">
                  <label className="so-label">Date</label>
                  <input
                    type="date"
                    className="so-input"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="so-footer-right">
                <div className="so-total-block">
                  <span className="so-total-label">Total proforma</span>
                  <span className="so-total-value">{total.toFixed(2)} DA</span>
                </div>
                <div className="so-footer-btns">
                  <button className="so-btn-ghost" onClick={resetSession}>Vider</button>
                  <button className="so-btn-finalize" onClick={() => setShowProforma(true)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    Proforma & Finaliser
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {cart.length === 0 && !loading && (
          <div className="so-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="1.3">
              <rect x="3" y="3" width="4" height="18"/><rect x="9" y="3" width="2" height="18"/>
              <rect x="13" y="3" width="4" height="18"/><rect x="19" y="3" width="2" height="18"/>
            </svg>
            <p>Scannez des produits pour constituer votre bon de sortie</p>
          </div>
        )}
      </div>

      {/* ══ Proforma modal ══ */}
      {showProforma && (
        <div
          className="so-overlay no-print"
          onClick={(e) => { if (e.target === e.currentTarget && !confirmed) setShowProforma(false); }}
        >
          <div className="so-proforma-modal">

            {/* modal header */}
            <div className="pf-modal-head">
              <div className="pf-modal-head-left">
                <div className="pf-logo">SO</div>
                <div>
                  <h2 className="pf-modal-title">Bon de Sortie de Stock</h2>
                  <div className="pf-modal-meta">
                    <span>Réf : <strong>{PROFORMA_ID}</strong></span>
                    <span className="pf-dot">·</span>
                    <span>{todayLong()}</span>
                  </div>
                </div>
              </div>
              {!confirmed && (
                <button className="pf-close-btn" onClick={() => setShowProforma(false)}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>

            {raison && (
              <div className="pf-motif">
                <span className="pf-motif-lbl">Motif</span>
                <span>{raison}</span>
              </div>
            )}

            {/* product lines */}
            <div className="pf-lines-head">
              <span style={{ flex: "0 0 28px" }}>#</span>
              <span style={{ flex: 1 }}>Produit</span>
              <span style={{ flex: "0 0 56px", textAlign: "center" }}>Qté</span>
              <span style={{ flex: "0 0 106px", textAlign: "right" }}>Prix unit.</span>
              <span style={{ flex: "0 0 116px", textAlign: "right" }}>Total</span>
            </div>

            <div className="pf-lines">
              {cart.map((item, i) => (
                <div key={item.id_produit} className="pf-line">
                  <span className="pf-line-num">{i + 1}</span>
                  <div className="pf-line-product">
                    <ProductAvatar imageUrl={item.image_url} name={item.nom_produit} size={42} />
                    <div>
                      <div className="pf-line-name">{item.nom_produit}</div>
                      <div className="pf-line-code">{item.code_bar}</div>
                    </div>
                  </div>
                  <span className="pf-line-qty">{item.qty}</span>
                  <span className="pf-line-price">{item.prix_unitaire.toFixed(2)} DA</span>
                  <span className="pf-line-total">{(item.qty * item.prix_unitaire).toFixed(2)} DA</span>
                </div>
              ))}
            </div>

            {/* grand total */}
            <div className="pf-grand-total">
              <span className="pf-grand-lbl">Total général — {totalItems} unité{totalItems > 1 ? "s" : ""}</span>
              <span className="pf-grand-val">{total.toFixed(2)} DA</span>
            </div>

            {/* error */}
            {proformaErr && (
              <div className="pf-error">{proformaErr}</div>
            )}

            {/* confirmed */}
            {confirmed && (
              <div className="pf-confirmed">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                Toutes les sorties ont été enregistrées avec succès
              </div>
            )}

            {/* actions */}
            <div className="pf-actions">
              {!confirmed ? (
                <>
                  <button className="so-btn-ghost" onClick={() => setShowProforma(false)}>Retour</button>
                  <button className="so-btn-print" onClick={handlePrint}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 6 2 18 2 18 9"/>
                      <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                      <rect x="6" y="14" width="12" height="8"/>
                    </svg>
                    Imprimer PDF
                  </button>
                  <button className="so-btn-confirm" onClick={handleConfirmAll} disabled={confirming}>
                    {confirming ? (
                      <><span className="so-spinner" /> Enregistrement...</>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Confirmer les sorties
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button className="so-btn-print" onClick={handlePrint}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 6 2 18 2 18 9"/>
                      <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                      <rect x="6" y="14" width="12" height="8"/>
                    </svg>
                    Imprimer PDF
                  </button>
                  <button className="so-btn-finalize" onClick={resetSession}>Nouvelle session</button>
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
