import React, { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./Facture.css";

function Facture() {
  const API = "http://localhost:5000";

  const [produits, setProduits] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [factures, setFactures] = useState([]);
  const [factureProduits, setFactureProduits] = useState([]);

  const [selectedFournisseur, setSelectedFournisseur] = useState("");
  const [selectedClient, setSelectedClient] = useState(""); // ✅ ZIADA
  const [dateFacture, setDateFacture] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [tab, setTab] = useState("create");
  const [selectedFacture, setSelectedFacture] = useState(null);

  const [loading, setLoading] = useState(false);

  // ================= LOAD =================
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [p, f, fac] = await Promise.all([
        axios.get(`${API}/products`),
        axios.get(`${API}/fournisseurs`),
        axios.get(`${API}/api/factures`)
      ]);

      setProduits(p.data || []);
      setFournisseurs(f.data || []);
      setFactures(fac.data || []);
    } catch (err) {
      console.log("LOAD ERROR:", err.message);
    }
  };

  // ================= UPDATE QTY =================
  const updateQty = (id, value) => {
    const qty = Number(value);

    setFactureProduits(prev => {
      const exists = prev.find(p => p.id_produit === id);

      if (exists) {
        return prev.map(p =>
          p.id_produit === id ? { ...p, quantite: qty } : p
        );
      } else {
        const prod = produits.find(p => p.id_produit === id);
        if (!prod) return prev;
        return [...prev, { ...prod, quantite: qty }];
      }
    });
  };

  // ================= TOTAL =================
  const total = factureProduits.reduce(
    (acc, p) =>
      acc + (Number(p.prix_unitaire || 0) * Number(p.quantite || 0)),
    0
  );

  // ================= SAVE =================
  const sendFacture = async () => {
    try {
      setLoading(true);

      const data = {
        fournisseur: selectedFournisseur,
        client: selectedClient, // ✅ ZIADA IMPORTANT
        date_facture: dateFacture,
        produits: factureProduits
          .filter(p => p.quantite > 0)
          .map(p => ({
            id_produit: p.id_produit,
            quantite: Number(p.quantite),
          })),
      };

      const res = await axios.post(`${API}/api/facture`, data);

      alert(res.data.message || "Facture créée");

      setFactureProduits([]);
      setSelectedFournisseur("");
      setSelectedClient(""); // ✅ reset
      await loadData();
      setTab("history");

    } catch (err) {
      console.log(err);
      alert(err.response?.data?.message || "Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  // ================= VIEW =================
  const viewFacture = async (id) => {
    try {
      const res = await axios.get(`${API}/api/facture/${id}`);
      setSelectedFacture(res.data || null);
      setTab("detail");
    } catch (err) {
      console.log(err);
      alert("Facture introuvable (404)");
    }
  };

  // ================= DELETE =================
  const deleteFacture = async (id) => {
    try {
      const confirmDelete = window.confirm("Supprimer cette facture ?");
      if (!confirmDelete) return;

      await axios.delete(`${API}/api/facture/${id}`);
      alert("Facture supprimée");
      loadData();
    } catch (err) {
      console.log(err);
      alert("Erreur suppression");
    }
  };

  // ================= PDF =================
  const exportPDF = () => {
    if (!selectedFacture) return;

    const doc = new jsPDF();

    doc.text("FACTURE", 14, 15);
    doc.text(`Fournisseur: ${selectedFacture.fournisseur || ""}`, 14, 25);
    doc.text(`Client: ${selectedFacture.client || ""}`, 14, 32); // ✅ ZIADA
    doc.text(`Date: ${selectedFacture.date_facture || ""}`, 14, 39);

    autoTable(doc, {
      startY: 50,
      head: [["Produit", "Prix", "Qté", "Total"]],
      body: (selectedFacture.details || []).map(d => [
        d.nom_produit,
        d.prix,
        d.quantite,
        d.prix * d.quantite,
      ]),
    });

    doc.save("facture.pdf");
  };

  // ================= UI =================
  return (
    <div className="facture-container">

      <h1 className="title">🧾 Facture System</h1>

      <div className="tabs">
        <button onClick={() => setTab("create")}>➕ Create</button>
        <button onClick={() => setTab("history")}>📋 History</button>
        <button onClick={() => setTab("detail")}>👁️ Detail</button>
      </div>

      {/* CREATE */}
      {tab === "create" && (
        <div className="card">

          {/* CLIENT INPUT ✅ */}
          <input
            type="text"
            placeholder="Client"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
          />

          <select
            value={selectedFournisseur}
            onChange={(e) => setSelectedFournisseur(e.target.value)}
          >
            <option value="">Choisir fournisseur</option>
            {fournisseurs.map((f, i) => (
              <option key={i} value={f.nom}>{f.nom}</option>
            ))}
          </select>

          <input
            type="date"
            value={dateFacture}
            onChange={(e) => setDateFacture(e.target.value)}
          />

          <table>
            <thead>
              <tr>
                <th>Produit</th>
                <th>Prix</th>
                <th>Qté</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              {produits.map(p => {
                const sel = factureProduits.find(x => x.id_produit === p.id_produit);

                return (
                  <tr key={p.id_produit}>
                    <td>{p.nom_produit}</td>
                    <td>{p.prix_unitaire} DA</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={sel?.quantite || 0}
                        onChange={(e) => updateQty(p.id_produit, e.target.value)}
                      />
                    </td>
                    <td>
                      {(p.prix_unitaire * (sel?.quantite || 0)).toFixed(2)} DA
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <h2 className="total">Total: {total.toFixed(2)} DA</h2>

          <button className="btn" onClick={sendFacture} disabled={loading}>
            {loading ? "Saving..." : "💾 Save Facture"}
          </button>
        </div>
      )}

      {/* HISTORY */}
      {tab === "history" && (
        <div className="card">
          <h2>History</h2>

          <table>
            <thead>
              <tr>
                <th>Num</th>
                <th>Fournisseur</th>
                <th>Client</th> {/* ✅ ZIADA */}
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {factures.map(f => (
                <tr key={f.id_facture}>
                  <td>{f.numero}</td>
                  <td>{f.fournisseur}</td>
                  <td>{f.client}</td> {/* ✅ ZIADA */}
                  <td>{f.date_facture}</td>

                  <td style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                    <button onClick={() => viewFacture(f.id_facture)}>
                      👁️ View
                    </button>

                    <button
                      onClick={() => deleteFacture(f.id_facture)}
                      style={{ background: "#e63946", color: "white" }}
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DETAIL */}
      {tab === "detail" && selectedFacture && (
        <div className="card">

          <h2>Facture Detail</h2>

          <p><b>Fournisseur:</b> {selectedFacture.fournisseur}</p>
          <p><b>Client:</b> {selectedFacture.client}</p> {/* ✅ ZIADA */}
          <p><b>Date:</b> {selectedFacture.date_facture}</p>

          <table>
            <thead>
              <tr>
                <th>Produit</th>
                <th>Prix</th>
                <th>Qté</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              {(selectedFacture.details || []).map((d, i) => (
                <tr key={i}>
                  <td>{d.nom_produit}</td>
                  <td>{d.prix}</td>
                  <td>{d.quantite}</td>
                  <td>{d.prix * d.quantite}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <button className="btn" onClick={exportPDF}>
            📄 Export PDF
          </button>
        </div>
      )}

    </div>
  );
}

export default Facture;