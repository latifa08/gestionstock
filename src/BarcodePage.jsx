import React, { useState, useRef, useEffect } from "react";
import api from "./api";
import "./BarcodePage.css";

export default function BarcodePage() {
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);

  const scannerRef = useRef(null);
  const manualRef = useRef(null);

  // 🔥 FIX: force focus always (scanner fix)
  useEffect(() => {
    const interval = setInterval(() => {
      scannerRef.current?.focus();
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // ================= TOTAL =================
  const calcTotal = (items) =>
    items.reduce(
      (acc, item) =>
        acc + Number(item.prix_unitaire || 0) * Number(item.quantity || 0),
      0
    );

  // ================= ADD PRODUCT =================
  const addProduct = async (code) => {
    if (!code) return;

    try {
      const res = await api.get(`/api/produits/${code.trim()}`);
      const result = res.data;

      if (!result.success) {
        alert(result.message || "Produit non trouvé !");
        return;
      }

      const product = result.data;

      setCart((prev) => {
        let updated = [...prev];

        const index = updated.findIndex(
          (i) => i.id_produit === product.id_produit
        );

        if (index !== -1) {
          if (updated[index].quantity + 1 > product.quantite) {
            alert("⚠️ Stock insuffisant !");
            return prev;
          }

          updated[index].quantity += 1;
        } else {
          updated.push({
            id_produit: product.id_produit,
            nom_produit: product.nom_produit,
            prix_unitaire: product.prix_unitaire,
            stock: product.quantite,
            quantity: 1,
          });
        }

        return updated;
      });

    } catch (err) {
      alert(err.response?.data?.message || "Produit non trouvé !");
    }
  };

  // ================= SCAN =================
  const handleScan = (e) => {
    const value = e.target.value;

    // 🔥 FIX: scanner works even without Enter
    if (value && value.length > 2) {
      addProduct(value.trim());
      e.target.value = "";
    }
  };

  // ================= MANUAL =================
  const handleManual = () => {
    const code = manualRef.current?.value;

    if (!code) return;

    addProduct(code.trim());
    manualRef.current.value = "";
  };

  // ================= REMOVE =================
  const removeItem = (id) => {
    setCart((prev) => prev.filter((i) => i.id_produit !== id));
  };

  // ================= ➕ ➖ =================
  const updateQty = (id, type) => {
    setCart((prev) => {
      let updated = prev.map((item) => {
        if (item.id_produit === id) {
          if (type === "plus") {
            if (item.quantity + 1 > item.stock) {
              alert("Stock insuffisant !");
              return item;
            }
            return { ...item, quantity: item.quantity + 1 };
          }

          if (type === "minus") {
            if (item.quantity <= 1) return item;
            return { ...item, quantity: item.quantity - 1 };
          }
        }
        return item;
      });

      updated = updated.filter((i) => i.quantity > 0);

      return updated;
    });
  };

  // ================= RESET =================
  const resetCart = () => {
    setCart([]);
    setTotal(0);
  };

  // ================= VALIDATE SALE =================
  const validateSale = async () => {
    if (cart.length === 0) {
      alert("Panier vide !");
      return;
    }

    try {
      const res = await api.post("/api/vente", { cart });
      const result = res.data;

      if (!result.success) {
        alert(result.message || "Erreur vente !");
        return;
      }

      alert("✔ Vente validée !");
      printTicket();
      resetCart();
    } catch (err) {
      alert("Erreur serveur");
    }
  };

  // ================= PRINT =================
  const printTicket = () => {
    const win = window.open("", "", "width=400,height=600");

    win.document.write(`
      <h2>🛒 SysStock</h2>
      <p>Date: ${new Date().toLocaleString()}</p>
      <hr/>
      ${cart
        .map(
          (i) =>
            `<p>${i.nom_produit} x ${i.quantity} = ${
              Number(i.prix_unitaire) * Number(i.quantity)
            } DA</p>`
        )
        .join("")}
      <hr/>
      <h3>Total: ${calcTotal(cart)} DA</h3>
    `);

    win.print();
    win.close();
  };

  // ================= UI =================
  return (
    <div className="barcode-container">
      <h1>🛒 SysStock - POS</h1>

      <div className="inputs-box">
        <div className="input-group">
          <label>Scanner</label>
          <input
            ref={scannerRef}
            type="text"
            onChange={handleScan}
            autoComplete="off"
          />
        </div>

        <div className="input-group">
          <label>Manuel</label>
          <div className="manual-add">
            <input ref={manualRef} />
            <button onClick={handleManual}>Ajouter</button>
          </div>
        </div>
      </div>

      <div className="cart-section">
        <table>
          <thead>
            <tr>
              <th>Produit</th>
              <th>Prix</th>
              <th>Qté</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {cart.map((item) => (
              <tr key={item.id_produit}>
                <td>{item.nom_produit}</td>
                <td>{item.prix_unitaire} DA</td>

                <td>
                  <button onClick={() => updateQty(item.id_produit, "minus")}>➖</button>
                  {item.quantity}
                  <button onClick={() => updateQty(item.id_produit, "plus")}>➕</button>
                </td>

                <td>
                  {Number(item.prix_unitaire) * Number(item.quantity)}
                </td>

                <td>
                  <button onClick={() => removeItem(item.id_produit)}>❌</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="total-box">
          Total: {calcTotal(cart)} DA
        </div>

        <div className="cart-buttons">
          <button className="reset-btn" onClick={resetCart}>
            🗑️ Vider
          </button>

          <button className="validate-btn" onClick={validateSale}>
            💰 Valider Vente
          </button>
        </div>
      </div>
    </div>
  );
}