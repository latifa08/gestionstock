import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./StockAlert.css";

function StockAlert() {
  const [stockData, setStockData] = useState([]);
  const prevCount = useRef(0);

  useEffect(() => {
    const fetchStockAlert = async () => {
      try {
        const res = await axios.get("http://localhost:5000/stock-alert");
        setStockData(res.data);
      } catch (err) {
        console.error("Erreur serveur stock alert:", err);
      }
    };

    fetchStockAlert();

    // تحديث كل 10 ثواني
    const interval = setInterval(fetchStockAlert, 10000);
    return () => clearInterval(interval);
  }, []);

  const lowStock = stockData || [];

  useEffect(() => {
    if (lowStock.length > 0 && lowStock.length !== prevCount.current) {
      // تشغيل صوت التنبيه
      const audio = new Audio("/sounds/alert.mp3");
      audio.play().catch(err => console.log("Erreur audio:", err));

      // عرض التنبيه البصري
      alert("⚠️ Attention ! Certains produits sont en rupture de stock !");
    }
    prevCount.current = lowStock.length;
  }, [lowStock.length]);

  return (
    <div className="stock-alert-page">
      <h1>⚠️ Alertes de Stock</h1>

      {lowStock.length === 0 ? (
        <p className="success">✅ Tous les produits ont un stock suffisant.</p>
      ) : (
        <div className="warning">
          <p>Les produits suivants sont en rupture :</p>
          <ul>
            {lowStock.map((item) => (
              <li key={item.id || item.produit}>
                <span className="product-name">{item.produit}</span> - Stock: {item.stock}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default StockAlert;
