import React from "react";
import "./TopStores.css";

function TopStores({ topStores = [] }) {
  if (!topStores || topStores.length === 0) {
    return <p>No data available</p>;
  }

  return (
    <div className="top-stores">
      <h3>Top Produits</h3>
      <ul>
        {topStores.map((item, index) => (
          <li key={index} className="top-item">
            <span className="product-name">
              {item.name || `Produit ${index + 1}`}
            </span>

            <div className="progress-bar">
              <div
                className="progress"
                style={{
                  width: `${item.percent || 0}%`,
                  backgroundColor: "#7b2cbf",
                }}
              />
            </div>

            <span className="ventes">
              {item.ventes} ventes
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TopStores;