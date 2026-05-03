import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "./api";
import "./RapportStock.css";

function RapportStock() {
  const [data, setData] = useState([]);

  // 🔥 API data
  useEffect(() => {
    api
      .get("/api/rapport-stock")
      .then((res) => {
        setData(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        console.error("Erreur API:", err);
        setData([]);
      });
  }, []);

  // 🔥 FIX: تحويل القيم إلى Number
  const totalEntree = data.reduce(
    (a, b) => a + Number(b.entree || 0),
    0
  );

  const totalSortie = data.reduce(
    (a, b) => a + Number(b.sortie || 0),
    0
  );

  // ✔ FIX rupture (يشمل 0 و السلبي)
  const ruptures = data.filter(
    (d) => Number(d.stock || 0) <= 0
  ).length;

  // 🔥 PDF
  const exportPDF = () => {
    const doc = new jsPDF();

    doc.text("Rapport de Gestion de Stock", 14, 15);

    autoTable(doc, {
      startY: 25,
      head: [["Produit", "Entrées", "Sorties", "Stock"]],
      body: data.map((d) => [
        d.nom_produit,
        Number(d.entree || 0),
        Number(d.sortie || 0),
        Number(d.stock || 0),
      ]),
    });

    doc.save("rapport-stock.pdf");
  };

  return (
    <div className="rapport-stock">
      <h1>📊 Rapport Stock</h1>

      {/* 🔥 CARDS */}
      <div className="summary">
        <div className="card">
          <p>Produits</p>
          <strong>{data.length}</strong>
        </div>

        <div className="card">
          <p>Entrées</p>
          <strong>{totalEntree}</strong>
        </div>

        <div className="card">
          <p>Sorties</p>
          <strong>{totalSortie}</strong>
        </div>

        <div className="card danger">
          <p>Ruptures</p>
          <strong>{ruptures}</strong>
        </div>
      </div>

      {/* 🔥 TABLE */}
      <table>
        <thead>
          <tr>
            <th>Produit</th>
            <th>Entrées</th>
            <th>Sorties</th>
            <th>Stock</th>
          </tr>
        </thead>

        <tbody>
          {data.length > 0 ? (
            data.map((d, i) => (
              <tr key={i}>
                <td>{d.nom_produit}</td>
                <td>{Number(d.entree || 0)}</td>
                <td>{Number(d.sortie || 0)}</td>

                {/* ✔ FIX HERE فقط */}
                <td
                  className={
                    Number(d.stock || 0) <= 0 ? "rupture" : ""
                  }
                >
                  {Number(d.stock || 0)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4">Aucune donnée</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* 🔥 ACTIONS */}
      <div className="actions">
        <button onClick={exportPDF}>📄 Exporter PDF</button>
        <button onClick={() => window.print()}>🖨 Imprimer</button>
      </div>
    </div>
  );
}

export default RapportStock;