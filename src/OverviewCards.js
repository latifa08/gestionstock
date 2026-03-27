import React from "react";

function OverviewCards({ overview }) {
  // حماية من null أو undefined
  const data = overview || {};

  const {
    totalProducts = 0,
    totalClients = 0,
    totalFournisseurs = 0,
    outOfStock = 0,
  } = data;

  return (
    <div className="overview">
      <div className="card green">
        <div className="icon">📦</div>
        <div>
          <p>Total Products</p>
          <h3>{totalProducts}</h3>
        </div>
      </div>

      <div className="card blue">
        <div className="icon">🧾</div>
        <div>
          <p>Total Clients</p>
          <h3>{totalClients}</h3>
        </div>
      </div>

      <div className="card teal">
        <div className="icon">📊</div>
        <div>
          <p>Total Fournisseurs</p>
          <h3>{totalFournisseurs}</h3>
        </div>
      </div>

      <div className="card orange">
        <div className="icon">⚠️</div>
        <div>
          <p>Out of Stock</p>
          <h3>{outOfStock}</h3>
        </div>
      </div>
    </div>
  );
}

export default OverviewCards;