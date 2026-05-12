import React, { useEffect, useRef, useState } from "react";
import api from "./api";
import "./StockAlert.css";

function StockAlert() {
  const [lowStock,  setLowStock]  = useState([]);
  const [expiring,  setExpiring]  = useState([]);
  const prevCount = useRef(0);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [low, exp] = await Promise.all([
          api.get("/stock-alert"),
          api.get("/stock-alert/expiring"),
        ]);
        setLowStock(low.data  || []);
        setExpiring(exp.data  || []);
      } catch (err) {
        console.error("Erreur stock alert:", err);
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (lowStock.length > 0 && lowStock.length !== prevCount.current) {
      const audio = new Audio("/sounds/alert.mp3");
      audio.play().catch(() => {});
      alert("⚠️ Produit(s) en rupture de stock !");
    }
    prevCount.current = lowStock.length;
  }, [lowStock.length]);

  return (
    <div className="sa-page">
      <h1 className="sa-main-title">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Alertes de Stock
      </h1>

      {/* ── SECTION 1 : Low / out-of-stock ── */}
      <div className="sa-section">
        <div className="sa-section-header sa-header-red">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Rupture de stock
          {lowStock.length > 0 && <span className="sa-count-badge">{lowStock.length}</span>}
        </div>

        {lowStock.length === 0 ? (
          <div className="sa-ok">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Tous les produits sont disponibles
          </div>
        ) : (
          <ul className="sa-list">
            {lowStock.map((item) => (
              <li key={item.id_produit || item.produit} className="sa-item sa-item-red">
                <div className="sa-item-icon sa-icon-red">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  </svg>
                </div>
                <div className="sa-item-info">
                  <span className="sa-item-name">{item.produit}</span>
                  <span className="sa-item-sub">Stock actuel : {item.stock} unité{item.stock !== 1 ? "s" : ""}</span>
                </div>
                <span className="sa-stock-chip sa-chip-red">{item.stock === 0 ? "Épuisé" : `${item.stock} restant${item.stock > 1 ? "s" : ""}`}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── SECTION 2 : Expiring within 3 days ── */}
      <div className="sa-section">
        <div className="sa-section-header sa-header-orange">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          Produits expirant dans 3 jours
          {expiring.length > 0 && <span className="sa-count-badge sa-badge-orange">{expiring.length}</span>}
        </div>

        {expiring.length === 0 ? (
          <div className="sa-ok">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Aucun produit n'expire dans les 3 prochains jours
          </div>
        ) : (
          <ul className="sa-list">
            {expiring.map((item) => {
              const daysLeft = Number(item.days_left);
              const isExpired = daysLeft < 0;
              return (
                <li key={item.id_produit} className={`sa-item ${isExpired ? "sa-item-red" : "sa-item-orange"}`}>
                  <div className={`sa-item-icon ${isExpired ? "sa-icon-red" : "sa-icon-orange"}`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <div className="sa-item-info">
                    <span className="sa-item-name">{item.nom_produit}</span>
                    <span className="sa-item-sub">
                      Expiration : {item.date_expiration?.split("T")[0]} · Stock : {item.quantite} unité{item.quantite !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <span className={`sa-stock-chip ${isExpired ? "sa-chip-red" : "sa-chip-orange"}`}>
                    {isExpired
                      ? `Expiré il y a ${Math.abs(daysLeft)}j`
                      : daysLeft === 0
                        ? "Expire aujourd'hui !"
                        : `${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""}`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default StockAlert;
