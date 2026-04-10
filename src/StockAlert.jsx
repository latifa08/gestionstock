import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./StockAlert.css";

function StockAlert() {
  // 📦 نخزنوا المنتجات اللي stock = 0
  const [stockData, setStockData] = useState([]);

  // 🔁 باش نعرفو إذا تبدل العدد ولا لا (باش ما نعاودوش alert كل مرة)
  const prevCount = useRef(0);

  // ==============================
  // 📡 جلب البيانات من الباك-إند
  // ==============================
  useEffect(() => {
    const fetchStockAlert = async () => {
      try {
        // 🔗 طلب للباك-إند (منتجات اللي كملو)
        const res = await axios.get("http://localhost:5000/stock-alert");

        setStockData(res.data);
      } catch (err) {
        console.error("Erreur serveur stock alert:", err);
      }
    };

    // 🚀 أول تحميل
    fetchStockAlert();

    // 🔁 تحديث كل 10 ثواني
    const interval = setInterval(fetchStockAlert, 10000);

    // 🧹 تنظيف interval
    return () => clearInterval(interval);
  }, []);

  // 📊 ضمان array
  const lowStock = stockData || [];

  // ==============================
  // 🔔 ALERT + SOUND CONTROL
  // ==============================
  useEffect(() => {
    // ⚠️ نخدمو alert غير إذا كاين تغيير في العدد
    if (lowStock.length > 0 && lowStock.length !== prevCount.current) {
      
      // 🔊 تشغيل الصوت
      const audio = new Audio("/sounds/alert.mp3");
      audio.play().catch((err) => console.log("Audio error:", err));

      // ⚠️ تنبيه popup
      alert("⚠️ Produit(s) en rupture de stock !");
    }

    // 🔁 تحديث القيمة القديمة
    prevCount.current = lowStock.length;
  }, [lowStock.length]);

  // ==============================
  // 🎨 UI
  // ==============================
  return (
    <div className="stock-alert-page">
      <h1>⚠️ Alertes de Stock</h1>

      {/* ✅ إذا ماكانش منتجات ناقصة */}
      {lowStock.length === 0 ? (
        <p className="success">
          ✅ Tous les produits sont disponibles
        </p>
      ) : (
        // ❌ إذا كاين منتجات كملت
        <div className="warning">
          <p>🔴 Produits en rupture :</p>

          <ul>
            {lowStock.map((item) => (
              <li key={item.id || item.produit}>
                {/* 📦 اسم المنتج */}
                <span className="product-name">
                  {item.produit}
                </span>

                {/* 📉 stock = 0 */}
                {" "} - Stock: {item.stock}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default StockAlert;